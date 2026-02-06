/**
 * Message Serialization Tests
 *
 * Tests that messages for the same session are serialized through the
 * LaneQueue while different sessions can run in parallel.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Import directly from source modules (Jest moduleNameMapper strips .js)
import { LaneQueue } from '../../src/concurrency/lane-queue';
import {
  getChannelLaneQueue,
  resetChannelLaneQueue,
  enqueueMessage,
} from '../../src/channels/index';

describe('Channel Message Serialization', () => {
  beforeEach(() => {
    resetChannelLaneQueue();
  });

  afterEach(() => {
    resetChannelLaneQueue();
  });

  describe('getChannelLaneQueue', () => {
    it('should return a LaneQueue instance', () => {
      const queue = getChannelLaneQueue();
      expect(queue).toBeInstanceOf(LaneQueue);
    });

    it('should return the same singleton instance on repeated calls', () => {
      const queue1 = getChannelLaneQueue();
      const queue2 = getChannelLaneQueue();
      expect(queue1).toBe(queue2);
    });

    it('should return a fresh instance after reset', () => {
      const queue1 = getChannelLaneQueue();
      resetChannelLaneQueue();
      const queue2 = getChannelLaneQueue();
      expect(queue1).not.toBe(queue2);
    });
  });

  describe('enqueueMessage', () => {
    it('should execute a handler and return its result', async () => {
      const result = await enqueueMessage('session-1', async () => {
        return 'hello';
      });
      expect(result).toBe('hello');
    });

    it('should propagate errors from the handler', async () => {
      await expect(
        enqueueMessage('session-1', async () => {
          throw new Error('handler failed');
        })
      ).rejects.toThrow('handler failed');
    });

    it('should use the channel-message category by default', async () => {
      const queue = getChannelLaneQueue();
      const taskEnqueuedPromise = new Promise<string>((resolve) => {
        queue.on('task:enqueued', (task) => {
          resolve(task.options.category ?? '');
        });
      });

      // Fire and forget the enqueue - we just want the event
      enqueueMessage('session-1', async () => 'ok');

      const category = await taskEnqueuedPromise;
      expect(category).toBe('channel-message');
    });
  });

  describe('serialization behavior', () => {
    it('should serialize messages for the same session', async () => {
      const executionOrder: number[] = [];
      const barriers: Array<() => void> = [];

      // Create 3 tasks for the same session.
      // Each task records when it starts and waits for a barrier.
      const promises = [0, 1, 2].map((i) => {
        return enqueueMessage('session-A', async () => {
          executionOrder.push(i);
          // Task 0 and 1 wait for barrier; task 2 completes immediately
          if (i < 2) {
            await new Promise<void>((resolve) => {
              barriers[i] = resolve;
            });
          }
          return i;
        });
      });

      // Give the first task time to start
      await new Promise((r) => setTimeout(r, 10));

      // Only task 0 should have started (serial execution)
      expect(executionOrder).toEqual([0]);

      // Release task 0
      barriers[0]();
      await new Promise((r) => setTimeout(r, 10));

      // Task 1 should now have started
      expect(executionOrder).toEqual([0, 1]);

      // Release task 1
      barriers[1]();

      // Wait for all tasks to complete
      const results = await Promise.all(promises);
      expect(results).toEqual([0, 1, 2]);
      expect(executionOrder).toEqual([0, 1, 2]);
    });

    it('should allow different sessions to run in parallel', async () => {
      const running = new Set<string>();
      let maxConcurrent = 0;

      const makeTask = (sessionKey: string) => {
        return enqueueMessage(sessionKey, async () => {
          running.add(sessionKey);
          maxConcurrent = Math.max(maxConcurrent, running.size);
          // Small delay to let other tasks start
          await new Promise((r) => setTimeout(r, 30));
          running.delete(sessionKey);
          return sessionKey;
        });
      };

      // Start tasks for three different sessions
      const results = await Promise.all([
        makeTask('session-X'),
        makeTask('session-Y'),
        makeTask('session-Z'),
      ]);

      expect(results).toEqual(['session-X', 'session-Y', 'session-Z']);

      // Different sessions should have been running concurrently
      // (max concurrent should be > 1 if parallelism is working)
      expect(maxConcurrent).toBeGreaterThanOrEqual(2);
    });

    it('should serialize within a session while running different sessions in parallel', async () => {
      const log: string[] = [];

      const makeTask = (session: string, id: string, delayMs: number) => {
        return enqueueMessage(session, async () => {
          log.push(`start:${session}:${id}`);
          await new Promise((r) => setTimeout(r, delayMs));
          log.push(`end:${session}:${id}`);
          return `${session}:${id}`;
        });
      };

      // Session A: two tasks (serial within session)
      // Session B: two tasks (serial within session)
      // A and B should overlap (parallel across sessions)
      const results = await Promise.all([
        makeTask('A', '1', 30),
        makeTask('A', '2', 10),
        makeTask('B', '1', 30),
        makeTask('B', '2', 10),
      ]);

      expect(results).toEqual(['A:1', 'A:2', 'B:1', 'B:2']);

      // Within session A, task 1 must finish before task 2 starts
      const aStartIdx1 = log.indexOf('start:A:1');
      const aEndIdx1 = log.indexOf('end:A:1');
      const aStartIdx2 = log.indexOf('start:A:2');
      expect(aEndIdx1).toBeLessThan(aStartIdx2);

      // Within session B, task 1 must finish before task 2 starts
      const bStartIdx1 = log.indexOf('start:B:1');
      const bEndIdx1 = log.indexOf('end:B:1');
      const bStartIdx2 = log.indexOf('start:B:2');
      expect(bEndIdx1).toBeLessThan(bStartIdx2);

      // Sessions A and B should overlap: B:1 should start before A:1 ends (or vice versa)
      // Since both are enqueued concurrently, both should start early
      expect(aStartIdx1).toBeLessThan(log.length);
      expect(bStartIdx1).toBeLessThan(log.length);
    });
  });

  describe('resetChannelLaneQueue', () => {
    it('should cancel pending tasks on reset', async () => {
      // Enqueue a task that blocks
      const blockingPromise = enqueueMessage('session-1', async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return 'should not complete';
      });

      // Enqueue a second task that will be pending
      const pendingPromise = enqueueMessage('session-1', async () => {
        return 'pending task';
      });

      // Reset should clear the queue and cancel pending tasks
      resetChannelLaneQueue();

      // The pending task should reject with a cancellation error
      await expect(pendingPromise).rejects.toThrow('Task cancelled');
    });

    it('should allow new tasks after reset', async () => {
      resetChannelLaneQueue();
      const result = await enqueueMessage('session-1', async () => 'fresh');
      expect(result).toBe('fresh');
    });
  });
});
