/**
 * E2E integration tests for the channel message processing system.
 *
 * Tests the full flow: session isolation → DM pairing → route resolution → lane queue serialization.
 */

import {
  getSessionKey,
  checkDMPairing,
  resolveRoute,
  enqueueMessage,
  resetChannelLaneQueue,
  type InboundMessage,
} from '../../src/channels/index.js';
import { resetSessionIsolator } from '../../src/channels/session-isolation.js';
import { resetDMPairing } from '../../src/channels/dm-pairing.js';
import { resetPeerRouter } from '../../src/channels/peer-routing.js';

function makeMessage(overrides: Partial<InboundMessage> = {}): InboundMessage {
  return {
    id: `msg-${Date.now()}`,
    content: 'hello',
    channel: { type: 'telegram' as const, id: 'chan-1', name: 'test' },
    sender: { id: 'user-1', name: 'Alice' },
    timestamp: new Date(),
    raw: {},
    ...overrides,
  } as InboundMessage;
}

describe('Channel System E2E', () => {
  beforeEach(() => {
    resetSessionIsolator();
    resetDMPairing();
    resetPeerRouter();
    resetChannelLaneQueue();
  });

  afterEach(() => {
    resetChannelLaneQueue();
  });

  describe('Full message flow', () => {
    it('should process a message through session isolation + DM pairing + route resolution', async () => {
      const msg = makeMessage();

      // Step 1: Session key
      const sessionKey = getSessionKey(msg);
      expect(sessionKey).toBeDefined();
      expect(typeof sessionKey).toBe('string');

      // Step 2: DM pairing check
      const pairingStatus = await checkDMPairing(msg);
      expect(pairingStatus).toBeDefined();
      expect(pairingStatus.approved).toBe(true); // DM pairing disabled by default

      // Step 3: Route resolution
      const route = resolveRoute(msg);
      // No routes configured, should return null
      expect(route).toBeNull();

      // Step 4: Lane queue serialization
      const result = await enqueueMessage(sessionKey!, async () => 'processed');
      expect(result).toBe('processed');
    });

    it('should assign different session keys to different channels', () => {
      const msg1 = makeMessage({ channel: { type: 'telegram' as const, id: 'chan-1', name: 'a' } });
      const msg2 = makeMessage({ channel: { type: 'discord' as const, id: 'chan-2', name: 'b' } });

      const key1 = getSessionKey(msg1);
      const key2 = getSessionKey(msg2);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
    });

    it('should assign same session key for same channel + user', () => {
      const msg1 = makeMessage({ content: 'hello' });
      const msg2 = makeMessage({ content: 'world' });

      expect(getSessionKey(msg1)).toBe(getSessionKey(msg2));
    });
  });

  describe('Lane queue serialization', () => {
    it('should serialize messages for the same session', async () => {
      const order: number[] = [];

      const p1 = enqueueMessage('session-A', async () => {
        order.push(1);
        await new Promise(r => setTimeout(r, 50));
        order.push(2);
      });

      const p2 = enqueueMessage('session-A', async () => {
        order.push(3);
      });

      await Promise.all([p1, p2]);
      expect(order).toEqual([1, 2, 3]);
    });

    it('should allow parallel processing for different sessions', async () => {
      const startTimes: Record<string, number> = {};

      const p1 = enqueueMessage('session-X', async () => {
        startTimes['X'] = Date.now();
        await new Promise(r => setTimeout(r, 100));
      });

      const p2 = enqueueMessage('session-Y', async () => {
        startTimes['Y'] = Date.now();
        await new Promise(r => setTimeout(r, 100));
      });

      await Promise.all([p1, p2]);
      // Both should start within a small window (parallel)
      expect(Math.abs(startTimes['X'] - startTimes['Y'])).toBeLessThan(50);
    });
  });
});
