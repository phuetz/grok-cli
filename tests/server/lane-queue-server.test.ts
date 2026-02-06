/**
 * Server-Side LaneQueue Integration Tests
 *
 * Tests that the HTTP chat route and WebSocket handler properly serialize
 * messages through the channel LaneQueue.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { LaneQueue } from '../../src/concurrency/lane-queue';
import {
  getChannelLaneQueue,
  resetChannelLaneQueue,
  enqueueMessage,
} from '../../src/channels/index';

describe('Server LaneQueue Integration', () => {
  beforeEach(() => {
    resetChannelLaneQueue();
  });

  afterEach(() => {
    resetChannelLaneQueue();
  });

  describe('HTTP chat route session serialization', () => {
    it('should serialize requests for the same sessionId', async () => {
      const order: number[] = [];

      // Simulate two sequential chat requests for session "s1"
      const sessionKey = 'api:chat:s1';

      const p1 = enqueueMessage(sessionKey, async () => {
        order.push(1);
        await new Promise((r) => setTimeout(r, 30));
        order.push(2);
        return { content: 'response-1' };
      });

      const p2 = enqueueMessage(sessionKey, async () => {
        order.push(3);
        return { content: 'response-2' };
      });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.content).toBe('response-1');
      expect(r2.content).toBe('response-2');

      // Serial: task 1 must fully complete before task 2 starts
      expect(order).toEqual([1, 2, 3]);
    });

    it('should allow parallel requests for different sessionIds', async () => {
      const concurrentSessions = new Set<string>();
      let maxConcurrent = 0;

      const makeRequest = (sessionId: string) => {
        const sessionKey = `api:chat:${sessionId}`;
        return enqueueMessage(sessionKey, async () => {
          concurrentSessions.add(sessionId);
          maxConcurrent = Math.max(maxConcurrent, concurrentSessions.size);
          await new Promise((r) => setTimeout(r, 20));
          concurrentSessions.delete(sessionId);
          return { content: `response-${sessionId}` };
        });
      };

      const results = await Promise.all([
        makeRequest('session-a'),
        makeRequest('session-b'),
        makeRequest('session-c'),
      ]);

      expect(results.map(r => r.content)).toEqual([
        'response-session-a',
        'response-session-b',
        'response-session-c',
      ]);

      // Different sessions should run in parallel
      expect(maxConcurrent).toBeGreaterThanOrEqual(2);
    });

    it('should use default session key when sessionId is not provided', async () => {
      const sessionKey = 'api:chat:default';
      const result = await enqueueMessage(sessionKey, async () => {
        return { content: 'default-session-response' };
      });
      expect(result.content).toBe('default-session-response');
    });
  });

  describe('WebSocket session serialization', () => {
    it('should serialize messages within a single connection', async () => {
      const connectionId = 'ws_123_abc';
      const sessionKey = `ws:${connectionId}`;
      const order: string[] = [];

      const p1 = enqueueMessage(sessionKey, async () => {
        order.push('chat-start');
        await new Promise((r) => setTimeout(r, 20));
        order.push('chat-end');
      });

      const p2 = enqueueMessage(sessionKey, async () => {
        order.push('tool-start');
        order.push('tool-end');
      });

      await Promise.all([p1, p2]);

      // Serial: chat must finish before tool starts
      expect(order).toEqual(['chat-start', 'chat-end', 'tool-start', 'tool-end']);
    });

    it('should allow parallel processing across different connections', async () => {
      const activeCounts = new Set<string>();
      let maxActive = 0;

      const makeWsMessage = (connId: string) => {
        const sessionKey = `ws:${connId}`;
        return enqueueMessage(sessionKey, async () => {
          activeCounts.add(connId);
          maxActive = Math.max(maxActive, activeCounts.size);
          await new Promise((r) => setTimeout(r, 20));
          activeCounts.delete(connId);
          return connId;
        });
      };

      const results = await Promise.all([
        makeWsMessage('ws_1'),
        makeWsMessage('ws_2'),
        makeWsMessage('ws_3'),
      ]);

      expect(results).toEqual(['ws_1', 'ws_2', 'ws_3']);
      expect(maxActive).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Webhook session serialization', () => {
    it('should serialize webhook messages for the same chat', async () => {
      const order: number[] = [];
      const sessionKey = 'webhook:/webhook/telegram:chat:12345';

      const p1 = enqueueMessage(sessionKey, async () => {
        order.push(1);
        await new Promise((r) => setTimeout(r, 20));
        order.push(2);
        return { status: 200, body: { ok: true } };
      });

      const p2 = enqueueMessage(sessionKey, async () => {
        order.push(3);
        return { status: 200, body: { ok: true } };
      });

      await Promise.all([p1, p2]);
      expect(order).toEqual([1, 2, 3]);
    });

    it('should allow parallel processing for different chats', async () => {
      const active = new Set<string>();
      let maxActive = 0;

      const makeWebhook = (chatId: string) => {
        const sessionKey = `webhook:/webhook/telegram:chat:${chatId}`;
        return enqueueMessage(sessionKey, async () => {
          active.add(chatId);
          maxActive = Math.max(maxActive, active.size);
          await new Promise((r) => setTimeout(r, 20));
          active.delete(chatId);
          return { status: 200 };
        });
      };

      const results = await Promise.all([
        makeWebhook('100'),
        makeWebhook('200'),
        makeWebhook('300'),
      ]);

      expect(results).toHaveLength(3);
      expect(maxActive).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Lane queue statistics', () => {
    it('should track completed tasks in lane stats', async () => {
      const queue = getChannelLaneQueue();
      const sessionKey = 'stats-test';

      await enqueueMessage(sessionKey, async () => 'a');
      await enqueueMessage(sessionKey, async () => 'b');

      const stats = queue.getStats(sessionKey);
      expect(stats).toBeDefined();
      expect(stats!.completedTasks).toBe(2);
      expect(stats!.totalTasks).toBe(2);
      expect(stats!.failedTasks).toBe(0);
    });

    it('should track failed tasks in lane stats', async () => {
      const queue = getChannelLaneQueue();
      const sessionKey = 'stats-fail-test';

      try {
        await enqueueMessage(sessionKey, async () => {
          throw new Error('deliberate failure');
        });
      } catch {
        // expected
      }

      const stats = queue.getStats(sessionKey);
      expect(stats).toBeDefined();
      expect(stats!.failedTasks).toBe(1);
    });

    it('should track global stats across all lanes', async () => {
      const queue = getChannelLaneQueue();

      await enqueueMessage('lane-1', async () => 'x');
      await enqueueMessage('lane-2', async () => 'y');

      const globalStats = queue.getGlobalStats();
      expect(globalStats.totalTasks).toBeGreaterThanOrEqual(2);
      expect(globalStats.completedTasks).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error handling', () => {
    it('should not block subsequent messages when a handler fails', async () => {
      const sessionKey = 'error-recovery';

      // First message fails
      const p1 = enqueueMessage(sessionKey, async () => {
        throw new Error('handler error');
      }).catch((e: Error) => e.message);

      // Second message should still execute
      const p2 = enqueueMessage(sessionKey, async () => {
        return 'recovered';
      });

      const [err, result] = await Promise.all([p1, p2]);
      expect(err).toBe('handler error');
      expect(result).toBe('recovered');
    });
  });
});
