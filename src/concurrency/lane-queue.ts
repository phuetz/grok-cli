/**
 * Lane Queue System
 *
 * OpenClaw-inspired concurrency control: "Default Serial, Explicit Parallel"
 *
 * Each session has its own "lane" for task execution:
 * - Tasks execute serially by default to prevent state corruption
 * - Only explicitly marked safe/idempotent tasks run in parallel
 * - Prevents race conditions in multi-channel/multi-session scenarios
 *
 * Usage:
 * ```typescript
 * const queue = getLaneQueue();
 *
 * // Serial execution (default)
 * await queue.enqueue('session-1', async () => {
 *   await doSomething();
 * });
 *
 * // Parallel execution (explicit)
 * await queue.enqueue('session-1', async () => {
 *   await readOnlyOperation();
 * }, { parallel: true });
 * ```
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface Task<T = unknown> {
  /** Unique task ID */
  id: string;
  /** Lane/session this task belongs to */
  laneId: string;
  /** Task function to execute */
  fn: () => Promise<T>;
  /** Task options */
  options: TaskOptions;
  /** Task status */
  status: TaskStatus;
  /** When task was enqueued */
  enqueuedAt: Date;
  /** When task started */
  startedAt?: Date;
  /** When task completed */
  completedAt?: Date;
  /** Task result (if completed) */
  result?: T;
  /** Task error (if failed) */
  error?: Error;
  /** Promise resolver */
  resolve: (value: T) => void;
  /** Promise rejector */
  reject: (error: Error) => void;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TaskOptions {
  /** Allow parallel execution with other parallel tasks */
  parallel?: boolean;
  /** Task priority (higher = executed first) */
  priority?: number;
  /** Task timeout in ms */
  timeout?: number;
  /** Task category for metrics */
  category?: string;
  /** Whether task is idempotent (safe to retry) */
  idempotent?: boolean;
  /** Retry count on failure */
  retries?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
}

export interface Lane {
  /** Lane ID (usually session ID) */
  id: string;
  /** Pending tasks */
  pending: Task[];
  /** Currently running tasks */
  running: Task[];
  /** Is lane paused */
  paused: boolean;
  /** Is lane processing */
  processing: boolean;
  /** Lane statistics */
  stats: LaneStats;
}

export interface LaneStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalDuration: number;
  averageDuration: number;
}

export interface LaneQueueConfig {
  /** Maximum concurrent parallel tasks per lane */
  maxParallel: number;
  /** Default task timeout in ms */
  defaultTimeout: number;
  /** Enable task metrics */
  metricsEnabled: boolean;
  /** Maximum pending tasks per lane */
  maxPending: number;
  /** Default retry count */
  defaultRetries: number;
  /** Default retry delay in ms */
  defaultRetryDelay: number;
}

export const DEFAULT_LANE_QUEUE_CONFIG: LaneQueueConfig = {
  maxParallel: 3,
  defaultTimeout: 60000,
  metricsEnabled: true,
  maxPending: 100,
  defaultRetries: 0,
  defaultRetryDelay: 1000,
};

export interface LaneQueueEvents {
  /** Task enqueued */
  'task:enqueued': (task: Task) => void;
  /** Task started */
  'task:started': (task: Task) => void;
  /** Task completed */
  'task:completed': (task: Task) => void;
  /** Task failed */
  'task:failed': (task: Task, error: Error) => void;
  /** Task cancelled */
  'task:cancelled': (task: Task) => void;
  /** Lane created */
  'lane:created': (laneId: string) => void;
  /** Lane paused */
  'lane:paused': (laneId: string) => void;
  /** Lane resumed */
  'lane:resumed': (laneId: string) => void;
  /** Lane drained */
  'lane:drained': (laneId: string) => void;
}

// ============================================================================
// Lane Queue Class
// ============================================================================

export class LaneQueue extends EventEmitter {
  private config: LaneQueueConfig;
  private lanes: Map<string, Lane> = new Map();
  private taskCounter: number = 0;

  constructor(config: Partial<LaneQueueConfig> = {}) {
    super();
    this.config = { ...DEFAULT_LANE_QUEUE_CONFIG, ...config };
  }

  // ==========================================================================
  // Task Enqueueing
  // ==========================================================================

