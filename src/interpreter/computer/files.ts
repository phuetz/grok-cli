/**
 * Computer Files Module
 *
 * File system operations for the interpreter.
 * Inspired by Open Interpreter's computer.files capabilities.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  created: Date;
  modified: Date;
  accessed: Date;
  permissions: string;
  owner?: string;
  extension?: string;
  mimeType?: string;
}

export interface SearchOptions {
  /** File name pattern (glob) */
  pattern?: string;
  /** Search in subdirectories */
  recursive?: boolean;
  /** Maximum depth */
  maxDepth?: number;
  /** Include hidden files */
  includeHidden?: boolean;
  /** Filter by extension */
  extensions?: string[];
  /** Filter by file type */
  type?: 'file' | 'directory' | 'symlink' | 'all';
  /** Filter by size (bytes) */
  minSize?: number;
  maxSize?: number;
  /** Filter by modification time */
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  /** Maximum results */
  limit?: number;
}

export interface CopyOptions {
  /** Overwrite existing files */
  overwrite?: boolean;
  /** Preserve timestamps */
  preserveTimestamps?: boolean;
  /** Copy directories recursively */
  recursive?: boolean;
}

export interface ReadOptions {
  /** Encoding (default: utf-8) */
  encoding?: BufferEncoding;
  /** Start position */
  start?: number;
  /** End position */
  end?: number;
  /** Read as lines */
  lines?: { start?: number; count?: number };
}

export interface WriteOptions {
  /** Encoding (default: utf-8) */
  encoding?: BufferEncoding;
  /** Append to file */
  append?: boolean;
  /** Create directories if needed */
  createDirs?: boolean;
  /** File mode */
  mode?: number;
}

export interface WatchCallback {
  (event: 'change' | 'rename', filename: string): void;
}

// ============================================================================
// Computer Files Class
// ============================================================================

export class ComputerFiles {
  private watchers: Map<string, fs.FSWatcher> = new Map();

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * Read file contents
   */
  async read(filePath: string, options: ReadOptions = {}): Promise<string> {
    const resolved = this.resolvePath(filePath);
    const encoding = options.encoding || 'utf-8';

    if (options.lines) {
      return this.readLines(resolved, options.lines.start, options.lines.count);
    }

    if (options.start !== undefined || options.end !== undefined) {
      return this.readRange(resolved, options.start || 0, options.end, encoding);
    }

    return fs.promises.readFile(resolved, { encoding });
  }

  /**
   * Read file as Buffer
   */
  async readBuffer(filePath: string): Promise<Buffer> {
    const resolved = this.resolvePath(filePath);
    return fs.promises.readFile(resolved);
  }

  /**
   * Read specific lines from a file
   */
  async readLines(filePath: string, start?: number, count?: number): Promise<string> {
    const resolved = this.resolvePath(filePath);
    const content = await fs.promises.readFile(resolved, 'utf-8');
    const lines = content.split('\n');

    const startLine = start || 0;
    const endLine = count ? startLine + count : lines.length;

    return lines.slice(startLine, endLine).join('\n');
  }

