/**
 * Session Write Locks (OpenClaw-inspired)
 *
 * PID-based file locks with stale detection for session files.
 * Prevents concurrent writes to the same session from multiple processes.
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface LockInfo {
  pid: number;
  timestamp: number;
  hostname: string;
}

const LOCK_STALE_MS = 60_000; // 1 minute — consider lock stale after this

/**
 * Check if a process is still alive.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // Signal 0 = check existence
    return true;
  } catch {
    return false;
  }
}

/**
 * Session file lock manager.
 * Uses .lock files alongside session files with PID-based ownership.
 */
export class SessionLock {
  private lockPath: string;
  private acquired = false;

  constructor(sessionFilePath: string) {
    this.lockPath = sessionFilePath + '.lock';
  }

  /**
   * Attempt to acquire the lock.
   * Returns true if acquired, false if another live process holds it.
   */
  acquire(): boolean {
    if (this.acquired) return true;

    // Check existing lock
    if (fs.existsSync(this.lockPath)) {
      try {
        const raw = fs.readFileSync(this.lockPath, 'utf-8');
        const info: LockInfo = JSON.parse(raw);

        // Same process already holds it
        if (info.pid === process.pid) {
          this.acquired = true;
          return true;
        }

        // Check if lock is stale (process dead or timeout)
        const isStale = !isProcessAlive(info.pid) ||
          (Date.now() - info.timestamp > LOCK_STALE_MS);

        if (!isStale) {
          logger.debug(`Session lock held by PID ${info.pid}`, { lockPath: this.lockPath });
          return false;
        }

        // Stale lock — clean up
        logger.debug(`Cleaning stale session lock from PID ${info.pid}`, { lockPath: this.lockPath });
        fs.unlinkSync(this.lockPath);
      } catch {
        // Corrupt lock file — remove it
        try { fs.unlinkSync(this.lockPath); } catch { /* ignore */ }
      }
    }

    // Write new lock
    try {
      const lockDir = path.dirname(this.lockPath);
      if (!fs.existsSync(lockDir)) {
        fs.mkdirSync(lockDir, { recursive: true });
      }

      const info: LockInfo = {
        pid: process.pid,
        timestamp: Date.now(),
        hostname: require('os').hostname(),
      };

      // Use wx flag for atomic create — fails if file already exists
      fs.writeFileSync(this.lockPath, JSON.stringify(info), { flag: 'wx' });
      this.acquired = true;

      // Cleanup on process exit
      const cleanup = () => this.release();
      process.once('exit', cleanup);
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);

      return true;
    } catch (error) {
      // Race condition — another process created the file between our check and write
      logger.debug('Failed to acquire session lock (race)', { error });
      return false;
    }
  }

  /**
   * Release the lock.
   */
  release(): void {
    if (!this.acquired) return;

    try {
      if (fs.existsSync(this.lockPath)) {
        const raw = fs.readFileSync(this.lockPath, 'utf-8');
        const info: LockInfo = JSON.parse(raw);

        // Only delete if we own it
        if (info.pid === process.pid) {
          fs.unlinkSync(this.lockPath);
        }
      }
    } catch {
      // Best effort
    }

    this.acquired = false;
  }

  /**
   * Check if the lock is currently held (by any process).
   */
  isLocked(): boolean {
    if (!fs.existsSync(this.lockPath)) return false;

    try {
      const raw = fs.readFileSync(this.lockPath, 'utf-8');
      const info: LockInfo = JSON.parse(raw);
      return isProcessAlive(info.pid);
    } catch {
      return false;
    }
  }

  /**
   * Get info about the current lock holder.
   */
  getLockHolder(): LockInfo | null {
    if (!fs.existsSync(this.lockPath)) return null;

    try {
      const raw = fs.readFileSync(this.lockPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

/**
 * Execute a function with a session lock held.
 * Throws if the lock cannot be acquired.
 */
export async function withSessionLock<T>(
  sessionFilePath: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lock = new SessionLock(sessionFilePath);

  if (!lock.acquire()) {
    const holder = lock.getLockHolder();
    throw new Error(
      `Session file is locked by PID ${holder?.pid ?? 'unknown'}. ` +
      `If this is stale, delete ${sessionFilePath}.lock`
    );
  }

  try {
    return await fn();
  } finally {
    lock.release();
  }
}