  /**
   * Enqueue a task for execution
   */
  async enqueue<T>(
    laneId: string,
    fn: () => Promise<T>,
    options: TaskOptions = {}
  ): Promise<T> {
    const lane = this.getOrCreateLane(laneId);

    // Check pending limit
    if (lane.pending.length >= this.config.maxPending) {
      throw new Error(`Lane ${laneId} has too many pending tasks`);
    }

    // Create task
    let resolve: (value: T) => void;
    let reject: (error: Error) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const task: Task<T> = {
      id: `task-${++this.taskCounter}`,
      laneId,
      fn,
      options: {
        parallel: options.parallel ?? false,
        priority: options.priority ?? 0,
        timeout: options.timeout ?? this.config.defaultTimeout,
        category: options.category,
        idempotent: options.idempotent ?? false,
        retries: options.retries ?? this.config.defaultRetries,
        retryDelay: options.retryDelay ?? this.config.defaultRetryDelay,
      },
      status: 'pending',
      enqueuedAt: new Date(),
      resolve: resolve!,
      reject: reject!,
    };

    // Add to pending queue (sorted by priority)
    this.insertByPriority(lane.pending, task as Task);
    lane.stats.totalTasks++;

    this.emit('task:enqueued', task);

    // Start processing if not already
    this.processLane(lane);

    return promise;
  }

  /**
   * Insert task into array sorted by priority (descending)
   */
  private insertByPriority(queue: Task[], task: Task): void {
    const priority = task.options.priority ?? 0;
    let insertIndex = queue.length;

    for (let i = 0; i < queue.length; i++) {
      if ((queue[i].options.priority ?? 0) < priority) {
        insertIndex = i;
        break;
      }
    }

    queue.splice(insertIndex, 0, task);
  }

  // ==========================================================================
  // Task Processing
  // ==========================================================================

  /**
   * Process tasks in a lane
   */
  private async processLane(lane: Lane): Promise<void> {
    if (lane.processing || lane.paused) {
      return;
    }

    lane.processing = true;

    try {
      while (lane.pending.length > 0 && !lane.paused) {
        // Get next task(s) to execute
        const tasks = this.getNextTasks(lane);

        if (tasks.length === 0) {
          // All pending tasks are serial and something is running
          break;
        }

        // Execute tasks
        await Promise.all(tasks.map(task => this.executeTask(lane, task)));
      }

      // Check if lane is drained
      if (lane.pending.length === 0 && lane.running.length === 0) {
        this.emit('lane:drained', lane.id);
      }
    } finally {
      lane.processing = false;
    }
  }

  /**
   * Get next tasks to execute
   */
  private getNextTasks(lane: Lane): Task[] {
    const tasks: Task[] = [];

    // Count currently running parallel tasks
    const runningParallel = lane.running.filter(t => t.options.parallel).length;

    for (let i = 0; i < lane.pending.length; i++) {
      const task = lane.pending[i];

      if (task.options.parallel) {
        // Parallel task: can run if under limit
        if (runningParallel + tasks.filter(t => t.options.parallel).length < this.config.maxParallel) {
          tasks.push(task);
          lane.pending.splice(i, 1);
          i--;
        }
      } else {
        // Serial task: can only run if nothing else is running
        if (lane.running.length === 0 && tasks.length === 0) {
          tasks.push(task);
          lane.pending.splice(i, 1);
          break; // Only one serial task at a time
        }
      }
    }

    return tasks;
  }

  /**
   * Execute a single task
   */
  private async executeTask(lane: Lane, task: Task): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();
    lane.running.push(task);

    this.emit('task:started', task);

    let attempts = 0;
    const maxAttempts = (task.options.retries ?? 0) + 1;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(task.fn, task.options.timeout!);

        task.status = 'completed';
        task.completedAt = new Date();
        task.result = result;

        // Update stats
        const duration = task.completedAt.getTime() - task.startedAt!.getTime();
        lane.stats.completedTasks++;
        lane.stats.totalDuration += duration;
        lane.stats.averageDuration = lane.stats.totalDuration / lane.stats.completedTasks;

        this.emit('task:completed', task);
        task.resolve(result);

