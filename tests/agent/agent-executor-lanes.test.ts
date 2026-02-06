/**
 * Tests for LaneQueue integration in AgentExecutor
 *
 * Verifies that tool execution is routed through the LaneQueue
 * for serialization, with read-only tools running in parallel.
 */

import { LaneQueue, resetLaneQueue } from '../../src/concurrency/lane-queue.js';

describe('AgentExecutor LaneQueue Integration', () => {
  let laneQueue: LaneQueue;

  beforeEach(() => {
    resetLaneQueue();
    laneQueue = new LaneQueue({ maxParallel: 3, defaultTimeout: 5000 });
  });

  afterEach(() => {
    resetLaneQueue();
  });

  it('should serialize tool execution through the lane queue', async () => {
    const executionOrder: string[] = [];

    // Simulate serial tool execution
    const p1 = laneQueue.enqueue('agent-tools', async () => {
      executionOrder.push('start-1');
      await new Promise(r => setTimeout(r, 50));
      executionOrder.push('end-1');
      return { success: true, output: 'result-1' };
    });

    const p2 = laneQueue.enqueue('agent-tools', async () => {
      executionOrder.push('start-2');
      await new Promise(r => setTimeout(r, 50));
      executionOrder.push('end-2');
      return { success: true, output: 'result-2' };
    });

    await Promise.all([p1, p2]);

    // Serial: task 1 must complete before task 2 starts
    expect(executionOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
  });

  it('should allow parallel execution for read-only tools', async () => {
    const executionOrder: string[] = [];

    // Pause lane, queue both tasks, then resume to ensure both are pending
    // when processing starts
    // First create the lane
    await laneQueue.enqueue('agent-tools-parallel', async () => 'init');
    laneQueue.pause('agent-tools-parallel');

    const p1 = laneQueue.enqueue('agent-tools-parallel', async () => {
      executionOrder.push('start-read-1');
      await new Promise(r => setTimeout(r, 200));
      executionOrder.push('end-read-1');
      return { success: true };
    }, { parallel: true, category: 'grep' });

    const p2 = laneQueue.enqueue('agent-tools-parallel', async () => {
      executionOrder.push('start-read-2');
      await new Promise(r => setTimeout(r, 200));
      executionOrder.push('end-read-2');
      return { success: true };
    }, { parallel: true, category: 'glob' });

    // Resume: both tasks should be picked up together
    laneQueue.resume('agent-tools-parallel');
    await Promise.all([p1, p2]);

    // Parallel: both should start before either ends
    const startIndices = [
      executionOrder.indexOf('start-read-1'),
      executionOrder.indexOf('start-read-2'),
    ];
    const endIndices = [
      executionOrder.indexOf('end-read-1'),
      executionOrder.indexOf('end-read-2'),
    ];
    // Both starts should come before both ends
    expect(Math.max(...startIndices)).toBeLessThan(Math.min(...endIndices));
  });

  it('should handle tool execution failures gracefully', async () => {
    await expect(
      laneQueue.enqueue('agent-tools', async () => {
        throw new Error('Tool execution failed');
      })
    ).rejects.toThrow('Tool execution failed');

    // Queue should still work after failure
    const result = await laneQueue.enqueue('agent-tools', async () => {
      return { success: true, output: 'recovered' };
    });

    expect(result).toEqual({ success: true, output: 'recovered' });
  });

  it('should track lane statistics', async () => {
    await laneQueue.enqueue('agent-tools', async () => ({ success: true }));
    await laneQueue.enqueue('agent-tools', async () => ({ success: true }));

    const stats = laneQueue.getStats('agent-tools');
    expect(stats).toBeDefined();
    expect(stats!.completedTasks).toBe(2);
    expect(stats!.totalTasks).toBe(2);
    expect(stats!.failedTasks).toBe(0);
  });

  it('should respect timeout', async () => {
    const shortQueue = new LaneQueue({ defaultTimeout: 100, maxParallel: 3, metricsEnabled: true, maxPending: 100, defaultRetries: 0, defaultRetryDelay: 1000 });

    await expect(
      shortQueue.enqueue('agent-tools', async () => {
        await new Promise(r => setTimeout(r, 500));
        return { success: true };
      })
    ).rejects.toThrow('timed out');
  });

  it('should pause and resume lane processing', async () => {
    // First create the lane by running a task
    await laneQueue.enqueue('agent-pause', async () => 'init');

    // Now pause the existing lane
    const paused = laneQueue.pause('agent-pause');
    expect(paused).toBe(true);

    const results: string[] = [];
    const p1 = laneQueue.enqueue('agent-pause', async () => {
      results.push('executed');
      return 'done';
    });

    // Give some time - task should NOT execute while paused
    await new Promise(r => setTimeout(r, 100));
    expect(results).toEqual([]);

    // Resume should trigger execution
    laneQueue.resume('agent-pause');
    await p1;
    expect(results).toEqual(['executed']);
  });
});