  /**
   * Read a range of bytes from a file
   */
  private async readRange(
    filePath: string,
    start: number,
    end?: number,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<string> {
    const stats = await fs.promises.stat(filePath);
    const actualEnd = end ?? stats.size;

    const buffer = Buffer.alloc(actualEnd - start);
    const fd = await fs.promises.open(filePath, 'r');

    try {
      await fd.read(buffer, 0, buffer.length, start);
      return buffer.toString(encoding);
    } finally {
      await fd.close();
    }
  }

  /**
   * Read JSON file
   */
  async readJson<T = unknown>(filePath: string): Promise<T> {
    const content = await this.read(filePath);
    return JSON.parse(content) as T;
  }

  // ==========================================================================
  // Write Operations
  // ==========================================================================

  /**
   * Write content to file
   */
  async write(filePath: string, content: string | Buffer, options: WriteOptions = {}): Promise<void> {
    const resolved = this.resolvePath(filePath);

    if (options.createDirs) {
      await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
    }

    if (options.append) {
      await fs.promises.appendFile(resolved, content, {
        encoding: options.encoding || 'utf-8',
        mode: options.mode,
      });
    } else {
      await fs.promises.writeFile(resolved, content, {
        encoding: options.encoding || 'utf-8',
        mode: options.mode,
      });
    }
  }

  /**
   * Write JSON to file
   */
  async writeJson(filePath: string, data: unknown, options: WriteOptions & { pretty?: boolean } = {}): Promise<void> {
    const content = options.pretty !== false
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    await this.write(filePath, content, options);
  }

  /**
   * Append to file
   */
  async append(filePath: string, content: string | Buffer, options: WriteOptions = {}): Promise<void> {
    await this.write(filePath, content, { ...options, append: true });
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  /**
   * Copy file or directory
   */
  async copy(src: string, dest: string, options: CopyOptions = {}): Promise<void> {
    const resolvedSrc = this.resolvePath(src);
    const resolvedDest = this.resolvePath(dest);

    const stats = await fs.promises.stat(resolvedSrc);

    if (stats.isDirectory()) {
      if (!options.recursive) {
        throw new Error('Cannot copy directory without recursive option');
      }
      await this.copyDirectory(resolvedSrc, resolvedDest, options);
    } else {
      await this.copyFile(resolvedSrc, resolvedDest, options);
    }
  }

  private async copyFile(src: string, dest: string, options: CopyOptions): Promise<void> {
    const destExists = await this.exists(dest);

    if (destExists && !options.overwrite) {
      throw new Error(`Destination already exists: ${dest}`);
    }

    await fs.promises.copyFile(src, dest);

    if (options.preserveTimestamps) {
      const stats = await fs.promises.stat(src);
      await fs.promises.utimes(dest, stats.atime, stats.mtime);
    }
  }

  private async copyDirectory(src: string, dest: string, options: CopyOptions): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });

    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath, options);
      } else {
        await this.copyFile(srcPath, destPath, options);
      }
    }
  }

  /**
   * Move file or directory
   */
  async move(src: string, dest: string, options: CopyOptions = {}): Promise<void> {
    const resolvedSrc = this.resolvePath(src);
    const resolvedDest = this.resolvePath(dest);

    // Try rename first (fastest if same filesystem)
    try {
      await fs.promises.rename(resolvedSrc, resolvedDest);
      return;
    } catch (err) {
      // If rename fails (cross-device), copy and delete
      if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
        await this.copy(resolvedSrc, resolvedDest, { ...options, recursive: true });
        await this.delete(resolvedSrc, { recursive: true });
        return;
      }
      throw err;
    }
  }

  /**
   * Delete file or directory
   */
  async delete(filePath: string, options: { recursive?: boolean; force?: boolean } = {}): Promise<void> {
    const resolved = this.resolvePath(filePath);

    try {
      const stats = await fs.promises.stat(resolved);

      if (stats.isDirectory()) {
        await fs.promises.rm(resolved, { recursive: options.recursive ?? true, force: options.force });
      } else {
        await fs.promises.unlink(resolved);
      }
    } catch (err) {
      if (!options.force) {
        throw err;
      }
    }
  }

  /**
   * Rename file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const resolvedOld = this.resolvePath(oldPath);
    const resolvedNew = this.resolvePath(newPath);
    await fs.promises.rename(resolvedOld, resolvedNew);
  }

  /**
   * Create directory
   */
  async mkdir(dirPath: string, options: { recursive?: boolean } = {}): Promise<void> {
    const resolved = this.resolvePath(dirPath);
    await fs.promises.mkdir(resolved, { recursive: options.recursive ?? true });
  }

  /**
   * Create symbolic link
   */
  async symlink(target: string, linkPath: string): Promise<void> {
    const resolvedTarget = this.resolvePath(target);
    const resolvedLink = this.resolvePath(linkPath);
    await fs.promises.symlink(resolvedTarget, resolvedLink);
  }

  // ==========================================================================
  // File Info
  // ==========================================================================

  /**
   * Get file/directory info
   */
  async info(filePath: string): Promise<FileInfo> {
    const resolved = this.resolvePath(filePath);
    const stats = await fs.promises.lstat(resolved);

    const ext = path.extname(resolved);

    return {
      name: path.basename(resolved),
      path: resolved,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      isSymlink: stats.isSymbolicLink(),
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      permissions: (stats.mode & 0o777).toString(8),
      extension: ext || undefined,
      mimeType: this.getMimeType(ext),
    };
  }

  /**
   * Check if path exists
   */
  async exists(filePath: string): Promise<boolean> {
    const resolved = this.resolvePath(filePath);
    try {
      await fs.promises.access(resolved);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async size(filePath: string): Promise<number> {
    const resolved = this.resolvePath(filePath);
    const stats = await fs.promises.stat(resolved);
    return stats.size;
  }

  /**
   * Get file hash
   */
  async hash(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    const resolved = this.resolvePath(filePath);
    const content = await fs.promises.readFile(resolved);
    return createHash(algorithm).update(content).digest('hex');
  }

  // ==========================================================================
  // Directory Operations
  // ==========================================================================

  /**
   * List directory contents
   */
  async list(dirPath: string, options: SearchOptions = {}): Promise<FileInfo[]> {
    const resolved = this.resolvePath(dirPath);
    const entries = await fs.promises.readdir(resolved, { withFileTypes: true });

    const results: FileInfo[] = [];

    for (const entry of entries) {
      // Skip hidden files unless requested
      if (!options.includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      // Filter by type
      if (options.type === 'file' && !entry.isFile()) continue;
      if (options.type === 'directory' && !entry.isDirectory()) continue;
      if (options.type === 'symlink' && !entry.isSymbolicLink()) continue;

      // Filter by pattern
      if (options.pattern && !this.matchPattern(entry.name, options.pattern)) {
        continue;
      }

      // Filter by extension
      if (options.extensions) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!options.extensions.some(e => `.${e.toLowerCase()}` === ext)) {
          continue;
        }
      }

      const fullPath = path.join(resolved, entry.name);
      const info = await this.info(fullPath);

      // Filter by size
      if (options.minSize && info.size < options.minSize) continue;
      if (options.maxSize && info.size > options.maxSize) continue;

      // Filter by modification time
      if (options.modifiedAfter && info.modified < options.modifiedAfter) continue;
      if (options.modifiedBefore && info.modified > options.modifiedBefore) continue;

      results.push(info);

      // Check limit
      if (options.limit && results.length >= options.limit) {
        break;
      }
    }

    return results;
  }

  /**
   * Search for files
   */
  async search(rootPath: string, options: SearchOptions = {}): Promise<FileInfo[]> {
    const resolved = this.resolvePath(rootPath);
    const results: FileInfo[] = [];
    const maxDepth = options.maxDepth ?? Infinity;

    await this.searchRecursive(resolved, options, results, 0, maxDepth);

    return results;
  }

  private async searchRecursive(
    dirPath: string,
    options: SearchOptions,
    results: FileInfo[],
    depth: number,
    maxDepth: number
  ): Promise<void> {
    if (depth > maxDepth || (options.limit && results.length >= options.limit)) {
      return;
    }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (options.limit && results.length >= options.limit) {
          return;
        }

        // Skip hidden files
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        // Check if matches criteria
        let matches = true;

        // Filter by type
        if (options.type === 'file' && !entry.isFile()) matches = false;
        if (options.type === 'directory' && !entry.isDirectory()) matches = false;
        if (options.type === 'symlink' && !entry.isSymbolicLink()) matches = false;

        // Filter by pattern
        if (options.pattern && !this.matchPattern(entry.name, options.pattern)) {
          matches = false;
        }

        // Filter by extension
        if (options.extensions && entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!options.extensions.some(e => `.${e.toLowerCase()}` === ext)) {
            matches = false;
          }
        }

        if (matches) {
          const info = await this.info(fullPath);

          // Filter by size
          if (options.minSize && info.size < options.minSize) matches = false;
          if (options.maxSize && info.size > options.maxSize) matches = false;

          // Filter by modification time
          if (options.modifiedAfter && info.modified < options.modifiedAfter) matches = false;
          if (options.modifiedBefore && info.modified > options.modifiedBefore) matches = false;

          if (matches) {
            results.push(info);
          }
        }

        // Recurse into directories
        if (entry.isDirectory() && (options.recursive ?? true)) {
          await this.searchRecursive(fullPath, options, results, depth + 1, maxDepth);
        }
      }
    } catch (err) {
      // Skip directories we can't read
      if ((err as NodeJS.ErrnoException).code !== 'EACCES') {
        throw err;
      }
    }
  }

  /**
   * Get directory tree
   */
  async tree(dirPath: string, maxDepth: number = 3): Promise<string> {
    const resolved = this.resolvePath(dirPath);
    const lines: string[] = [];

    await this.buildTree(resolved, '', lines, 0, maxDepth);

    return lines.join('\n');
  }

  private async buildTree(
    dirPath: string,
    prefix: string,
    lines: string[],
    depth: number,
    maxDepth: number
  ): Promise<void> {
    if (depth > maxDepth) {
      return;
    }

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const sortedEntries = entries.sort((a, b) => {
      // Directories first
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const isLast = i === sortedEntries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      if (entry.name.startsWith('.')) {
        continue;
      }

      const icon = entry.isDirectory() ? '📁' : '📄';
      lines.push(`${prefix}${connector}${icon} ${entry.name}`);

      if (entry.isDirectory()) {
        const fullPath = path.join(dirPath, entry.name);
        await this.buildTree(fullPath, prefix + childPrefix, lines, depth + 1, maxDepth);
      }
    }
  }

  // ==========================================================================
  // Watch Operations
  // ==========================================================================

  /**
   * Watch for file changes
   */
  watch(filePath: string, callback: WatchCallback): () => void {
    const resolved = this.resolvePath(filePath);

    const watcher = fs.watch(resolved, (event, filename) => {
      callback(event as 'change' | 'rename', filename || '');
    });

    this.watchers.set(resolved, watcher);

    // Return unwatch function
    return () => {
      watcher.close();
      this.watchers.delete(resolved);
    };
  }

  /**
   * Stop all watches
   */
  unwatchAll(): void {
    for (const [, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Resolve path with home directory expansion
   */
  resolvePath(p: string): string {
    if (p.startsWith('~')) {
      return path.join(os.homedir(), p.slice(1));
    }
    return path.resolve(p);
  }

  /**
   * Simple glob pattern matching
   */
  private matchPattern(filename: string, pattern: string): boolean {
    // Convert glob to regex
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regex}$`, 'i').test(filename);
  }

  /**
   * Get MIME type from extension
   */
  private getMimeType(ext: string): string | undefined {
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };

    return mimeTypes[ext.toLowerCase()];
  }

  /**
   * Format file size
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let filesInstance: ComputerFiles | null = null;

export function getComputerFiles(): ComputerFiles {
  if (!filesInstance) {
    filesInstance = new ComputerFiles();
  }
  return filesInstance;
}

export function resetComputerFiles(): void {
  if (filesInstance) {
    filesInstance.unwatchAll();
  }
  filesInstance = null;
}

export default ComputerFiles;
