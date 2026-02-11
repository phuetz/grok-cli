import { UnifiedVfsRouter } from '../services/vfs/unified-vfs-router.js';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { ToolResult, getErrorMessage } from '../types/index.js';

export interface ScreenshotOptions {
  fullscreen?: boolean;
  region?: { x: number; y: number; width: number; height: number };
  window?: string; // Window title or ID
  delay?: number; // Delay in seconds
  format?: 'png' | 'jpg';
  quality?: number; // 1-100 for jpg
  outputPath?: string;
}

export interface ScreenshotResult {
  path: string;
  width?: number;
  height?: number;
  size: string;
  timestamp: string;
}

/**
 * Screenshot Tool for capturing screen, windows, and regions
 * Works on Linux (with scrot/gnome-screenshot), macOS (screencapture), and Windows (PowerShell)
 */
export class ScreenshotTool {
  private readonly defaultOutputDir = path.join(process.cwd(), '.codebuddy', 'screenshots');
  private vfs = UnifiedVfsRouter.Instance;

  /**
   * Capture a screenshot
   */
  async capture(options: ScreenshotOptions = {}): Promise<ToolResult> {
    try {
      // Ensure output directory exists
      await this.vfs.ensureDir(this.defaultOutputDir);

      const format = options.format || 'png';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot_${timestamp}.${format}`;
      const outputPath = options.outputPath || path.join(this.defaultOutputDir, filename);

      const platform = process.platform;

      let result: ScreenshotResult;

      if (platform === 'darwin') {
        result = await this.captureMacOS(outputPath, options);
      } else if (platform === 'linux') {
        // On WSL2, scrot captures a black X11 root window.
        // Try scrot first; if the result is a tiny/black image, fall back to
        // PowerShell via WSL interop for a real Windows desktop capture.
        if (this.isWSL()) {
          result = await this.captureWSL(outputPath, options);
        } else {
          result = await this.captureLinux(outputPath, options);
        }
      } else if (platform === 'win32') {
        result = await this.captureWindows(outputPath, options);
      } else {
        return {
          success: false,
          error: `Unsupported platform: ${platform}`
        };
      }

      return {
        success: true,
        output: this.formatResult(result),
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Screenshot capture failed: ${getErrorMessage(error)}`
      };
    }
  }

  /**
   * Capture screenshot on macOS using screencapture
   */
  private async captureMacOS(outputPath: string, options: ScreenshotOptions): Promise<ScreenshotResult> {
    return new Promise((resolve, reject) => {
      const args: string[] = [];

      if (options.delay) {
        args.push('-T', options.delay.toString());
      }

      if (options.region) {
        args.push('-R', `${options.region.x},${options.region.y},${options.region.width},${options.region.height}`);
      } else if (options.window) {
        args.push('-l', options.window);
      } else if (!options.fullscreen) {
        // Interactive selection mode
        args.push('-i');
      }

      if (options.format === 'jpg') {
        args.push('-t', 'jpg');
      }

      args.push(outputPath);

      const screencapture = spawn('screencapture', args);

      screencapture.on('close', async (code) => {
        if (code === 0 && await this.vfs.exists(outputPath)) {
          const stats = await this.vfs.stat(outputPath);
          resolve({
            path: outputPath,
            size: this.formatSize(stats.size),
            timestamp: new Date().toISOString()
          });
        } else {
          reject(new Error(`screencapture failed with code ${code}`));
        }
      });

      screencapture.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Capture screenshot on Linux using scrot or gnome-screenshot
   */
  private async captureLinux(outputPath: string, options: ScreenshotOptions): Promise<ScreenshotResult> {
    // Try scrot first, then gnome-screenshot, then import (ImageMagick)
    const tools = ['scrot', 'gnome-screenshot', 'import'];
    let availableTool: string | null = null;

    for (const tool of tools) {
      try {
        execSync(`which ${tool}`, { stdio: 'ignore' });
        availableTool = tool;
        break;
      } catch {
        continue;
      }
    }

    if (!availableTool) {
      throw new Error('No screenshot tool found. Install scrot, gnome-screenshot, or imagemagick.');
    }

    return new Promise((resolve, reject) => {
      let args: string[] = [];

      if (availableTool === 'scrot') {
        if (options.delay) {
          args.push('-d', options.delay.toString());
        }
        if (options.region) {
          args.push('-a', `${options.region.x},${options.region.y},${options.region.width},${options.region.height}`);
        } else if (options.window) {
          args.push('-u'); // Focused window
        }
        if (options.quality && options.format === 'jpg') {
          args.push('-q', options.quality.toString());
        }
        args.push(outputPath);
      } else if (availableTool === 'gnome-screenshot') {
        if (options.delay) {
          args.push('-d', options.delay.toString());
        }
        if (options.window) {
          args.push('-w'); // Active window
        } else if (options.region) {
          args.push('-a'); // Area selection
        }
        args.push('-f', outputPath);
      } else if (availableTool === 'import') {
        // ImageMagick import
        if (options.window) {
          args.push('-window', 'root');
        }
        args.push(outputPath);
      }

      const screenshot = spawn(availableTool, args);

      screenshot.on('close', async (code) => {
        if (code === 0 && await this.vfs.exists(outputPath)) {
          const stats = await this.vfs.stat(outputPath);
          resolve({
            path: outputPath,
            size: this.formatSize(stats.size),
            timestamp: new Date().toISOString()
          });
        } else {
          reject(new Error(`${availableTool} failed with code ${code}`));
        }
      });

      screenshot.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Capture screenshot on Windows using PowerShell
   */
  private async captureWindows(outputPath: string, _options: ScreenshotOptions): Promise<ScreenshotResult> {
    return new Promise((resolve, reject) => {
      const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $screen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save('${outputPath.replace(/\\/g, '\\\\')}')
$graphics.Dispose()
$bitmap.Dispose()
      `;

      const powershell = spawn('powershell', ['-Command', script]);

      powershell.on('close', async (code) => {
        if (code === 0 && await this.vfs.exists(outputPath)) {
          const stats = await this.vfs.stat(outputPath);
          resolve({
            path: outputPath,
            size: this.formatSize(stats.size),
            timestamp: new Date().toISOString()
          });
        } else {
          reject(new Error(`PowerShell screenshot failed with code ${code}`));
        }
      });

      powershell.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Detect if running inside WSL2
   */
  private isWSL(): boolean {
    try {
      const release = execSync('uname -r', { encoding: 'utf-8' });
      return /microsoft|wsl/i.test(release);
    } catch {
      return false;
    }
  }

  /**
   * Capture screenshot on WSL2 via PowerShell interop (real Windows desktop)
   * Falls back to scrot if powershell.exe is not available.
   */
  private async captureWSL(outputPath: string, options: ScreenshotOptions): Promise<ScreenshotResult> {
    try {
      execSync('which powershell.exe', { stdio: 'ignore' });
    } catch {
      // No powershell.exe — fall back to native Linux capture
      return this.captureLinux(outputPath, options);
    }

    return new Promise((resolve, reject) => {
      // GDI+ can't save directly to WSL UNC paths — use a Windows temp file
      // then copy it back into WSL via /mnt/c/
      const winTempFile = 'C:\\\\Temp\\\\codebuddy_screenshot.png';
      const wslTempFile = '/mnt/c/Temp/codebuddy_screenshot.png';

      let regionClip = '';
      if (options.region) {
        const { x, y, width, height } = options.region;
        regionClip = `
$bitmap = $bitmap.Clone((New-Object System.Drawing.Rectangle(${x}, ${y}, ${width}, ${height})), $bitmap.PixelFormat)`;
      }

      const script = `
if (-not (Test-Path 'C:\\Temp')) { New-Item -ItemType Directory -Path 'C:\\Temp' | Out-Null }
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$graphics.Dispose()${regionClip}
$bitmap.Save('${winTempFile}')
$bitmap.Dispose()
Write-Output 'ok'
`;

      // Ensure C:\Temp exists
      try {
        execSync('mkdir -p /mnt/c/Temp', { stdio: 'ignore' });
      } catch { /* ignore */ }

      const ps = spawn('powershell.exe', ['-NoProfile', '-Command', script]);

      let stderr = '';
      ps.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

      ps.on('close', async (code) => {
        try {
          // Copy from Windows temp to target path
          const { existsSync, copyFileSync } = await import('fs');
          if (existsSync(wslTempFile)) {
            copyFileSync(wslTempFile, outputPath);
          }
        } catch { /* ignore copy errors */ }

        if (code === 0 && await this.vfs.exists(outputPath)) {
          const stats = await this.vfs.stat(outputPath);
          // Only accept if file is > 10KB (scrot black captures are ~63KB but
          // PowerShell real captures are typically > 500KB)
          if (stats.size > 10240) {
            resolve({
              path: outputPath,
              size: this.formatSize(stats.size),
              timestamp: new Date().toISOString()
            });
            return;
          }
        }

        // Fall back to scrot if PowerShell failed or produced empty image
        try {
          const linuxResult = await this.captureLinux(outputPath, options);
          resolve(linuxResult);
        } catch (err) {
          reject(new Error(`WSL screenshot failed (PowerShell: ${stderr.trim()}, scrot fallback also failed)`));
        }
      });

      ps.on('error', async () => {
        try {
          const linuxResult = await this.captureLinux(outputPath, options);
          resolve(linuxResult);
        } catch (err) {
          reject(new Error('WSL screenshot failed: powershell.exe not available and scrot failed'));
        }
      });
    });
  }

  /**
   * Capture active window
   */
  async captureWindow(windowTitle?: string): Promise<ToolResult> {
    return this.capture({ window: windowTitle || 'active' });
  }

  /**
   * Capture a region
   */
  async captureRegion(x: number, y: number, width: number, height: number): Promise<ToolResult> {
    return this.capture({ region: { x, y, width, height } });
  }

  /**
   * Capture fullscreen with delay
   */
  async captureDelayed(seconds: number): Promise<ToolResult> {
    return this.capture({ fullscreen: true, delay: seconds });
  }

  /**
   * List saved screenshots
   */
  async listScreenshots(): Promise<ToolResult> {
    try {
      if (!await this.vfs.exists(this.defaultOutputDir)) {
        return {
          success: true,
          output: 'No screenshots found'
        };
      }

      const entries = await this.vfs.readDirectory(this.defaultOutputDir);
      const screenshots = entries.filter(e => e.isFile && /\.(png|jpg|jpeg)$/i.test(e.name));

      if (screenshots.length === 0) {
        return {
          success: true,
          output: 'No screenshots found'
        };
      }

      const listPromises = screenshots.map(async s => {
        const fullPath = path.join(this.defaultOutputDir, s.name);
        const stats = await this.vfs.stat(fullPath);
        const time = stats.mtime.toLocaleString();
        return `  📸 ${s.name} (${this.formatSize(stats.size)}) - ${time}`;
      });

      const screenshotList = (await Promise.all(listPromises)).join('\n');

      return {
        success: true,
        output: `Screenshots in ${this.defaultOutputDir}:\n${screenshotList}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list screenshots: ${getErrorMessage(error)}`
      };
    }
  }

  /**
   * Read a screenshot and convert to base64
   */
  async toBase64(filePath: string): Promise<ToolResult> {
    try {
      const resolvedPath = path.resolve(process.cwd(), filePath);

      if (!await this.vfs.exists(resolvedPath)) {
        return {
          success: false,
          error: `Screenshot not found: ${filePath}`
        };
      }

      const buffer = await this.vfs.readFileBuffer(resolvedPath);
      const base64 = buffer.toString('base64');
      const ext = path.extname(resolvedPath).toLowerCase();
      const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';

      return {
        success: true,
        output: `Screenshot converted to base64 (${base64.length} characters)`,
        data: {
          base64,
          mediaType,
          filename: path.basename(filePath)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert screenshot: ${getErrorMessage(error)}`
      };
    }
  }

  /**
   * Delete a screenshot
   */
  async deleteScreenshot(filePath: string): Promise<ToolResult> {
    try {
      const resolvedPath = filePath.startsWith('/')
        ? filePath
        : path.join(this.defaultOutputDir, filePath);

      if (!await this.vfs.exists(resolvedPath)) {
        return {
          success: false,
          error: `Screenshot not found: ${filePath}`
        };
      }

      await this.vfs.remove(resolvedPath);

      return {
        success: true,
        output: `Screenshot deleted: ${resolvedPath}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete screenshot: ${getErrorMessage(error)}`
      };
    }
  }

  /**
   * Clear all screenshots
   */
  async clearScreenshots(): Promise<ToolResult> {
    try {
      if (!await this.vfs.exists(this.defaultOutputDir)) {
        return {
          success: true,
          output: 'No screenshots to clear'
        };
      }

      const entries = await this.vfs.readDirectory(this.defaultOutputDir);
      let deleted = 0;

      for (const entry of entries) {
        if (entry.isFile && /\.(png|jpg|jpeg)$/i.test(entry.name)) {
          await this.vfs.remove(path.join(this.defaultOutputDir, entry.name));
          deleted++;
        }
      }

      return {
        success: true,
        output: `Cleared ${deleted} screenshots`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear screenshots: ${getErrorMessage(error)}`
      };
    }
  }

  /**
   * Format file size
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Format result for display
   */
  private formatResult(result: ScreenshotResult): string {
    const lines = [
      `📸 Screenshot captured`,
      `   Path: ${result.path}`,
      `   Size: ${result.size}`,
      `   Time: ${result.timestamp}`
    ];

    if (result.width && result.height) {
      lines.push(`   Dimensions: ${result.width}x${result.height}`);
    }

    return lines.join('\n');
  }
}