        break; // Success, exit retry loop
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (attempts < maxAttempts && task.options.idempotent) {
          // Retry after delay
          await this.delay(task.options.retryDelay!);
        } else {
          // Final failure
          task.status = 'failed';
          task.completedAt = new Date();
          task.error = err;
          lane.stats.failedTasks++;

          this.emit('task:failed', task, err);
          task.reject(err);
        }
      }
    }

    // Remove from running
    const runningIndex = lane.running.indexOf(task);
    if (runningIndex >= 0) {
      lane.running.splice(runningIndex, 1);
    }

    // Continue processing
    this.processLane(lane);
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // Lane Management
  // ==========================================================================

  /**
   * Get or create a lane
   */
  private getOrCreateLane(laneId: string): Lane {
    let lane = this.lanes.get(laneId);

    if (!lane) {
      lane = {
        id: laneId,
        pending: [],
        running: [],
        paused: false,
        processing: false,
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          totalDuration: 0,
          averageDuration: 0,
        },
      };
      this.lanes.set(laneId, lane);
      this.emit('lane:created', laneId);
    }

    return lane;
  }

  /**
   * Pause a lane
   */
  pause(laneId: string): boolean {
    const lane = this.lanes.get(laneId);
    if (lane && !lane.paused) {
      lane.paused = true;
      this.emit('lane:paused', laneId);
      return true;
    }
    return false;
  }

  /**
   * Resume a lane
   */
  resume(laneId: string): boolean {
    const lane = this.lanes.get(laneId);
    if (lane && lane.paused) {
      lane.paused = false;
      this.emit('lane:resumed', laneId);
      this.processLane(lane);
      return true;
    }
    return false;
  }

  /**
   * Cancel all pending tasks in a lane
   */
  cancelPending(laneId: string): number {
    const lane = this.lanes.get(laneId);
    if (!lane) return 0;

    const cancelled = lane.pending.length;

    for (const task of lane.pending) {
      task.status = 'cancelled';
      task.reject(new Error('Task cancelled'));
      this.emit('task:cancelled', task);
    }

    lane.pending = [];
    return cancelled;
  }

  /**
   * Get lane info
   */
  getLane(laneId: string): Lane | undefined {
    return this.lanes.get(laneId);
  }

  /**
   * List all lanes
   */
  listLanes(): Lane[] {
    return Array.from(this.lanes.values());
  }

  /**
   * Get lane statistics
   */
  getStats(laneId: string): LaneStats | undefined {
    return this.lanes.get(laneId)?.stats;
  }

  /**
   * Get global statistics
   */
  getGlobalStats(): LaneStats {
    const stats: LaneStats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalDuration: 0,
      averageDuration: 0,
    };

    for (const lane of this.lanes.values()) {
      stats.totalTasks += lane.stats.totalTasks;
      stats.completedTasks += lane.stats.completedTasks;
      stats.failedTasks += lane.stats.failedTasks;
      stats.totalDuration += lane.stats.totalDuration;
    }

    if (stats.completedTasks > 0) {
      stats.averageDuration = stats.totalDuration / stats.completedTasks;
    }

    return stats;
  }

  /**
   * Remove a lane
   */
  removeLane(laneId: string): boolean {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    // Cancel pending tasks
    this.cancelPending(laneId);

    return this.lanes.delete(laneId);
  }

  /**
   * Clear all lanes
   */
  clear(): void {
    for (const laneId of this.lanes.keys()) {
      this.cancelPending(laneId);
    }
    this.lanes.clear();
  }

  /**
   * Format queue status
   */
  formatStatus(): string {
    const lines: string[] = ['Lane Queue Status:', ''];

    for (const lane of this.lanes.values()) {
      const status = lane.paused ? 'PAUSED' : 'ACTIVE';
      lines.push(`[${lane.id}] ${status}`);
      lines.push(`  Pending: ${lane.pending.length}, Running: ${lane.running.length}`);
      lines.push(`  Completed: ${lane.stats.completedTasks}, Failed: ${lane.stats.failedTasks}`);
      lines.push(`  Avg Duration: ${lane.stats.averageDuration.toFixed(0)}ms`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Singleton
// ============================================================================

let queueInstance: LaneQueue | null = null;

export function getLaneQueue(config?: Partial<LaneQueueConfig>): LaneQueue {
  if (!queueInstance) {
    queueInstance = new LaneQueue(config);
  }
  return queueInstance;
}

export function resetLaneQueue(): void {
  if (queueInstance) {
    queueInstance.clear();
  }
  queueInstance = null;
}

export default LaneQueue;
