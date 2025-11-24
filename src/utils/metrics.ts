/**
 * Performance Metrics Module for Grok CLI
 * Tracks execution times, resource usage, and operational metrics
 */

import { EventEmitter } from 'events';
import { logger } from './logger.js';

/**
 * Metric types supported by the system
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

/**
 * Individual metric entry
 */
export interface MetricEntry {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

/**
 * Timer result with duration and metadata
 */
export interface TimerResult {
  name: string;
  durationMs: number;
  startTime: number;
  endTime: number;
  labels?: Record<string, string>;
}

/**
 * Histogram statistics
 */
export interface HistogramStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * Aggregated metrics summary
 */
export interface MetricsSummary {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramStats>;
  timers: Record<string, HistogramStats>;
  startTime: number;
  endTime: number;
  durationMs: number;
}

/**
 * Metrics collector configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  flushIntervalMs: number;
  maxHistorySize: number;
  emitEvents: boolean;
}

const DEFAULT_CONFIG: MetricsConfig = {
  enabled: true,
  flushIntervalMs: 60000,
  maxHistorySize: 10000,
  emitEvents: true,
};

/**
 * PerformanceMetrics class for tracking application metrics
 */
export class PerformanceMetrics extends EventEmitter {
  private config: MetricsConfig;
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private timers: Map<string, number[]> = new Map();
  private activeTimers: Map<string, { startTime: number; labels?: Record<string, string> }> = new Map();
  private history: MetricEntry[] = [];
  private startTime: number = Date.now();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<MetricsConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.flushIntervalMs > 0) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, this.config.flushIntervalMs);
    }
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    const newValue = current + value;
    this.counters.set(key, newValue);

    this.recordEntry({ name, type: 'counter', value: newValue, timestamp: Date.now(), labels });
    this.emitMetric('counter', name, newValue, labels);
  }

  /**
   * Decrement a counter metric
   */
  decrement(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.increment(name, -value, labels);
  }

  /**
   * Set a gauge metric value
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);

    this.recordEntry({ name, type: 'gauge', value, timestamp: Date.now(), labels });
    this.emitMetric('gauge', name, value, labels);
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    this.recordEntry({ name, type: 'histogram', value, timestamp: Date.now(), labels });
    this.emitMetric('histogram', name, value, labels);
  }

  /**
   * Start a timer
   */
  startTimer(name: string, labels?: Record<string, string>): string {
    const timerId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeTimers.set(timerId, { startTime: Date.now(), labels });
    return timerId;
  }

  /**
   * Stop a timer and record the duration
   */
  stopTimer(timerId: string): TimerResult | null {
    const timer = this.activeTimers.get(timerId);
    if (!timer) {
      logger.warn('Timer not found', { timerId });
      return null;
    }

    this.activeTimers.delete(timerId);
    const endTime = Date.now();
    const durationMs = endTime - timer.startTime;

    // Extract name from timer ID
    const name = timerId.split('_').slice(0, -2).join('_');

    // Record in timers histogram
    const key = this.buildKey(name, timer.labels);
    const values = this.timers.get(key) || [];
    values.push(durationMs);
    this.timers.set(key, values);

    this.recordEntry({ name, type: 'timer', value: durationMs, timestamp: endTime, labels: timer.labels });
    this.emitMetric('timer', name, durationMs, timer.labels);

    return {
      name,
      durationMs,
      startTime: timer.startTime,
      endTime,
      labels: timer.labels,
    };
  }

  /**
   * Time a function execution
   */
  async time<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    const timerId = this.startTimer(name, labels);
    try {
      return await fn();
    } finally {
      this.stopTimer(timerId);
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync<T>(name: string, fn: () => T, labels?: Record<string, string>): T {
    const timerId = this.startTimer(name, labels);
    try {
      return fn();
    } finally {
      this.stopTimer(timerId);
    }
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.buildKey(name, labels);
    return this.counters.get(key) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number | undefined {
    const key = this.buildKey(name, labels);
    return this.gauges.get(key);
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, labels?: Record<string, string>): HistogramStats | null {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key);
    if (!values || values.length === 0) return null;
    return this.calculateStats(values);
  }

  /**
   * Get timer statistics
   */
  getTimerStats(name: string, labels?: Record<string, string>): HistogramStats | null {
    const key = this.buildKey(name, labels);
    const values = this.timers.get(key);
    if (!values || values.length === 0) return null;
    return this.calculateStats(values);
  }

  /**
   * Get all metrics summary
   */
  getSummary(): MetricsSummary {
    const endTime = Date.now();

    const counters: Record<string, number> = {};
    this.counters.forEach((value, key) => {
      counters[key] = value;
    });

    const gauges: Record<string, number> = {};
    this.gauges.forEach((value, key) => {
      gauges[key] = value;
    });

    const histograms: Record<string, HistogramStats> = {};
    this.histograms.forEach((values, key) => {
      if (values.length > 0) {
        histograms[key] = this.calculateStats(values);
      }
    });

    const timers: Record<string, HistogramStats> = {};
    this.timers.forEach((values, key) => {
      if (values.length > 0) {
        timers[key] = this.calculateStats(values);
      }
    });

    return {
      counters,
      gauges,
      histograms,
      timers,
      startTime: this.startTime,
      endTime,
      durationMs: endTime - this.startTime,
    };
  }

  /**
   * Get metrics history
   */
  getHistory(limit?: number): MetricEntry[] {
    const entries = [...this.history];
    if (limit) {
      return entries.slice(-limit);
    }
    return entries;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
    this.activeTimers.clear();
    this.history = [];
    this.startTime = Date.now();
    logger.debug('Metrics reset');
  }

  /**
   * Flush metrics (emit summary event)
   */
  flush(): void {
    if (!this.config.enabled) return;

    const summary = this.getSummary();
    this.emit('flush', summary);
    logger.debug('Metrics flushed', {
      counters: Object.keys(summary.counters).length,
      gauges: Object.keys(summary.gauges).length,
      histograms: Object.keys(summary.histograms).length,
      timers: Object.keys(summary.timers).length,
    });
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
    this.removeAllListeners();
  }

  /**
   * Build a unique key from name and labels
   */
  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const sortedLabels = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${sortedLabels}}`;
  }

  /**
   * Record a metric entry in history
   */
  private recordEntry(entry: MetricEntry): void {
    this.history.push(entry);
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Emit a metric event
   */
  private emitMetric(type: MetricType, name: string, value: number, labels?: Record<string, string>): void {
    if (this.config.emitEvents) {
      this.emit('metric', { type, name, value, labels, timestamp: Date.now() });
    }
  }

  /**
   * Calculate histogram statistics
   */
  private calculateStats(values: number[]): HistogramStats {
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      sum,
      min: sorted[0],
      max: sorted[count - 1],
      mean: sum / count,
      p50: this.percentile(sorted, 50),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  /**
   * Calculate percentile value
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

// Singleton instance
let metricsInstance: PerformanceMetrics | null = null;

/**
 * Get the singleton metrics instance
 */
export function getMetrics(): PerformanceMetrics {
  if (!metricsInstance) {
    metricsInstance = new PerformanceMetrics();
  }
  return metricsInstance;
}

/**
 * Create a new metrics instance
 */
export function createMetrics(config?: Partial<MetricsConfig>): PerformanceMetrics {
  return new PerformanceMetrics(config);
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetMetrics(): void {
  if (metricsInstance) {
    metricsInstance.dispose();
    metricsInstance = null;
  }
}

/**
 * Predefined metric names for consistency
 */
export const MetricNames = {
  // Tool execution metrics
  TOOL_EXECUTION: 'tool.execution',
  TOOL_SUCCESS: 'tool.success',
  TOOL_FAILURE: 'tool.failure',
  TOOL_DURATION: 'tool.duration',

  // API metrics
  API_REQUEST: 'api.request',
  API_RESPONSE_TIME: 'api.response_time',
  API_ERROR: 'api.error',
  API_TOKENS_USED: 'api.tokens_used',

  // File operation metrics
  FILE_READ: 'file.read',
  FILE_WRITE: 'file.write',
  FILE_EDIT: 'file.edit',

  // Search metrics
  SEARCH_QUERY: 'search.query',
  SEARCH_RESULTS: 'search.results',
  SEARCH_DURATION: 'search.duration',

  // Agent metrics
  AGENT_TURN: 'agent.turn',
  AGENT_SESSION: 'agent.session',
  AGENT_MEMORY_USAGE: 'agent.memory_usage',

  // Command metrics
  COMMAND_EXECUTION: 'command.execution',
  COMMAND_DURATION: 'command.duration',

  // Cache metrics
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
};

/**
 * Convenience methods for common metrics
 */
export const metrics = {
  increment: (name: string, value?: number, labels?: Record<string, string>) =>
    getMetrics().increment(name, value, labels),

  gauge: (name: string, value: number, labels?: Record<string, string>) =>
    getMetrics().gauge(name, value, labels),

  histogram: (name: string, value: number, labels?: Record<string, string>) =>
    getMetrics().histogram(name, value, labels),

  startTimer: (name: string, labels?: Record<string, string>) =>
    getMetrics().startTimer(name, labels),

  stopTimer: (timerId: string) =>
    getMetrics().stopTimer(timerId),

  time: <T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>) =>
    getMetrics().time(name, fn, labels),

  timeSync: <T>(name: string, fn: () => T, labels?: Record<string, string>) =>
    getMetrics().timeSync(name, fn, labels),

  getSummary: () =>
    getMetrics().getSummary(),

  // Tool-specific helpers
  recordToolExecution: (toolName: string, success: boolean, durationMs: number) => {
    const m = getMetrics();
    m.increment(MetricNames.TOOL_EXECUTION, 1, { tool: toolName });
    m.increment(success ? MetricNames.TOOL_SUCCESS : MetricNames.TOOL_FAILURE, 1, { tool: toolName });
    m.histogram(MetricNames.TOOL_DURATION, durationMs, { tool: toolName });
  },

  recordApiCall: (model: string, tokensUsed: number, durationMs: number, success: boolean) => {
    const m = getMetrics();
    m.increment(MetricNames.API_REQUEST, 1, { model });
    m.histogram(MetricNames.API_RESPONSE_TIME, durationMs, { model });
    m.histogram(MetricNames.API_TOKENS_USED, tokensUsed, { model });
    if (!success) {
      m.increment(MetricNames.API_ERROR, 1, { model });
    }
  },

  recordSearch: (queryType: string, resultsCount: number, durationMs: number) => {
    const m = getMetrics();
    m.increment(MetricNames.SEARCH_QUERY, 1, { type: queryType });
    m.histogram(MetricNames.SEARCH_RESULTS, resultsCount, { type: queryType });
    m.histogram(MetricNames.SEARCH_DURATION, durationMs, { type: queryType });
  },

  recordCacheAccess: (hit: boolean, cacheName: string) => {
    const m = getMetrics();
    m.increment(hit ? MetricNames.CACHE_HIT : MetricNames.CACHE_MISS, 1, { cache: cacheName });
  },
};

export default PerformanceMetrics;
