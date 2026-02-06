/**
 * Session Identity Tests
 *
 * Tests that session keys use canonical identities when identity links exist.
 * When two channel identities are linked, the session isolator should produce
 * the same session key for both, enabling cross-channel session sharing.
 */

import {
  SessionIsolator,
  resetSessionIsolator,
  getIdentityLinker,
  resetIdentityLinker,
  IdentityLinker,
  type InboundMessage,
  type ChannelType,
} from '../../src/channels/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Session Identity Integration', () => {
  let linker: IdentityLinker;
  let isolator: SessionIsolator;

  beforeEach(() => {
    resetSessionIsolator();
    resetIdentityLinker();
    linker = getIdentityLinker({ autoPersist: false });
    isolator = new SessionIsolator({ identityLinker: linker });
  });

  afterEach(() => {
    isolator.dispose();
    resetSessionIsolator();
    resetIdentityLinker();
  });

  // =========================================================================
  // Without identity links (baseline)
  // =========================================================================

  describe('without identity links', () => {
    it('should produce different session keys for same user on different channels', () => {
      const telegramMsg = makeMessage('telegram', 'chat-1', 'user-1');
      const discordMsg = makeMessage('discord', 'guild-1', 'user-1');

      const key1 = isolator.getSessionKey(telegramMsg);
      const key2 = isolator.getSessionKey(discordMsg);

      expect(key1).not.toBe(key2);
    });

    it('should produce the same session key for same user on same channel', () => {
      const msg1 = makeMessage('telegram', 'chat-1', 'user-1', 'hello');
      const msg2 = makeMessage('telegram', 'chat-1', 'user-1', 'world');

      const key1 = isolator.getSessionKey(msg1);
      const key2 = isolator.getSessionKey(msg2);

      expect(key1).toBe(key2);
    });
  });

  // =========================================================================
  // With identity links
  // =========================================================================

  describe('with identity links', () => {
    it('should produce the same session key for linked identities across channels', () => {
      linker.link(
        { channelType: 'telegram', peerId: 'tg-user-42' },
        { channelType: 'discord', peerId: 'dc-user-42' }
      );

      const telegramMsg = makeMessage('telegram', 'chat-1', 'tg-user-42');
      const discordMsg = makeMessage('discord', 'guild-1', 'dc-user-42');

      const key1 = isolator.getSessionKey(telegramMsg);
      const key2 = isolator.getSessionKey(discordMsg);

      expect(key1).toBe(key2);
    });

    it('should still produce different keys for unlinked identities', () => {
      // Link telegram user-1 and discord user-1
      linker.link(
        { channelType: 'telegram', peerId: 'user-1' },
        { channelType: 'discord', peerId: 'user-1' }
      );

      // user-2 is NOT linked
      const telegramMsg = makeMessage('telegram', 'chat-1', 'user-2');
      const discordMsg = makeMessage('discord', 'guild-1', 'user-2');

      const key1 = isolator.getSessionKey(telegramMsg);
      const key2 = isolator.getSessionKey(discordMsg);

      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for linked vs unlinked users', () => {
      linker.link(
        { channelType: 'telegram', peerId: 'linked-user' },
        { channelType: 'discord', peerId: 'linked-user-dc' }
      );

      const linkedMsg = makeMessage('telegram', 'chat-1', 'linked-user');
      const unlinkedMsg = makeMessage('telegram', 'chat-1', 'other-user');

      const key1 = isolator.getSessionKey(linkedMsg);
      const key2 = isolator.getSessionKey(unlinkedMsg);

      expect(key1).not.toBe(key2);
    });

    it('should unify three-way linked identities into one session', () => {
      linker.link(
        { channelType: 'telegram', peerId: 'user-tg' },
        { channelType: 'discord', peerId: 'user-dc' }
      );
      linker.link(
        { channelType: 'telegram', peerId: 'user-tg' },
        { channelType: 'slack', peerId: 'user-slack' }
      );

      const tgMsg = makeMessage('telegram', 'chat-1', 'user-tg');
      const dcMsg = makeMessage('discord', 'guild-1', 'user-dc');
      const slackMsg = makeMessage('slack', 'workspace-1', 'user-slack');

      const keyTg = isolator.getSessionKey(tgMsg);
      const keyDc = isolator.getSessionKey(dcMsg);
      const keySlack = isolator.getSessionKey(slackMsg);

      expect(keyTg).toBe(keyDc);
      expect(keyTg).toBe(keySlack);
    });
  });

  // =========================================================================
  // Dynamic linking
  // =========================================================================

  describe('dynamic linking', () => {
    it('should update session keys after identities are linked', () => {
      const tgMsg = makeMessage('telegram', 'chat-1', 'user-A');
      const dcMsg = makeMessage('discord', 'guild-1', 'user-B');

      // Before linking, keys should differ
      const keyBefore1 = isolator.getSessionKey(tgMsg);
      const keyBefore2 = isolator.getSessionKey(dcMsg);
      expect(keyBefore1).not.toBe(keyBefore2);

      // Link the identities
      linker.link(
        { channelType: 'telegram', peerId: 'user-A' },
        { channelType: 'discord', peerId: 'user-B' }
      );

      // After linking, keys should match
      const keyAfter1 = isolator.getSessionKey(tgMsg);
      const keyAfter2 = isolator.getSessionKey(dcMsg);
      expect(keyAfter1).toBe(keyAfter2);
    });

    it('should diverge session keys after unlinking', () => {
      linker.link(
        { channelType: 'telegram', peerId: 'user-X' },
        { channelType: 'discord', peerId: 'user-Y' }
      );

      const tgMsg = makeMessage('telegram', 'chat-1', 'user-X');
      const dcMsg = makeMessage('discord', 'guild-1', 'user-Y');

      // While linked, keys match
      const linkedKey1 = isolator.getSessionKey(tgMsg);
      const linkedKey2 = isolator.getSessionKey(dcMsg);
      expect(linkedKey1).toBe(linkedKey2);

      // Unlink discord
      linker.unlink({ channelType: 'discord', peerId: 'user-Y' });

      // After unlinking, keys should differ
      const unlinkedKey1 = isolator.getSessionKey(tgMsg);
      const unlinkedKey2 = isolator.getSessionKey(dcMsg);
      expect(unlinkedKey1).not.toBe(unlinkedKey2);
    });
  });

  // =========================================================================
  // setIdentityLinker
  // =========================================================================

  describe('setIdentityLinker', () => {
    it('should allow setting the identity linker after construction', () => {
      const plainIsolator = new SessionIsolator();

      const tgMsg = makeMessage('telegram', 'chat-1', 'user-A');
      const dcMsg = makeMessage('discord', 'guild-1', 'user-B');

      // No linker, keys differ
      const key1 = plainIsolator.getSessionKey(tgMsg);
      const key2 = plainIsolator.getSessionKey(dcMsg);
      expect(key1).not.toBe(key2);

      // Set the linker and add a link
      linker.link(
        { channelType: 'telegram', peerId: 'user-A' },
        { channelType: 'discord', peerId: 'user-B' }
      );
      plainIsolator.setIdentityLinker(linker);

      // Now keys should match
      const key3 = plainIsolator.getSessionKey(tgMsg);
      const key4 = plainIsolator.getSessionKey(dcMsg);
      expect(key3).toBe(key4);

      plainIsolator.dispose();
    });

    it('should allow removing the identity linker', () => {
      linker.link(
        { channelType: 'telegram', peerId: 'user-A' },
        { channelType: 'discord', peerId: 'user-B' }
      );

      const tgMsg = makeMessage('telegram', 'chat-1', 'user-A');
      const dcMsg = makeMessage('discord', 'guild-1', 'user-B');

      // With linker, keys match
      const key1 = isolator.getSessionKey(tgMsg);
      const key2 = isolator.getSessionKey(dcMsg);
      expect(key1).toBe(key2);

      // Remove linker
      isolator.setIdentityLinker(undefined);

      // Without linker, keys differ
      const key3 = isolator.getSessionKey(tgMsg);
      const key4 = isolator.getSessionKey(dcMsg);
      expect(key3).not.toBe(key4);
    });
  });

  // =========================================================================
  // Session tracking with identity
  // =========================================================================

  describe('session tracking', () => {
    it('should track a single session for linked identities', () => {
      linker.link(
        { channelType: 'telegram', peerId: 'user-1' },
        { channelType: 'discord', peerId: 'user-1-dc' }
      );

      const tgMsg = makeMessage('telegram', 'chat-1', 'user-1');
      const dcMsg = makeMessage('discord', 'guild-1', 'user-1-dc');

      isolator.getSessionKey(tgMsg);
      isolator.getSessionKey(dcMsg);

      // Both should map to the same session
      const sessions = isolator.listSessions();
      const uniqueKeys = new Set(sessions.map(s => s.key));
      expect(uniqueKeys.size).toBe(1);
    });

    it('should increment message count for linked identity sessions', () => {
      linker.link(
        { channelType: 'telegram', peerId: 'user-1' },
        { channelType: 'discord', peerId: 'user-1-dc' }
      );

      const tgMsg = makeMessage('telegram', 'chat-1', 'user-1');
      const dcMsg = makeMessage('discord', 'guild-1', 'user-1-dc');

      const key1 = isolator.getSessionKey(tgMsg);
      isolator.getSessionKey(dcMsg);
      isolator.getSessionKey(tgMsg);

      const session = isolator.getSession(key1);
      expect(session).toBeDefined();
      expect(session!.messageCount).toBe(3);
    });
  });
});
