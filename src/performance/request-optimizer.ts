/**
 * Request Optimizer
 *
 * Optimizes API requests through:
 * - Request batching
 * - Deduplication of concurrent requests
 * - Retry with exponential backoff
 * - Request prioritization
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface RequestConfig {
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Batch window in ms */
  batchWindowMs: number;
  /** Maximum retries */
  maxRetries: number;
  /** Base delay for exponential backoff */
  retryBaseDelayMs: number;
  /** Request timeout */
  timeoutMs: number;
  /** Enable request deduplication */
  deduplicate: boolean;
}

export interface PendingRequest<T = unknown> {
  id: string;
  key: string;
  priority: number;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries: number;
  createdAt: number;
}

export interface RequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  deduplicatedRequests: number;
  averageLatency: number;
  currentConcurrency: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: RequestConfig = {
  maxConcurrent: 5,
  batchWindowMs: 50,
  maxRetries: 3,
  retryBaseDelayMs: 1000,
  timeoutMs: 30000,
  deduplicate: true,
};

// ============================================================================
// Request Optimizer Class
// ============================================================================

export class RequestOptimizer extends EventEmitter {
  private config: RequestConfig;
  private queue: PendingRequest[] = [];
  private running: Map<string, PendingRequest> = new Map();
  private pendingDedup: Map<string, Promise<unknown>> = new Map();
  private stats: RequestStats;
  private latencies: number[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private processing: boolean = false;

  constructor(config: Partial<RequestConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      deduplicatedRequests: 0,
      averageLatency: 0,
      currentConcurrency: 0,
    };
  }

  /**
   * Execute a request with optimization
   */
  async execute<T>(
    key: string,
    executeFn: () => Promise<T>,
    options: { priority?: number; deduplicate?: boolean } = {}
  ): Promise<T> {
    const { priority = 0, deduplicate = this.config.deduplicate } = options;

    // Check for duplicate pending request
    if (deduplicate && this.pendingDedup.has(key)) {
      this.stats.deduplicatedRequests++;
      this.emit('deduplicated', { key });
      return this.pendingDedup.get(key) as Promise<T>;
    }

    // Create pending request
    const promise = new Promise<T>((resolve, reject) => {
      const request: PendingRequest<T> = {
        id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        key,
        priority,
        execute: executeFn,
        resolve: resolve as (value: unknown) => void,
        reject,
        retries: 0,
        createdAt: Date.now(),
      };

      this.queue.push(request as PendingRequest);
      this.stats.totalRequests++;
    });

    // Track for deduplication
    if (deduplicate) {
      this.pendingDedup.set(key, promise);
      promise.finally(() => this.pendingDedup.delete(key));
    }

    // Schedule batch processing
    this.scheduleBatchProcess();

    return promise;
  }

  /**
   * Execute immediately without queuing
   */
  async executeImmediate<T>(
    executeFn: () => Promise<T>,
    options: { retries?: number; timeout?: number } = {}
  ): Promise<T> {
    const { retries = this.config.maxRetries, timeout = this.config.timeoutMs } = options;

    return this.executeWithRetry(executeFn, retries, timeout);
  }

  /**
   * Get current statistics
   */
  getStats(): RequestStats {
    return {
      ...this.stats,
      currentConcurrency: this.running.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      deduplicatedRequests: 0,
      averageLatency: 0,
      currentConcurrency: 0,
    };
    this.latencies = [];
  }

  /**
   * Clear pending requests
   */
  clear(): void {
    for (const request of this.queue) {
      request.reject(new Error('Request cancelled'));
    }
    this.queue = [];
    this.pendingDedup.clear();

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    running: number;
    maxConcurrent: number;
  } {
    return {
      pending: this.queue.length,
      running: this.running.size,
      maxConcurrent: this.config.maxConcurrent,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private scheduleBatchProcess(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null;
      this.processQueue();
    }, this.config.batchWindowMs);
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // Sort by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);

      while (this.queue.length > 0 && this.running.size < this.config.maxConcurrent) {
        const request = this.queue.shift();
        if (!request) continue;

        this.running.set(request.id, request);
        this.stats.currentConcurrency = this.running.size;

        this.processRequest(request).finally(() => {
          this.running.delete(request.id);
          this.stats.currentConcurrency = this.running.size;

          // Continue processing if queue has items
          if (this.queue.length > 0) {
            this.processQueue();
          }
        });
      }
    } finally {
      this.processing = false;
    }
  }

  private async processRequest(request: PendingRequest): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await this.executeWithRetry(
        request.execute,
        this.config.maxRetries - request.retries,
        this.config.timeoutMs
      );

      const latency = Date.now() - startTime;
      this.recordLatency(latency);

      this.stats.successfulRequests++;
      request.resolve(result);

      this.emit('success', {
        key: request.key,
        latency,
        retries: request.retries,
      });
    } catch (error) {
      this.stats.failedRequests++;
      request.reject(error as Error);

      this.emit('failure', {
        key: request.key,
        error,
        retries: request.retries,
      });
    }
  }

  private async executeWithRetry<T>(
    executeFn: () => Promise<T>,
    maxRetries: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Execute with timeout
        const result = await this.withTimeout(executeFn(), timeout);
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          this.stats.retriedRequests++;

          // Exponential backoff
          const delay = this.config.retryBaseDelayMs * Math.pow(2, attempt);
          await this.delay(delay);

          this.emit('retry', { attempt: attempt + 1, maxRetries, error });
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);

    // Keep only last 100 latencies
    if (this.latencies.length > 100) {
      this.latencies = this.latencies.slice(-100);
    }

    // Update average
    this.stats.averageLatency =
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let optimizerInstance: RequestOptimizer | null = null;

export function getRequestOptimizer(config?: Partial<RequestConfig>): RequestOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new RequestOptimizer(config);
  }
  return optimizerInstance;
}

export function resetRequestOptimizer(): void {
  if (optimizerInstance) {
    optimizerInstance.clear();
  }
  optimizerInstance = null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Execute multiple requests in parallel with concurrency limit
 */
export async function executeParallel<T>(
  requests: Array<{ key: string; execute: () => Promise<T>; priority?: number }>,
  options: { maxConcurrent?: number } = {}
): Promise<Map<string, T | Error>> {
  const optimizer = getRequestOptimizer({
    maxConcurrent: options.maxConcurrent || 5,
  });

  const results = new Map<string, T | Error>();

  await Promise.all(
    requests.map(async (req) => {
      try {
        const result = await optimizer.execute(req.key, req.execute, {
          priority: req.priority,
        });
        results.set(req.key, result);
      } catch (error) {
        results.set(req.key, error as Error);
      }
    })
  );

  return results;
}

/**
 * Batch requests with automatic deduplication
 */
export function batchRequests<T, K extends string>(
  keys: K[],
  batchFn: (keys: K[]) => Promise<Map<K, T>>
): Promise<Map<K, T>> {
  const optimizer = getRequestOptimizer();
  const batchKey = keys.sort().join(',');

  return optimizer.execute(batchKey, () => batchFn(keys));
}
