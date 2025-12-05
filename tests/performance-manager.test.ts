/**
 * Tests for Performance Module
 */
import {
  PerformanceManager,
  getPerformanceManager,
  resetPerformanceManager,
  initializePerformanceManager,
  measureOperation,
} from '../src/performance/performance-manager';
import {
  LazyLoader,
  getLazyLoader,
  resetLazyLoader,
} from '../src/performance/lazy-loader';
import {
  ToolCache,
  getToolCache,
  resetToolCache,
} from '../src/performance/tool-cache';
import {
  RequestOptimizer,
  getRequestOptimizer,
  resetRequestOptimizer,
} from '../src/performance/request-optimizer';

describe('PerformanceManager', () => {
  let manager: PerformanceManager;

  beforeEach(() => {
    resetPerformanceManager();
    manager = getPerformanceManager();
  });

  afterEach(() => {
    resetPerformanceManager();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const m1 = getPerformanceManager();
      const m2 = getPerformanceManager();
      expect(m1).toBe(m2);
    });

    it('should reset correctly', () => {
      const m1 = getPerformanceManager();
      resetPerformanceManager();
      const m2 = getPerformanceManager();
      expect(m1).not.toBe(m2);
    });
  });

  describe('Initialization', () => {
    it('should initialize without errors', async () => {
      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should emit initialized event', async () => {
      const initHandler = jest.fn();
      manager.on('initialized', initHandler);
      await manager.initialize();
      expect(initHandler).toHaveBeenCalled();
    });
  });

  describe('Metrics Recording', () => {
    it('should record metrics', () => {
      manager.recordMetric({
        operation: 'test-op',
        duration: 100,
        cached: false,
        success: true,
      });

      const metrics = manager.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].operation).toBe('test-op');
    });

    it('should emit metric event', () => {
      const metricHandler = jest.fn();
      manager.on('metric', metricHandler);

      manager.recordMetric({
        operation: 'test-op',
        duration: 100,
        cached: false,
        success: true,
      });

      expect(metricHandler).toHaveBeenCalled();
    });

    it('should emit budget exceeded event', () => {
      const budgetHandler = jest.fn();
      manager.on('budget:exceeded', budgetHandler);

      manager.recordMetric({
        operation: 'slow-op',
        duration: 10000, // 10 seconds, exceeds default 5s budget
        cached: false,
        success: true,
      });

      expect(budgetHandler).toHaveBeenCalled();
    });
  });

  describe('Measure Operation', () => {
    it('should measure async operation', async () => {
      const result = await manager.measure('test', async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 'done';
      });

      expect(result).toBe('done');
      const metrics = manager.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].duration).toBeGreaterThanOrEqual(10);
    });

    it('should record failure on error', async () => {
      await expect(
        manager.measure('fail-test', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      const metrics = manager.getMetrics();
      expect(metrics[0].success).toBe(false);
    });
  });

  describe('Summary', () => {
    it('should return performance summary', () => {
      const summary = manager.getSummary();

      expect(summary).toHaveProperty('lazyLoader');
      expect(summary).toHaveProperty('toolCache');
      expect(summary).toHaveProperty('requestOptimizer');
      expect(summary).toHaveProperty('apiCache');
      expect(summary).toHaveProperty('overall');
    });

    it('should calculate cache hit rate', () => {
      manager.recordMetric({ operation: 'op1', duration: 10, cached: true, success: true });
      manager.recordMetric({ operation: 'op2', duration: 10, cached: true, success: true });
      manager.recordMetric({ operation: 'op3', duration: 10, cached: false, success: true });

      const summary = manager.getSummary();
      expect(summary.overall.cacheHitRate).toBeCloseTo(0.67, 1);
    });
  });

  describe('Statistics', () => {
    it('should get summary', () => {
      const summary = manager.getSummary();
      expect(summary).toBeDefined();
      expect(summary.overall).toBeDefined();
    });

    it('should reset stats', () => {
      manager.recordMetric({ operation: 'op', duration: 10, cached: false, success: true });
      manager.resetStats();

      const metrics = manager.getMetrics();
      expect(metrics.length).toBe(0);
    });
  });

  describe('Slow Operations', () => {
    it('should identify slow operations', () => {
      manager.recordMetric({ operation: 'fast', duration: 50, cached: false, success: true });
      manager.recordMetric({ operation: 'slow', duration: 2000, cached: false, success: true });
      manager.recordMetric({ operation: 'very-slow', duration: 5000, cached: false, success: true });

      const slowOps = manager.getSlowOperations(1000);
      expect(slowOps.length).toBe(2);
      expect(slowOps.map((o) => o.operation)).toContain('slow');
      expect(slowOps.map((o) => o.operation)).toContain('very-slow');
    });
  });
});

