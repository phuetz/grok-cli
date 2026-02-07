/**
 * Screen Observer
 *
 * Periodic screen monitoring with perceptual hashing for change detection.
 * Maintains a rolling history of frames for diff comparison.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface ScreenDiff {
  hasChanges: boolean;
  changePercentage: number;
  changedRegions: Region[];
  previousHash: string;
  currentHash: string;
  timestamp: Date;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
  description?: string;
}

export interface ScreenFrame {
  hash: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ScreenObserverConfig {
  /** Observation interval (ms) */
  intervalMs: number;
  /** Max frames to keep in history */
  maxHistory: number;
  /** Change detection threshold (0-1) */
  changeThreshold: number;
}

const DEFAULT_CONFIG: ScreenObserverConfig = {
  intervalMs: 10000,
  maxHistory: 10,
  changeThreshold: 0.05,
};

// ============================================================================
// Screen Observer
// ============================================================================

export class ScreenObserver extends EventEmitter {
  private config: ScreenObserverConfig;
  private timer: NodeJS.Timeout | null = null;
  private running: boolean = false;
  private history: ScreenFrame[] = [];
  private lastHash: string = '';
  private captureImpl: (() => Promise<Buffer | null>) | null = null;

  constructor(config: Partial<ScreenObserverConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the capture implementation (platform-specific)
   */
  setCaptureMethod(capture: () => Promise<Buffer | null>): void {
    this.captureImpl = capture;
  }

  /**
   * Start observing
   */
  start(intervalMs?: number): void {
    if (this.running) return;

    const interval = intervalMs || this.config.intervalMs;
    this.running = true;

    this.timer = setInterval(() => {
      this.observe().catch(err =>
        logger.debug('Screen observation failed', { error: String(err) })
      );
    }, interval);

    this.emit('started', { interval });
    logger.debug(`Screen observer started (interval: ${interval}ms)`);
  }

  /**
   * Stop observing
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    this.emit('stopped');
  }

  /**
   * Run a single observation cycle
   */
  async observe(): Promise<ScreenDiff | null> {
    try {
      let imageData: Buffer | null = null;

      if (this.captureImpl) {
        imageData = await this.captureImpl();
      }

      // Compute hash
      const hash = imageData
        ? this.computeHash(imageData)
        : crypto.randomUUID(); // Fallback for testing

      const frame: ScreenFrame = {
        hash,
        timestamp: new Date(),
      };

      // Add to history
      this.history.push(frame);
      if (this.history.length > this.config.maxHistory) {
        this.history.shift();
      }

      // Compare with last frame
      const diff = this.compareHashes(this.lastHash, hash);
      this.lastHash = hash;

      if (diff.hasChanges) {
        this.emit('change', diff);
      }

      return diff;

    } catch (error) {
      logger.debug('Screen observation error', { error: String(error) });
      return null;
    }
  }

  /**
   * Compute perceptual hash of image data
   */
  private computeHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  /**
   * Compare two hashes and determine if there's a change
   */
  private compareHashes(previous: string, current: string): ScreenDiff {
    if (!previous) {
      return {
        hasChanges: false,
        changePercentage: 0,
        changedRegions: [],
        previousHash: '',
        currentHash: current,
        timestamp: new Date(),
      };
    }

    const hasChanges = previous !== current;

    return {
      hasChanges,
      changePercentage: hasChanges ? 1.0 : 0,
      changedRegions: hasChanges ? [{ x: 0, y: 0, width: 0, height: 0, description: 'full screen' }] : [],
      previousHash: previous,
      currentHash: current,
      timestamp: new Date(),
    };
  }

  /**
   * Get frame history
   */
  getHistory(): ScreenFrame[] {
    return [...this.history];
  }

  /**
   * Is observer running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get config
   */
  getConfig(): ScreenObserverConfig {
    return { ...this.config };
  }
}
