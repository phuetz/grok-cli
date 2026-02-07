/**
 * Trust Folder Manager
 *
 * Manages a set of trusted directories. Tools that modify files or execute
 * commands are restricted to trusted directories only when trust enforcement
 * is enabled. Certain dangerous directories are always blocked.
 *
 * @module security
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../utils/logger.js';

const CONFIG_DIR = path.join(os.homedir(), '.codebuddy');
const TRUST_FILE = path.join(CONFIG_DIR, 'trusted-folders.json');

/**
 * Directories that can never be trusted (too dangerous).
 */
const ALWAYS_BLOCKED: string[] = [
  '/',
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/var',
  '/tmp',
  '/root',
  os.homedir(),
  path.join(os.homedir(), '.ssh'),
  path.join(os.homedir(), '.gnupg'),
  path.join(os.homedir(), '.aws'),
];

export class TrustFolderManager {
  private trustedFolders: Set<string> = new Set();
  private enforcementEnabled: boolean = true;

  constructor() {
    this.load();
  }

  /**
   * Check if a given path is within a trusted directory.
   */
  isTrusted(targetPath: string): boolean {
    if (!this.enforcementEnabled) return true;

    const resolved = path.resolve(targetPath);

    // Check if the path is within any trusted folder
    for (const trusted of this.trustedFolders) {
      if (resolved === trusted || resolved.startsWith(trusted + path.sep)) {
        return true;
      }
    }

    // Also trust current working directory by default
    const cwd = process.cwd();
    if (resolved === cwd || resolved.startsWith(cwd + path.sep)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a directory is in the always-blocked list.
   */
  isBlocked(dirPath: string): boolean {
    const resolved = path.resolve(dirPath);
    return ALWAYS_BLOCKED.some(blocked => resolved === path.resolve(blocked));
  }

  /**
   * Add a directory to the trusted list.
   * Returns false if the directory is always-blocked.
   */
  trustFolder(dirPath: string): boolean {
    const resolved = path.resolve(dirPath);

    if (this.isBlocked(resolved)) {
      logger.warn(`Cannot trust blocked directory: ${resolved}`);
      return false;
    }

    this.trustedFolders.add(resolved);
    this.save();
    return true;
  }

  /**
   * Remove a directory from the trusted list.
   */
  untrustFolder(dirPath: string): boolean {
    const resolved = path.resolve(dirPath);
    const removed = this.trustedFolders.delete(resolved);
    if (removed) this.save();
    return removed;
  }

  /**
   * Get list of all trusted folders.
   */
  getTrustedFolders(): string[] {
    return [...this.trustedFolders];
  }

  /**
   * Enable or disable trust enforcement.
   */
  setEnforcement(enabled: boolean): void {
    this.enforcementEnabled = enabled;
  }

  /**
   * Check if enforcement is enabled.
   */
  isEnforcementEnabled(): boolean {
    return this.enforcementEnabled;
  }

  private load(): void {
    try {
      if (fs.existsSync(TRUST_FILE)) {
        const data = JSON.parse(fs.readFileSync(TRUST_FILE, 'utf-8'));
        if (Array.isArray(data.folders)) {
          for (const folder of data.folders) {
            if (typeof folder === 'string' && !this.isBlocked(folder)) {
              this.trustedFolders.add(path.resolve(folder));
            }
          }
        }
        if (typeof data.enforcement === 'boolean') {
          this.enforcementEnabled = data.enforcement;
        }
      }
    } catch (error) {
      logger.debug('Failed to load trusted folders', { error });
    }
  }

  private save(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(TRUST_FILE, JSON.stringify({
        folders: [...this.trustedFolders],
        enforcement: this.enforcementEnabled,
      }, null, 2));
    } catch (error) {
      logger.debug('Failed to save trusted folders', { error });
    }
  }
}

// Singleton
let trustFolderInstance: TrustFolderManager | null = null;

export function getTrustFolderManager(): TrustFolderManager {
  if (!trustFolderInstance) {
    trustFolderInstance = new TrustFolderManager();
  }
  return trustFolderInstance;
}

export function resetTrustFolderManager(): void {
  trustFolderInstance = null;
}