describe('LazyLoader', () => {
  let loader: LazyLoader;

  beforeEach(() => {
    resetLazyLoader();
    loader = getLazyLoader();
  });

  afterEach(() => {
    resetLazyLoader();
  });

  describe('Module Registration', () => {
    it('should register module', () => {
      loader.register('test-module', async () => ({ value: 42 }));
      expect(loader.isLoaded('test-module')).toBe(false);
    });

    it('should emit registered event', () => {
      const handler = jest.fn();
      loader.on('module:registered', handler);

      loader.register('test-module', async () => ({}));
      expect(handler).toHaveBeenCalledWith({ name: 'test-module' });
    });
  });

  describe('Module Loading', () => {
    it('should load module on demand', async () => {
      const moduleValue = { test: true };
      loader.register('lazy-mod', async () => moduleValue);

      const result = await loader.get('lazy-mod');
      expect(result).toEqual(moduleValue);
      expect(loader.isLoaded('lazy-mod')).toBe(true);
    });

    it('should return cached instance', async () => {
      let callCount = 0;
      loader.register('cached-mod', async () => {
        callCount++;
        return { id: callCount };
      });

      const result1 = await loader.get('cached-mod');
      const result2 = await loader.get('cached-mod');

      expect(result1).toBe(result2);
      expect(callCount).toBe(1);
    });

    it('should throw for unregistered module', async () => {
      await expect(loader.get('unknown')).rejects.toThrow('Module not registered');
    });

    it('should emit loaded event', async () => {
      const handler = jest.fn();
      loader.on('module:loaded', handler);

      loader.register('event-mod', async () => ({}));
      await loader.get('event-mod');

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0]).toHaveProperty('name', 'event-mod');
      expect(handler.mock.calls[0][0]).toHaveProperty('loadTime');
    });
  });

  describe('Module Unloading', () => {
    it('should unload module', async () => {
      loader.register('unload-mod', async () => ({}));
      await loader.get('unload-mod');

      expect(loader.isLoaded('unload-mod')).toBe(true);
      loader.unload('unload-mod');
      expect(loader.isLoaded('unload-mod')).toBe(false);
    });

    it('should return false for unloaded module', () => {
      expect(loader.unload('nonexistent')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track load metrics', async () => {
      loader.register('stats-mod', async () => ({}));
      await loader.get('stats-mod');

      const metrics = loader.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].moduleName).toBe('stats-mod');
      expect(metrics[0].success).toBe(true);
    });

    it('should provide stats summary', async () => {
      loader.register('mod1', async () => ({}));
      loader.register('mod2', async () => ({}));
      await loader.get('mod1');

      const stats = loader.getStats();
      expect(stats.totalModules).toBe(2);
      expect(stats.loadedModules).toBe(1);
    });
  });
});

describe('ToolCache', () => {
  let cache: ToolCache;

  beforeEach(() => {
    resetToolCache();
    cache = getToolCache();
  });

  afterEach(() => {
    resetToolCache();
  });

  describe('Cacheability', () => {
    it('should identify cacheable tools', () => {
      expect(cache.isCacheable('search', {})).toBe(true);
      expect(cache.isCacheable('grep', {})).toBe(true);
      expect(cache.isCacheable('glob', {})).toBe(true);
    });

    it('should reject mutable tools', () => {
      expect(cache.isCacheable('bash', {})).toBe(false);
      expect(cache.isCacheable('str_replace_editor', {})).toBe(false);
      expect(cache.isCacheable('create_file', {})).toBe(false);
    });

    it('should reject excluded patterns', () => {
      expect(cache.isCacheable('search', { query: '--force' })).toBe(false);
      expect(cache.isCacheable('search', { query: '--no-cache' })).toBe(false);
    });
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve results', async () => {
      let callCount = 0;
      const executeFn = async () => {
        callCount++;
        return { success: true, output: 'test' };
      };

      const result1 = await cache.getOrExecute('search', { query: 'test' }, executeFn);
      const result2 = await cache.getOrExecute('search', { query: 'test' }, executeFn);

      expect(result1.output).toBe('test');
      expect(result2.cached).toBe(true);
      expect(callCount).toBe(1);
    });

    it('should not cache non-cacheable tools', async () => {
      let callCount = 0;
      const executeFn = async () => {
        callCount++;
        return { success: true };
      };

      await cache.getOrExecute('bash', { command: 'ls' }, executeFn);
      await cache.getOrExecute('bash', { command: 'ls' }, executeFn);

      expect(callCount).toBe(2);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate by tool name', async () => {
      await cache.getOrExecute('search', { q: 'a' }, async () => ({ success: true }));
      await cache.getOrExecute('search', { q: 'b' }, async () => ({ success: true }));

      const count = cache.invalidate('search');
      expect(count).toBeGreaterThan(0);
    });

    it('should invalidate for file changes', async () => {
      await cache.getOrExecute('view_file', { path: '/test/file.ts' }, async () => ({
        success: true,
        output: 'content',
      }));

      cache.invalidateForFile('/test/file.ts');

      // Next call should execute again
      let called = false;
      await cache.getOrExecute('view_file', { path: '/test/file.ts' }, async () => {
        called = true;
        return { success: true, output: 'new content' };
      });

      expect(called).toBe(true);
    });

    it('should clear entire cache', () => {
      cache.clear();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      const fn = async () => ({ success: true });

      await cache.getOrExecute('search', { q: 'test' }, fn);
      await cache.getOrExecute('search', { q: 'test' }, fn); // Hit
      await cache.getOrExecute('search', { q: 'other' }, fn); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
    });
  });
});

