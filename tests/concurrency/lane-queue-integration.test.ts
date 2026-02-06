/**
 * Integration tests for LaneQueue
 *
 * Tests the lane queue system with realistic scenarios
 * including multi-lane isolation, priority ordering, and retry logic.
 */

import { LaneQueue, resetLaneQueue } from '../../src/concurrency/lane-queue.js';

describe('LaneQueue Integration', () => {
  let queue: LaneQueue;

  beforeEach(() => {
    resetLaneQueue();
    queue = new LaneQueue({ maxParallel: 2, defaultTimeout: 5000 });
  });

  afterEach(() => {
    queue.clear();
    resetLaneQueue();
  });

  describe('Multi-lane isolation', () => {
    it('should process lanes independently', async () => {
      const results: string[] = [];

      const p1 = queue.enqueue('lane-A', async () => {
        await new Promise(r => setTimeout(r, 50));
        results.push('A');
        return 'A';
      });

      const p2 = queue.enqueue('lane-B', async () => {
        results.push('B');
        return 'B';
      });

      await Promise.all([p1, p2]);

      // Lane B should complete first (no delay)
      expect(results[0]).toBe('B');
      expect(results[1]).toBe('A');
    });

    it('should not block one lane when another is busy', async () => {
      const startTime = Date.now();

      // Lane A: slow task
      const p1 = queue.enqueue('lane-A', async () => {
        await new Promise(r => setTimeout(r, 200));
        return 'slow';
      });

      // Lane B: fast task
      const p2 = queue.enqueue('lane-B', async () => {
        return 'fast';
      });

      const fastResult = await p2;
      const fastDuration = Date.now() - startTime;

      expect(fastResult).toBe('fast');
      expect(fastDuration).toBeLessThan(100); // Should not wait for lane A

      await p1; // Clean up
    });
  });

  describe('Priority ordering', () => {
    it('should execute higher priority tasks first', async () => {
      const executionOrder: number[] = [];

      // Create lane first, then pause to queue up tasks
      await queue.enqueue('priority-lane', async () => 'init');
      queue.pause('priority-lane');

      const p1 = queue.enqueue('priority-lane', async () => {
        executionOrder.push(1);
      }, { priority: 1 });

      const p2 = queue.enqueue('priority-lane', async () => {
        executionOrder.push(10);
      }, { priority: 10 });

      const p3 = queue.enqueue('priority-lane', async () => {
        executionOrder.push(5);
      }, { priority: 5 });

      queue.resume('priority-lane');
      await Promise.all([p1, p2, p3]);

      // Higher priority first
      expect(executionOrder).toEqual([10, 5, 1]);
    });
  });

  describe('Retry logic', () => {
    it('should retry idempotent tasks', async () => {
      let attempts = 0;

      const result = await queue.enqueue('retry-lane', async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('transient failure');
        }
        return 'success';
      }, { idempotent: true, retries: 3, retryDelay: 10 });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;

      await expect(
        queue.enqueue('retry-lane', async () => {
          attempts++;
          throw new Error('permanent failure');
        }, { idempotent: true, retries: 2, retryDelay: 10 })
      ).rejects.toThrow('permanent failure');

      expect(attempts).toBe(3); // 1 initial + 2 retries
    });
  });

  describe('Cancel and drain', () => {
    it('should cancel pending tasks', async () => {
      // Create lane first, then pause it
      await queue.enqueue('cancel-lane', async () => 'init');
      queue.pause('cancel-lane');

      // Catch rejections to prevent unhandled promise warnings
      const p1 = queue.enqueue('cancel-lane', async () => 'a').catch(e => e);
      const p2 = queue.enqueue('cancel-lane', async () => 'b').catch(e => e);
      const p3 = queue.enqueue('cancel-lane', async () => 'c').catch(e => e);

      const cancelled = queue.cancelPending('cancel-lane');
      expect(cancelled).toBe(3);

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
      expect(r1).toBeInstanceOf(Error);
      expect((r1 as Error).message).toContain('cancelled');
      expect(r2).toBeInstanceOf(Error);
      expect(r3).toBeInstanceOf(Error);
    });
  });

  describe('Global statistics', () => {
    it('should aggregate stats across lanes', async () => {
      await queue.enqueue('lane-1', async () => 'a');
      await queue.enqueue('lane-1', async () => 'b');
      await queue.enqueue('lane-2', async () => 'c');

      const globalStats = queue.getGlobalStats();
      expect(globalStats.totalTasks).toBe(3);
      expect(globalStats.completedTasks).toBe(3);
      expect(globalStats.failedTasks).toBe(0);
    });
  });

  describe('Format status', () => {
    it('should return readable status string', async () => {
      await queue.enqueue('session-1', async () => 'done');

      const status = queue.formatStatus();
      expect(status).toContain('session-1');
      expect(status).toContain('ACTIVE');
      expect(status).toContain('Completed: 1');
    });
  });
});
