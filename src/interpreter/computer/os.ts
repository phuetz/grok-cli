/**
 * Computer OS Module
 *
 * Operating system interactions including clipboard, selected text,
 * and system information.
 * Inspired by Open Interpreter's computer.os capabilities.
 */

import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface ClipboardContent {
  text?: string;
  html?: string;
  image?: Buffer;
  files?: string[];
}

export interface SystemInfo {
  platform: NodeJS.Platform;
  arch: string;
  hostname: string;
  username: string;
  homeDir: string;
  tempDir: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  shell: string;
  env: Record<string, string>;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  user?: string;
  command?: string;
}

export interface DisplayInfo {
  id: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  primary: boolean;
  scaleFactor: number;
}

// ============================================================================
// Computer OS Class
// ============================================================================

export class ComputerOS {
  private platform: NodeJS.Platform;

  constructor() {
    this.platform = os.platform();
  }

  // ==========================================================================
  // Clipboard Operations
  // ==========================================================================

  /**
   * Get currently selected text from the OS
   * Works on macOS, Linux (X11/Wayland), and Windows
   */
  async getSelectedText(): Promise<string> {
    try {
      switch (this.platform) {
        case 'darwin':
          return await this.getSelectedTextMacOS();
        case 'linux':
          return await this.getSelectedTextLinux();
        case 'win32':
          return await this.getSelectedTextWindows();
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } catch (error) {
      // Fallback to clipboard if selection fails
      try {
        return await this.getClipboardText();
      } catch {
        throw error;
      }
    }
  }

  private async getSelectedTextMacOS(): Promise<string> {
    // Use AppleScript to get selected text
    const script = `
      tell application "System Events"
        keystroke "c" using command down
        delay 0.1
      end tell
      return the clipboard
    `;

    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
    return stdout.trim();
  }

  private async getSelectedTextLinux(): Promise<string> {
    // Try xclip first (X11 primary selection)
    try {
      const { stdout } = await execAsync('xclip -selection primary -o 2>/dev/null');
      return stdout;
    } catch {
      // Try xsel as fallback
      try {
        const { stdout } = await execAsync('xsel --primary --output 2>/dev/null');
        return stdout;
      } catch {
        // Try wl-paste for Wayland
        try {
          const { stdout } = await execAsync('wl-paste --primary 2>/dev/null');
          return stdout;
        } catch {
          throw new Error('No clipboard utility found. Install xclip, xsel, or wl-clipboard.');
        }
      }
    }
  }

  private async getSelectedTextWindows(): Promise<string> {
    // Use PowerShell to get selected text via clipboard
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("^c")
      Start-Sleep -Milliseconds 100
      Get-Clipboard
    `;

    const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
    return stdout.trim();
  }

  /**
   * Get clipboard text content
   */
  async getClipboardText(): Promise<string> {
    switch (this.platform) {
      case 'darwin': {
        const { stdout } = await execAsync('pbpaste');
        return stdout;
      }
      case 'linux': {
        try {
          const { stdout } = await execAsync('xclip -selection clipboard -o 2>/dev/null');
          return stdout;
        } catch {
          try {
            const { stdout } = await execAsync('xsel --clipboard --output 2>/dev/null');
            return stdout;
          } catch {
            const { stdout } = await execAsync('wl-paste 2>/dev/null');
            return stdout;
          }
        }
      }
      case 'win32': {
        const { stdout } = await execAsync('powershell Get-Clipboard');
        return stdout.trim();
      }
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Set clipboard text content
   */
  async setClipboardText(text: string): Promise<void> {
    switch (this.platform) {
      case 'darwin': {
        const child = spawn('pbcopy');
        child.stdin.write(text);
        child.stdin.end();
        await new Promise<void>((resolve, reject) => {
          child.on('close', code => code === 0 ? resolve() : reject(new Error('pbcopy failed')));
        });
        break;
      }
      case 'linux': {
        try {
          const child = spawn('xclip', ['-selection', 'clipboard']);
          child.stdin.write(text);
          child.stdin.end();
          await new Promise<void>((resolve, reject) => {
            child.on('close', code => code === 0 ? resolve() : reject(new Error('xclip failed')));
          });
        } catch {
          try {
            const child = spawn('xsel', ['--clipboard', '--input']);
            child.stdin.write(text);
            child.stdin.end();
            await new Promise<void>((resolve, reject) => {
              child.on('close', code => code === 0 ? resolve() : reject(new Error('xsel failed')));
            });
          } catch {
            const child = spawn('wl-copy');
            child.stdin.write(text);
            child.stdin.end();
            await new Promise<void>((resolve, reject) => {
              child.on('close', code => code === 0 ? resolve() : reject(new Error('wl-copy failed')));
            });
          }
        }
        break;
      }
      case 'win32': {
        const escaped = text.replace(/"/g, '`"');
        await execAsync(`powershell Set-Clipboard -Value "${escaped}"`);
        break;
      }
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Get full clipboard content (text, html, images, files)
   */
  async getClipboard(): Promise<ClipboardContent> {
    const content: ClipboardContent = {};

    // Get text
    try {
      content.text = await this.getClipboardText();
    } catch {
      // No text in clipboard
    }

    // Platform-specific content
    if (this.platform === 'darwin') {
      // Check for HTML
      try {
        const { stdout } = await execAsync('osascript -e \'the clipboard as «class HTML»\'');
        if (stdout.trim()) {
          content.html = stdout.trim();
        }
      } catch {
        // No HTML
      }
    }

    return content;
  }

  // ==========================================================================
  // System Information
  // ==========================================================================

  /**
   * Get system information
   */
  getSystemInfo(): SystemInfo {
    return {
      platform: this.platform,
      arch: os.arch(),
      hostname: os.hostname(),
      username: os.userInfo().username,
      homeDir: os.homedir(),
      tempDir: os.tmpdir(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      shell: process.env.SHELL || process.env.ComSpec || '',
      env: process.env as Record<string, string>,
    };
  }

  /**
   * Get current username
   */
  getUsername(): string {
    return os.userInfo().username;
  }

  /**
   * Get home directory
   */
  getHomeDir(): string {
    return os.homedir();
  }

  /**
   * Get current working directory
   */
  getCwd(): string {
    return process.cwd();
  }

  /**
   * Get environment variable
   */
  getEnv(name: string): string | undefined {
    return process.env[name];
  }

  /**
   * Set environment variable (for child processes)
   */
  setEnv(name: string, value: string): void {
    process.env[name] = value;
  }

  // ==========================================================================
  // Process Management
  // ==========================================================================

  /**
   * List running processes
   */
  async listProcesses(): Promise<ProcessInfo[]> {
    switch (this.platform) {
      case 'darwin':
      case 'linux':
        return await this.listProcessesUnix();
      case 'win32':
        return await this.listProcessesWindows();
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  private async listProcessesUnix(): Promise<ProcessInfo[]> {
    const { stdout } = await execAsync('ps aux --sort=-%cpu | head -50');
    const lines = stdout.trim().split('\n').slice(1);

    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        pid: parseInt(parts[1], 10),
        name: parts[10] || parts[parts.length - 1],
        cpu: parseFloat(parts[2]),
        memory: parseFloat(parts[3]),
        user: parts[0],
        command: parts.slice(10).join(' '),
      };
    });
  }

  private async listProcessesWindows(): Promise<ProcessInfo[]> {
    const { stdout } = await execAsync('wmic process get ProcessId,Name,PercentProcessorTime,WorkingSetSize /format:csv');
    const lines = stdout.trim().split('\n').slice(2);

    return lines.map(line => {
      const parts = line.split(',');
      return {
        pid: parseInt(parts[3], 10),
        name: parts[1],
        cpu: parseFloat(parts[2]) || 0,
        memory: parseInt(parts[4], 10) || 0,
      };
    }).filter(p => !isNaN(p.pid));
  }

  /**
   * Kill a process by PID
   */
  async killProcess(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    if (this.platform === 'win32') {
      await execAsync(`taskkill /PID ${pid} /F`);
    } else {
      process.kill(pid, signal);
    }
  }

  /**
   * Find process by name
   */
  async findProcess(name: string): Promise<ProcessInfo[]> {
    const processes = await this.listProcesses();
    const lowerName = name.toLowerCase();
    return processes.filter(p =>
      p.name.toLowerCase().includes(lowerName) ||
      (p.command && p.command.toLowerCase().includes(lowerName))
    );
  }

  // ==========================================================================
  // Display Information
  // ==========================================================================

  /**
   * Get display/screen information
   */
  async getDisplays(): Promise<DisplayInfo[]> {
    switch (this.platform) {
      case 'darwin':
        return await this.getDisplaysMacOS();
      case 'linux':
        return await this.getDisplaysLinux();
      case 'win32':
        return await this.getDisplaysWindows();
      default:
        // Return default display
        return [{
          id: 0,
          name: 'Default',
          width: 1920,
          height: 1080,
          x: 0,
          y: 0,
          primary: true,
          scaleFactor: 1,
        }];
    }
  }

  private async getDisplaysMacOS(): Promise<DisplayInfo[]> {
    try {
      const script = `
        tell application "Finder"
          set _bounds to bounds of window of desktop
          return _bounds
        end tell
      `;
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const [, , width, height] = stdout.trim().split(', ').map(Number);

      return [{
        id: 0,
        name: 'Main Display',
        width: width || 1920,
        height: height || 1080,
        x: 0,
        y: 0,
        primary: true,
        scaleFactor: 2, // Retina default
      }];
    } catch {
      return [{
        id: 0,
        name: 'Main Display',
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        primary: true,
        scaleFactor: 2,
      }];
    }
  }

  private async getDisplaysLinux(): Promise<DisplayInfo[]> {
    try {
      const { stdout } = await execAsync('xrandr --current');
      const displays: DisplayInfo[] = [];

      const pattern = /(\S+)\s+connected\s+(primary\s+)?(\d+)x(\d+)\+(\d+)\+(\d+)/g;
      let match;
      let id = 0;

      while ((match = pattern.exec(stdout)) !== null) {
        displays.push({
          id: id++,
          name: match[1],
          width: parseInt(match[3], 10),
          height: parseInt(match[4], 10),
          x: parseInt(match[5], 10),
          y: parseInt(match[6], 10),
          primary: !!match[2],
          scaleFactor: 1,
        });
      }

      return displays.length > 0 ? displays : [{
        id: 0,
        name: 'Default',
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        primary: true,
        scaleFactor: 1,
      }];
    } catch {
      return [{
        id: 0,
        name: 'Default',
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        primary: true,
        scaleFactor: 1,
      }];
    }
  }

  private async getDisplaysWindows(): Promise<DisplayInfo[]> {
    try {
      const { stdout } = await execAsync(
        'wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution /format:csv'
      );
      const lines = stdout.trim().split('\n').slice(2);

      return lines.map((line, index) => {
        const [, width, height] = line.split(',');
        return {
          id: index,
          name: `Display ${index + 1}`,
          width: parseInt(width, 10) || 1920,
          height: parseInt(height, 10) || 1080,
          x: 0,
          y: 0,
          primary: index === 0,
          scaleFactor: 1,
        };
      }).filter(d => !isNaN(d.width));
    } catch {
      return [{
        id: 0,
        name: 'Default',
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        primary: true,
        scaleFactor: 1,
      }];
    }
  }

  // ==========================================================================
  // Application Launching
  // ==========================================================================

  /**
   * Open a file or URL with the default application
   */
  async open(target: string): Promise<void> {
    switch (this.platform) {
      case 'darwin':
        await execAsync(`open "${target}"`);
        break;
      case 'linux':
        await execAsync(`xdg-open "${target}"`);
        break;
      case 'win32':
        await execAsync(`start "" "${target}"`);
        break;
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Launch an application by name
   */
  async launchApp(appName: string, args: string[] = []): Promise<void> {
    switch (this.platform) {
      case 'darwin':
        await execAsync(`open -a "${appName}" ${args.map(a => `"${a}"`).join(' ')}`);
        break;
      case 'linux':
        spawn(appName, args, { detached: true, stdio: 'ignore' }).unref();
        break;
      case 'win32':
        spawn('cmd', ['/c', 'start', '', appName, ...args], { detached: true, stdio: 'ignore' }).unref();
        break;
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  // ==========================================================================
  // Shell Commands
  // ==========================================================================

  /**
   * Execute a shell command
   */
  async exec(command: string, options: { timeout?: number; cwd?: string } = {}): Promise<{ stdout: string; stderr: string }> {
    return execAsync(command, {
      timeout: options.timeout || 30000,
      cwd: options.cwd || process.cwd(),
    });
  }

  /**
   * Execute a shell command synchronously
   */
  execSync(command: string, options: { cwd?: string } = {}): string {
    return execSync(command, {
      cwd: options.cwd || process.cwd(),
      encoding: 'utf-8',
    });
  }

  /**
   * Get default shell
   */
  getShell(): string {
    if (this.platform === 'win32') {
      return process.env.ComSpec || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/sh';
  }

  // ==========================================================================
  // Notifications
  // ==========================================================================

  /**
   * Show a system notification
   */
  async notify(title: string, message: string): Promise<void> {
    switch (this.platform) {
      case 'darwin':
        await execAsync(`osascript -e 'display notification "${message}" with title "${title}"'`);
        break;
      case 'linux':
        await execAsync(`notify-send "${title}" "${message}"`);
        break;
      case 'win32':
        const script = `
          [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
          $template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02
          $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template)
          $text = $xml.GetElementsByTagName("text")
          $text[0].AppendChild($xml.CreateTextNode("${title}"))
          $text[1].AppendChild($xml.CreateTextNode("${message}"))
          $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
          [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("CodeBuddy").Show($toast)
        `;
        await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`);
        break;
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let osInstance: ComputerOS | null = null;

export function getComputerOS(): ComputerOS {
  if (!osInstance) {
    osInstance = new ComputerOS();
  }
  return osInstance;
}

export function resetComputerOS(): void {
  osInstance = null;
}

export default ComputerOS;
