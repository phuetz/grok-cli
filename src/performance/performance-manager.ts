/**
 * Performance Manager
 *
 * Central orchestrator for all performance optimizations:
 * - Coordinates lazy loading, caching, and request optimization
 * - Provides unified API for performance monitoring
 * - Manages performance budgets and thresholds
 */

import { EventEmitter } from 'events';
import { LazyLoader, getLazyLoader, initializeLazyLoader, LoadMetrics } from './lazy-loader.js';
import { ToolCache, getToolCache, ToolCacheStats } from './tool-cache.js';
import { RequestOptimizer, getRequestOptimizer, RequestStats } from './request-optimizer.js';
import { SemanticCache, getApiCache } from '../utils/semantic-cache.js';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceConfig {
  /** Enable performance optimizations */
  enabled: boolean;
  /** Enable lazy loading */
  lazyLoading: boolean;
  /** Enable tool caching */
  toolCaching: boolean;
  /** Enable request optimization */
  requestOptimization: boolean;
  /** Enable API caching */
  apiCaching: boolean;
  /** Performance budget in ms */
  budgetMs: number;
  /** Enable performance logging */
  enableMetrics: boolean;
  /** Metrics retention count */
  metricsRetention: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  cached: boolean;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface PerformanceSummary {
  lazyLoader: {
    totalModules: number;
    loadedModules: number;
    totalLoadTime: number;
    averageLoadTime: number;
  };
  toolCache: ToolCacheStats;
  requestOptimizer: RequestStats;
  apiCache: {
    hits: number;
    misses: number;
    hitRate: number;
    entries: number;
  };
  overall: {
    totalOperations: number;
    cachedOperations: number;
    cacheHitRate: number;
    averageDuration: number;
    estimatedTimeSaved: number;
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: true,
  lazyLoading: true,
  toolCaching: true,
  requestOptimization: true,
  apiCaching: true,
  budgetMs: 5000, // 5 second budget
  enableMetrics: true,
  metricsRetention: 1000,
};

// ============================================================================
// Performance Manager Class
// ============================================================================

export class PerformanceManager extends EventEmitter {
  private config: PerformanceConfig;
  private lazyLoader: LazyLoader | null = null;
  private toolCache: ToolCache | null = null;
  private requestOptimizer: RequestOptimizer | null = null;
  private apiCache: SemanticCache<unknown> | null = null;
  private metrics: PerformanceMetrics[] = [];
  private initialized: boolean = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize all performance systems
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.lazyLoading) {
      this.lazyLoader = initializeLazyLoader();
      this.setupLazyLoaderEvents();
    }

    if (this.config.toolCaching) {
      this.toolCache = getToolCache();
      this.setupToolCacheEvents();
    }

    if (this.config.requestOptimization) {
      this.requestOptimizer = getRequestOptimizer();
      this.setupRequestOptimizerEvents();
    }

    if (this.config.apiCaching) {
      this.apiCache = getApiCache();
    }

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp'>): void {
    if (!this.config.enableMetrics) return;

    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Trim old metrics
    if (this.metrics.length > this.config.metricsRetention) {
      this.metrics = this.metrics.slice(-this.config.metricsRetention);
    }

    this.emit('metric', fullMetric);

    // Check budget
    if (metric.duration > this.config.budgetMs) {
      this.emit('budget:exceeded', {
        operation: metric.operation,
        duration: metric.duration,
        budget: this.config.budgetMs,
      });
    }
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;

    try {
      return await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      this.recordMetric({
        operation,
        duration: Date.now() - startTime,
        cached: false,
        success,
        metadata,
      });
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    const lazyLoaderStats = this.lazyLoader?.getStats() || {
      totalModules: 0,
      loadedModules: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
    };

    const toolCacheStats = this.toolCache?.getStats() || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      savedCalls: 0,
      savedTime: 0,
    };

    const requestOptimizerStats = this.requestOptimizer?.getStats() || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      deduplicatedRequests: 0,
      averageLatency: 0,
      currentConcurrency: 0,
    };

    const apiCacheStats = this.apiCache?.getStats() || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      avgSimilarity: 0,
      semanticHits: 0,
      exactHits: 0,
      evictions: 0,
    };

    // Calculate overall stats
    const cachedOps = this.metrics.filter((m) => m.cached).length;
    const totalOps = this.metrics.length;
    const avgDuration =
      totalOps > 0
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOps
        : 0;

    return {
      lazyLoader: lazyLoaderStats,
      toolCache: toolCacheStats,
      requestOptimizer: requestOptimizerStats,
      apiCache: {
        hits: apiCacheStats.hits,
        misses: apiCacheStats.misses,
        hitRate: apiCacheStats.hitRate,
        entries: apiCacheStats.totalEntries,
      },
      overall: {
        totalOperations: totalOps,
        cachedOperations: cachedOps,
        cacheHitRate: totalOps > 0 ? cachedOps / totalOps : 0,
        averageDuration: avgDuration,
        estimatedTimeSaved:
          toolCacheStats.savedTime +
          requestOptimizerStats.deduplicatedRequests * 500, // Estimate 500ms per deduplicated request
      },
    };
  }

  /**
   * Get recent metrics
   */
  getMetrics(limit?: number): PerformanceMetrics[] {
    const metrics = [...this.metrics];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get slow operations
   */
  getSlowOperations(thresholdMs: number = 1000): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.duration > thresholdMs);
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.toolCache?.clear();
    this.apiCache?.clear();
    this.emit('caches:cleared');
  }

  /**
   * Invalidate caches for a file
   */
  invalidateForFile(filePath: string): void {
    this.toolCache?.invalidateForFile(filePath);
    this.emit('cache:invalidated', { filePath });
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.metrics = [];
    this.toolCache?.resetStats();
    this.requestOptimizer?.resetStats();
    this.emit('stats:reset');
  }

  /**
   * Get lazy loader instance
   */
  getLazyLoader(): LazyLoader | null {
    return this.lazyLoader;
  }

  /**
   * Get tool cache instance
   */
  getToolCache(): ToolCache | null {
    return this.toolCache;
  }

  /**
   * Get request optimizer instance
   */
  getRequestOptimizer(): RequestOptimizer | null {
    return this.requestOptimizer;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.lazyLoader?.clear();
    this.toolCache?.dispose();
    this.requestOptimizer?.clear();
    this.apiCache?.dispose();
    this.removeAllListeners();
    this.initialized = false;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupLazyLoaderEvents(): void {
    if (!this.lazyLoader) return;

    this.lazyLoader.on('module:loaded', ({ name, loadTime }) => {
      this.recordMetric({
        operation: `lazy:${name}`,
        duration: loadTime,
        cached: false,
        success: true,
      });
    });

    this.lazyLoader.on('module:error', ({ name, error }) => {
      this.emit('error', { source: 'lazyLoader', name, error });
    });
  }

  private setupToolCacheEvents(): void {
    if (!this.toolCache) return;

    this.toolCache.on('hit', ({ key }) => {
      this.recordMetric({
        operation: `cache:hit:${key}`,
        duration: 0,
        cached: true,
        success: true,
      });
    });

    this.toolCache.on('miss', ({ key }) => {
      this.recordMetric({
        operation: `cache:miss:${key}`,
        duration: 0,
        cached: false,
        success: true,
      });
    });
  }

  private setupRequestOptimizerEvents(): void {
    if (!this.requestOptimizer) return;

    this.requestOptimizer.on('success', ({ key, latency }) => {
      this.recordMetric({
        operation: `request:${key}`,
        duration: latency,
        cached: false,
        success: true,
      });
    });

    this.requestOptimizer.on('failure', ({ key, error }) => {
      this.emit('error', { source: 'requestOptimizer', key, error });
    });

    this.requestOptimizer.on('deduplicated', ({ key }) => {
      this.recordMetric({
        operation: `request:dedup:${key}`,
        duration: 0,
        cached: true,
        success: true,
      });
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: PerformanceManager | null = null;

export function getPerformanceManager(
  config?: Partial<PerformanceConfig>
): PerformanceManager {
  if (!managerInstance) {
    managerInstance = new PerformanceManager(config);
  }
  return managerInstance;
}

export async function initializePerformanceManager(
  config?: Partial<PerformanceConfig>
): Promise<PerformanceManager> {
  const manager = getPerformanceManager(config);
  await manager.initialize();
  return manager;
}

export function resetPerformanceManager(): void {
  if (managerInstance) {
    managerInstance.dispose();
  }
  managerInstance = null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Measure an async operation with automatic recording
 */
export async function measureOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const manager = getPerformanceManager();
  return manager.measure(operation, fn, metadata);
}

/**
 * Get a quick performance summary
 */
export function getPerformanceSummary(): PerformanceSummary {
  return getPerformanceManager().getSummary();
}
