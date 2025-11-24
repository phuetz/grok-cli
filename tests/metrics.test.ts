/**
 * Tests for Performance Metrics Module
 */

import {
  PerformanceMetrics,
  createMetrics,
  resetMetrics,
  getMetrics,
  metrics,
  MetricNames,
} from '../src/utils/metrics';

describe('PerformanceMetrics', () => {
  let metricsInstance: PerformanceMetrics;

  beforeEach(() => {
    resetMetrics();
    metricsInstance = createMetrics({ enabled: true, emitEvents: false, flushIntervalMs: 0 });
  });

  afterEach(() => {
    metricsInstance.dispose();
  });

  describe('Counter operations', () => {
    it('should increment a counter', () => {
      metricsInstance.increment('test.counter');
      expect(metricsInstance.getCounter('test.counter')).toBe(1);
    });

    it('should increment a counter by custom value', () => {
      metricsInstance.increment('test.counter', 5);
      expect(metricsInstance.getCounter('test.counter')).toBe(5);
    });

    it('should accumulate counter values', () => {
      metricsInstance.increment('test.counter', 3);
      metricsInstance.increment('test.counter', 2);
      expect(metricsInstance.getCounter('test.counter')).toBe(5);
    });

    it('should decrement a counter', () => {
      metricsInstance.increment('test.counter', 10);
      metricsInstance.decrement('test.counter', 3);
      expect(metricsInstance.getCounter('test.counter')).toBe(7);
    });

    it('should handle counters with labels', () => {
      metricsInstance.increment('test.counter', 1, { tool: 'bash' });
      metricsInstance.increment('test.counter', 1, { tool: 'search' });
      expect(metricsInstance.getCounter('test.counter', { tool: 'bash' })).toBe(1);
      expect(metricsInstance.getCounter('test.counter', { tool: 'search' })).toBe(1);
    });

    it('should return 0 for non-existent counters', () => {
      expect(metricsInstance.getCounter('non.existent')).toBe(0);
    });
  });

  describe('Gauge operations', () => {
    it('should set a gauge value', () => {
      metricsInstance.gauge('test.gauge', 42);
      expect(metricsInstance.getGauge('test.gauge')).toBe(42);
    });

    it('should overwrite gauge values', () => {
      metricsInstance.gauge('test.gauge', 10);
      metricsInstance.gauge('test.gauge', 20);
      expect(metricsInstance.getGauge('test.gauge')).toBe(20);
    });

    it('should handle gauges with labels', () => {
      metricsInstance.gauge('memory.usage', 100, { process: 'main' });
      metricsInstance.gauge('memory.usage', 50, { process: 'worker' });
      expect(metricsInstance.getGauge('memory.usage', { process: 'main' })).toBe(100);
      expect(metricsInstance.getGauge('memory.usage', { process: 'worker' })).toBe(50);
    });

    it('should return undefined for non-existent gauges', () => {
      expect(metricsInstance.getGauge('non.existent')).toBeUndefined();
    });
  });

  describe('Histogram operations', () => {
    it('should record histogram values', () => {
      metricsInstance.histogram('test.histogram', 10);
      metricsInstance.histogram('test.histogram', 20);
      metricsInstance.histogram('test.histogram', 30);

      const stats = metricsInstance.getHistogramStats('test.histogram');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.sum).toBe(60);
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(30);
      expect(stats!.mean).toBe(20);
    });

    it('should calculate percentiles correctly', () => {
      // Add 100 values from 1 to 100
      for (let i = 1; i <= 100; i++) {
        metricsInstance.histogram('percentile.test', i);
      }

      const stats = metricsInstance.getHistogramStats('percentile.test');
      expect(stats).not.toBeNull();
      expect(stats!.p50).toBe(50);
      expect(stats!.p90).toBe(90);
      expect(stats!.p95).toBe(95);
      expect(stats!.p99).toBe(99);
    });

    it('should return null for non-existent histograms', () => {
      expect(metricsInstance.getHistogramStats('non.existent')).toBeNull();
    });
  });

  describe('Timer operations', () => {
    it('should start and stop a timer', async () => {
      const timerId = metricsInstance.startTimer('test.operation');
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = metricsInstance.stopTimer(timerId);

      expect(result).not.toBeNull();
      expect(result!.durationMs).toBeGreaterThanOrEqual(40);
      expect(result!.name).toBe('test.operation');
    });

    it('should record timer in stats', async () => {
      const timerId = metricsInstance.startTimer('test.operation');
      await new Promise(resolve => setTimeout(resolve, 10));
      metricsInstance.stopTimer(timerId);

      const stats = metricsInstance.getTimerStats('test.operation');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });

    it('should return null for invalid timer ID', () => {
      const result = metricsInstance.stopTimer('invalid-timer-id');
      expect(result).toBeNull();
    });

    it('should time async functions', async () => {
      const result = await metricsInstance.time('async.operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return 'done';
      });

      expect(result).toBe('done');
      const stats = metricsInstance.getTimerStats('async.operation');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });

    it('should time sync functions', () => {
      const result = metricsInstance.timeSync('sync.operation', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      });

      expect(result).toBe(499500);
      const stats = metricsInstance.getTimerStats('sync.operation');
      expect(stats).not.toBeNull();
    });

    it('should handle timers with labels', async () => {
      const timerId = metricsInstance.startTimer('tool.execution', { tool: 'bash' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const result = metricsInstance.stopTimer(timerId);

      expect(result!.labels).toEqual({ tool: 'bash' });
    });
  });

  describe('Summary and history', () => {
    it('should generate a complete summary', () => {
      metricsInstance.increment('test.counter', 5);
      metricsInstance.gauge('test.gauge', 42);
      metricsInstance.histogram('test.histogram', 100);

      const summary = metricsInstance.getSummary();

      expect(summary.counters['test.counter']).toBe(5);
      expect(summary.gauges['test.gauge']).toBe(42);
      expect(summary.histograms['test.histogram']).toBeDefined();
      expect(summary.startTime).toBeLessThanOrEqual(summary.endTime);
      expect(summary.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should maintain history', () => {
      metricsInstance.increment('test.counter');
      metricsInstance.gauge('test.gauge', 10);

      const history = metricsInstance.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].name).toBe('test.counter');
      expect(history[1].name).toBe('test.gauge');
    });

    it('should limit history size', () => {
      const limitedMetrics = createMetrics({ maxHistorySize: 5, emitEvents: false, flushIntervalMs: 0 });

      for (let i = 0; i < 10; i++) {
        limitedMetrics.increment('test.counter');
      }

      const history = limitedMetrics.getHistory();
      expect(history.length).toBe(5);

      limitedMetrics.dispose();
    });

    it('should get limited history', () => {
      for (let i = 0; i < 10; i++) {
        metricsInstance.increment('test.counter');
      }

      const history = metricsInstance.getHistory(3);
      expect(history.length).toBe(3);
    });
  });

  describe('Reset and disable', () => {
    it('should reset all metrics', () => {
      metricsInstance.increment('test.counter', 10);
      metricsInstance.gauge('test.gauge', 42);
      metricsInstance.histogram('test.histogram', 100);

      metricsInstance.reset();

      expect(metricsInstance.getCounter('test.counter')).toBe(0);
      expect(metricsInstance.getGauge('test.gauge')).toBeUndefined();
      expect(metricsInstance.getHistogramStats('test.histogram')).toBeNull();
      expect(metricsInstance.getHistory().length).toBe(0);
    });

    it('should not record metrics when disabled', () => {
      const disabledMetrics = createMetrics({ enabled: false, flushIntervalMs: 0 });

      disabledMetrics.increment('test.counter');
      expect(disabledMetrics.getCounter('test.counter')).toBe(0);

      disabledMetrics.dispose();
    });
  });

  describe('Events', () => {
    it('should emit metric events when enabled', (done) => {
      const eventMetrics = createMetrics({ enabled: true, emitEvents: true, flushIntervalMs: 0 });

      eventMetrics.on('metric', (data) => {
        expect(data.name).toBe('test.counter');
        expect(data.value).toBe(1);
        eventMetrics.dispose();
        done();
      });

      eventMetrics.increment('test.counter');
    });

    it('should emit flush events', (done) => {
      metricsInstance.on('flush', (summary) => {
        expect(summary.counters).toBeDefined();
        done();
      });

      metricsInstance.increment('test.counter');
      metricsInstance.flush();
    });
  });
});