describe('RequestOptimizer', () => {
  let optimizer: RequestOptimizer;

  beforeEach(() => {
    resetRequestOptimizer();
    optimizer = getRequestOptimizer({ batchWindowMs: 10 });
  });

  afterEach(() => {
    resetRequestOptimizer();
  });

  describe('Request Execution', () => {
    it('should execute requests', async () => {
      const result = await optimizer.execute('test', async () => 'result');
      expect(result).toBe('result');
    });

    it('should deduplicate concurrent requests', async () => {
      let callCount = 0;
      const executeFn = async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return 'result';
      };

      const [r1, r2] = await Promise.all([
        optimizer.execute('same-key', executeFn),
        optimizer.execute('same-key', executeFn),
      ]);

      expect(r1).toBe('result');
      expect(r2).toBe('result');
      expect(callCount).toBe(1);
    });

    it('should respect priority', async () => {
      const order: number[] = [];

      // Queue up requests with different priorities
      const p1 = optimizer.execute('low', async () => {
        order.push(1);
        return 1;
      }, { priority: 1 });

      const p2 = optimizer.execute('high', async () => {
        order.push(2);
        return 2;
      }, { priority: 10 });

      await Promise.all([p1, p2]);

      // Higher priority should execute first
      expect(order[0]).toBe(2);
    });
  });

  describe('Immediate Execution', () => {
    it('should execute immediately', async () => {
      const result = await optimizer.executeImmediate(async () => 'immediate');
      expect(result).toBe('immediate');
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const result = await optimizer.executeImmediate(
        async () => {
          attempts++;
          if (attempts < 3) throw new Error('Retry');
          return 'success';
        },
        { retries: 3 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });

  describe('Statistics', () => {
    it('should track request stats', async () => {
      await optimizer.execute('req1', async () => 'ok');
      await optimizer.execute('req2', async () => 'ok');

      const stats = optimizer.getStats();
      expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
      expect(stats.successfulRequests).toBeGreaterThanOrEqual(2);
    });

    it('should handle failures gracefully', async () => {
      let threw = false;
      try {
        await optimizer.executeImmediate(
          async () => {
            throw new Error('Fail');
          },
          { retries: 0 }
        );
      } catch {
        threw = true;
      }

      expect(threw).toBe(true);
    });
  });

  describe('Queue Status', () => {
    it('should report queue status', () => {
      const status = optimizer.getQueueStatus();
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('maxConcurrent');
    });
  });

  describe('Clear', () => {
    it('should clear pending requests', () => {
      optimizer.clear();
      const status = optimizer.getQueueStatus();
      expect(status.pending).toBe(0);
    });
  });
});

describe('measureOperation utility', () => {
  beforeEach(() => {
    resetPerformanceManager();
  });

  afterEach(() => {
    resetPerformanceManager();
  });

  it('should measure and record operation', async () => {
    const result = await measureOperation('utility-test', async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 42;
    });

    expect(result).toBe(42);

    const metrics = getPerformanceManager().getMetrics();
    expect(metrics.some((m) => m.operation === 'utility-test')).toBe(true);
  });
});
