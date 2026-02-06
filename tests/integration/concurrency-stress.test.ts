/**
 * Concurrency stress tests for LaneQueue.
 */

import { LaneQueue, resetLaneQueue } from '../../src/concurrency/lane-queue.js';

describe('Concurrency Stress', () => {
  let queue: LaneQueue;

  beforeEach(() => {
    resetLaneQueue();
    queue = new LaneQueue({ maxParallel: 5, defaultTimeout: 30000 });
  });

  afterEach(() => {
    queue.clear();
    resetLaneQueue();
  });

  it('should handle 50 concurrent tasks across 10 lanes without deadlock', async () => {
    const results: string[] = [];

    const promises = Array.from({ length: 50 }, (_, i) => {
      const lane = `lane-${i % 10}`;
      return queue.enqueue(lane, async () => {
        await new Promise(r => setTimeout(r, Math.random() * 20));
        results.push(`${lane}:${i}`);
        return i;
      });
    });

    const values = await Promise.all(promises);
    expect(values).toHaveLength(50);
    expect(results).toHaveLength(50);
    // Each value should match its index
    values.forEach((v, i) => expect(v).toBe(i));
  }, 15000);

  it('should maintain serial ordering within a lane under load', async () => {
    const order: number[] = [];

    const promises = Array.from({ length: 20 }, (_, i) =>
      queue.enqueue('serial-lane', async () => {
        await new Promise(r => setTimeout(r, 5));
        order.push(i);
        return i;
      })
    );

    await Promise.all(promises);
    // Tasks within the same lane must execute in order
    expect(order).toEqual(Array.from({ length: 20 }, (_, i) => i));
  }, 10000);

  it('should handle mixed serial and parallel tasks', async () => {
    const order: string[] = [];

    // First, init the lane
    await queue.enqueue('mixed', async () => 'init');
    queue.pause('mixed');

    // Queue serial and parallel tasks
    const p1 = queue.enqueue('mixed', async () => {
      order.push('serial-1-start');
      await new Promise(r => setTimeout(r, 50));
      order.push('serial-1-end');
    });

    const p2 = queue.enqueue('mixed', async () => {
      order.push('parallel-1-start');
      await new Promise(r => setTimeout(r, 50));
      order.push('parallel-1-end');
    }, { parallel: true });

    const p3 = queue.enqueue('mixed', async () => {
      order.push('parallel-2-start');
      await new Promise(r => setTimeout(r, 50));
      order.push('parallel-2-end');
    }, { parallel: true });

    queue.resume('mixed');
    await Promise.all([p1, p2, p3]);

    // Serial task must complete before parallel tasks start
    expect(order.indexOf('serial-1-end')).toBeLessThan(order.indexOf('parallel-1-start'));
  }, 10000);

  it('should handle rapid enqueue/dequeue cycles', async () => {
    const results: number[] = [];

    for (let cycle = 0; cycle < 5; cycle++) {
      const promises = Array.from({ length: 10 }, (_, i) =>
        queue.enqueue(`rapid-${cycle}`, async () => {
          results.push(cycle * 10 + i);
          return cycle * 10 + i;
        })
      );
      await Promise.all(promises);
    }

    expect(results).toHaveLength(50);
  }, 10000);

  it('should handle cancellation during high concurrency', async () => {
    await queue.enqueue('cancel-stress', async () => 'init');
    queue.pause('cancel-stress');

    const promises = Array.from({ length: 20 }, (_, i) =>
      queue.enqueue('cancel-stress', async () => i).catch(() => 'cancelled')
    );

    const cancelled = queue.cancelPending('cancel-stress');
    expect(cancelled).toBe(20);

    const results = await Promise.all(promises);
    expect(results.every(r => r === 'cancelled')).toBe(true);
  });

  it('should report accurate global stats', async () => {
    const promises = Array.from({ length: 30 }, (_, i) =>
      queue.enqueue(`stats-lane-${i % 3}`, async () => i)
    );

    await Promise.all(promises);

    const stats = queue.getGlobalStats();
    expect(stats.totalTasks).toBe(30);
    expect(stats.completedTasks).toBe(30);
    expect(stats.failedTasks).toBe(0);
  });
});