describe('Singleton metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should return the same instance', () => {
    const instance1 = getMetrics();
    const instance2 = getMetrics();
    expect(instance1).toBe(instance2);
  });

  it('should reset and create new instance', () => {
    const instance1 = getMetrics();
    instance1.increment('test');
    resetMetrics();
    const instance2 = getMetrics();
    expect(instance2.getCounter('test')).toBe(0);
  });
});

describe('Convenience metrics object', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should increment counter', () => {
    metrics.increment('test.counter');
    expect(getMetrics().getCounter('test.counter')).toBe(1);
  });

  it('should set gauge', () => {
    metrics.gauge('test.gauge', 42);
    expect(getMetrics().getGauge('test.gauge')).toBe(42);
  });

  it('should record tool execution', () => {
    metrics.recordToolExecution('bash', true, 100);

    const instance = getMetrics();
    expect(instance.getCounter(MetricNames.TOOL_EXECUTION, { tool: 'bash' })).toBe(1);
    expect(instance.getCounter(MetricNames.TOOL_SUCCESS, { tool: 'bash' })).toBe(1);
  });

  it('should record API call', () => {
    metrics.recordApiCall('gpt-4', 1000, 500, true);

    const instance = getMetrics();
    expect(instance.getCounter(MetricNames.API_REQUEST, { model: 'gpt-4' })).toBe(1);
  });

  it('should record search metrics', () => {
    metrics.recordSearch('text', 10, 50);

    const instance = getMetrics();
    expect(instance.getCounter(MetricNames.SEARCH_QUERY, { type: 'text' })).toBe(1);
  });

  it('should record cache access', () => {
    metrics.recordCacheAccess(true, 'search');
    metrics.recordCacheAccess(false, 'search');

    const instance = getMetrics();
    expect(instance.getCounter(MetricNames.CACHE_HIT, { cache: 'search' })).toBe(1);
    expect(instance.getCounter(MetricNames.CACHE_MISS, { cache: 'search' })).toBe(1);
  });
});

describe('MetricNames constants', () => {
  it('should have all expected metric names', () => {
    expect(MetricNames.TOOL_EXECUTION).toBe('tool.execution');
    expect(MetricNames.API_REQUEST).toBe('api.request');
    expect(MetricNames.FILE_READ).toBe('file.read');
    expect(MetricNames.SEARCH_QUERY).toBe('search.query');
    expect(MetricNames.AGENT_TURN).toBe('agent.turn');
    expect(MetricNames.CACHE_HIT).toBe('cache.hit');
  });
});
