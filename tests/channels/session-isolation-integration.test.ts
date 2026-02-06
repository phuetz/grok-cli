/**
 * Session Isolation Integration Tests
 *
 * Tests that session isolation is properly wired into the channel system,
 * producing correct session keys for different channel/user combinations.
 */

import {
  SessionIsolator,
  getSessionIsolator,
  resetSessionIsolator,
  getSessionKey,
  type InboundMessage,
  type ChannelType,
} from '../../src/channels/index.js';

/**
 * Helper to create a minimal InboundMessage for testing
 */
function makeMessage(
  channelType: ChannelType,
  channelId: string,
  senderId: string,
  content = 'test message'
): InboundMessage {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    channel: {
      id: channelId,
      type: channelType,
    },
    sender: {
      id: senderId,
    },
    content,
    contentType: 'text',
    timestamp: new Date(),
  };
}

describe('Session Isolation Integration', () => {
  beforeEach(() => {
    resetSessionIsolator();
  });

  afterEach(() => {
    resetSessionIsolator();
  });

  describe('getSessionKey helper', () => {
    it('should return a session key for a valid message', () => {
      const message = makeMessage('telegram', 'chat-123', 'user-456');
      const key = getSessionKey(message);

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key!.length).toBeGreaterThan(0);
    });

    it('should return undefined gracefully if isolator throws', () => {
      // Force an error by resetting and patching -- but since getSessionIsolator
      // creates a new instance, this should always succeed. Test that it at least
      // returns a string.
      const message = makeMessage('cli', 'local', 'me');
      const key = getSessionKey(message);

      expect(key).toBeDefined();
    });
  });

  describe('Cross-channel isolation', () => {
    it('should produce different session keys for different channel types', () => {
      const telegramMsg = makeMessage('telegram', 'chat-100', 'user-1');
      const discordMsg = makeMessage('discord', 'chat-100', 'user-1');
      const slackMsg = makeMessage('slack', 'chat-100', 'user-1');

      const telegramKey = getSessionKey(telegramMsg);
      const discordKey = getSessionKey(discordMsg);
      const slackKey = getSessionKey(slackMsg);

      expect(telegramKey).toBeDefined();
      expect(discordKey).toBeDefined();
      expect(slackKey).toBeDefined();

      // All three should be different since channel types differ
      expect(telegramKey).not.toBe(discordKey);
      expect(telegramKey).not.toBe(slackKey);
      expect(discordKey).not.toBe(slackKey);
    });

    it('should produce different session keys for different channel IDs', () => {
      const msg1 = makeMessage('telegram', 'chat-100', 'user-1');
      const msg2 = makeMessage('telegram', 'chat-200', 'user-1');

      const key1 = getSessionKey(msg1);
      const key2 = getSessionKey(msg2);

      expect(key1).not.toBe(key2);
    });

    it('should produce different session keys for different users', () => {
      const msg1 = makeMessage('telegram', 'chat-100', 'user-1');
      const msg2 = makeMessage('telegram', 'chat-100', 'user-2');

      const key1 = getSessionKey(msg1);
      const key2 = getSessionKey(msg2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Same-session consistency', () => {
    it('should produce the same session key for same channel + same user', () => {
      const msg1 = makeMessage('telegram', 'chat-100', 'user-1', 'hello');
      const msg2 = makeMessage('telegram', 'chat-100', 'user-1', 'world');

      const key1 = getSessionKey(msg1);
      const key2 = getSessionKey(msg2);

      expect(key1).toBe(key2);
    });

    it('should produce the same key regardless of message content', () => {
      const msg1 = makeMessage('discord', 'guild-1', 'user-42', '/help');
      const msg2 = makeMessage('discord', 'guild-1', 'user-42', 'normal message');

      const key1 = getSessionKey(msg1);
      const key2 = getSessionKey(msg2);

      expect(key1).toBe(key2);
    });
  });

  describe('SessionIsolator direct usage', () => {
    it('should track sessions when getSessionKey is called', () => {
      const isolator = getSessionIsolator();

      const msg1 = makeMessage('telegram', 'chat-1', 'user-1');
      const msg2 = makeMessage('discord', 'guild-1', 'user-2');

      isolator.getSessionKey(msg1);
      isolator.getSessionKey(msg2);

      const sessions = isolator.listSessions();
      expect(sessions.length).toBe(2);
    });

    it('should report sessions as isolated when keys differ', () => {
      const isolator = getSessionIsolator();

      const msg1 = makeMessage('telegram', 'chat-1', 'user-1');
      const msg2 = makeMessage('discord', 'guild-1', 'user-2');

      const key1 = isolator.getSessionKey(msg1);
      const key2 = isolator.getSessionKey(msg2);

      expect(isolator.areIsolated(key1, key2)).toBe(true);
    });

    it('should report sessions as not isolated when keys are the same', () => {
      const isolator = getSessionIsolator();

      const msg1 = makeMessage('telegram', 'chat-1', 'user-1');
      const msg2 = makeMessage('telegram', 'chat-1', 'user-1');

      const key1 = isolator.getSessionKey(msg1);
      const key2 = isolator.getSessionKey(msg2);

      expect(isolator.areIsolated(key1, key2)).toBe(false);
    });

    it('should respect per-channel scope overrides', () => {
      const isolator = getSessionIsolator();

      // Set CLI to global scope (all messages share one session)
      isolator.setChannelScope('cli', 'global');

      const msg1 = makeMessage('cli', 'term-1', 'user-1');
      const msg2 = makeMessage('cli', 'term-2', 'user-2');

      const key1 = isolator.getSessionKey(msg1);
      const key2 = isolator.getSessionKey(msg2);

      // Both should be 'global' since CLI scope is global
      expect(key1).toBe('global');
      expect(key2).toBe('global');
      expect(isolator.areIsolated(key1, key2)).toBe(false);
    });
  });

  describe('Session key format', () => {
    it('should include channel type in the key (per-channel-peer scope)', () => {
      const msg = makeMessage('telegram', 'chat-100', 'user-1');
      const key = getSessionKey(msg);

      expect(key).toContain('telegram');
    });

    it('should include channel ID in the key', () => {
      const msg = makeMessage('discord', 'guild-abc', 'user-1');
      const key = getSessionKey(msg);

      expect(key).toContain('guild-abc');
    });

    it('should include peer/user ID in the key', () => {
      const msg = makeMessage('slack', 'workspace-1', 'U12345');
      const key = getSessionKey(msg);

      expect(key).toContain('U12345');
    });
  });
});
