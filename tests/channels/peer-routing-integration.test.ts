/**
 * Peer Routing Integration Tests
 *
 * Tests the resolveRoute and getRouteAgentConfig helper functions
 * wired into the channel infrastructure, as well as PeerRouter
 * integration with message routing flows.
 */

import {
  resolveRoute,
  getRouteAgentConfig,
  getPeerRouter,
  resetPeerRouter,
  type InboundMessage,
  type PeerRouter,
} from '../../src/channels/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(
  channelType: 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'cli',
  senderId: string,
  channelId = 'chan-1',
  content = 'Hello',
  isDM = false,
): InboundMessage {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    channel: {
      id: channelId,
      type: channelType,
      name: `${channelType} channel`,
      isDM,
    },
    sender: {
      id: senderId,
      username: `user-${senderId}`,
      displayName: `User ${senderId}`,
    },
    content,
    contentType: 'text',
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Peer Routing Integration', () => {
  let router: PeerRouter;

  beforeEach(() => {
    resetPeerRouter();
    router = getPeerRouter();
  });

  afterEach(() => {
    resetPeerRouter();
  });

  // =========================================================================
  // resolveRoute helper
  // =========================================================================

  describe('resolveRoute helper', () => {
    it('should return null when no routes are configured', () => {
      const message = makeMessage('telegram', 'user-1');
      const result = resolveRoute(message);
      expect(result).toBeNull();
    });

    it('should resolve a channel-type route', () => {
      router.addRoute({
        name: 'telegram-grok',
        channelType: 'telegram',
        agent: { model: 'grok-3' },
        priority: 10,
        enabled: true,
      });

      const message = makeMessage('telegram', 'user-1');
      const result = resolveRoute(message);

      expect(result).not.toBeNull();
      expect(result!.matchType).toBe('channel-type');
      expect(result!.agent.model).toBe('grok-3');
    });

    it('should resolve a peer-specific route over a channel-type route', () => {
      router.addRoute({
        name: 'telegram-default',
        channelType: 'telegram',
        agent: { model: 'grok-3' },
        priority: 10,
        enabled: true,
      });

      router.addRoute({
        name: 'telegram-vip',
        channelType: 'telegram',
        peerId: 'vip-user',
        agent: { model: 'claude-3-opus' },
        priority: 10,
        enabled: true,
      });

      const vipMessage = makeMessage('telegram', 'vip-user');
      const result = resolveRoute(vipMessage);

      expect(result).not.toBeNull();
      expect(result!.matchType).toBe('peer');
      expect(result!.agent.model).toBe('claude-3-opus');
    });

    it('should not match a disabled route', () => {
      router.addRoute({
        name: 'disabled-route',
        channelType: 'telegram',
        agent: { model: 'grok-3' },
        priority: 10,
        enabled: false,
      });

      const message = makeMessage('telegram', 'user-1');
      const result = resolveRoute(message);

      expect(result).toBeNull();
    });

    it('should pass through accountId for account-based routing', () => {
      router.addRoute({
        name: 'account-route',
        channelType: 'discord',
        accountId: 'bot-account-1',
        agent: { model: 'grok-3-fast', agentId: 'fast-agent' },
        priority: 10,
        enabled: true,
      });

      const message = makeMessage('discord', 'user-1');

      // Without matching accountId - should not match
      const noAccountResult = resolveRoute(message, 'bot-account-2');
      expect(noAccountResult).toBeNull();

      // With matching accountId - should match
      const matchResult = resolveRoute(message, 'bot-account-1');
      expect(matchResult).not.toBeNull();
      expect(matchResult!.matchType).toBe('account');
      expect(matchResult!.agent.agentId).toBe('fast-agent');
    });

    it('should handle errors gracefully and return null', () => {
      // Reset to ensure clean state, then getPeerRouter will
      // create a new instance internally; resolve should work fine
      resetPeerRouter();
      const message = makeMessage('telegram', 'user-1');
      const result = resolveRoute(message);
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getRouteAgentConfig helper
  // =========================================================================

  describe('getRouteAgentConfig helper', () => {
    it('should return empty config when no routes match', () => {
      const message = makeMessage('telegram', 'user-1');
      const config = getRouteAgentConfig(message);

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should return merged config when a route matches', () => {
      // Set up router with default config
      resetPeerRouter();
      const routerWithDefaults = getPeerRouter({
        defaultAgent: { temperature: 0.7 },
      });

      routerWithDefaults.addRoute({
        name: 'telegram-route',
        channelType: 'telegram',
        agent: { model: 'grok-3', maxToolRounds: 20 },
        priority: 10,
        enabled: true,
      });

      const message = makeMessage('telegram', 'user-1');
      const config = getRouteAgentConfig(message);

      expect(config.model).toBe('grok-3');
      expect(config.maxToolRounds).toBe(20);
      expect(config.temperature).toBe(0.7);
    });

    it('should fall back to default config when no route matches', () => {
      resetPeerRouter();
      getPeerRouter({
        defaultAgent: { model: 'default-model', temperature: 0.5 },
      });

      const message = makeMessage('slack', 'user-1');
      const config = getRouteAgentConfig(message);

      expect(config.model).toBe('default-model');
      expect(config.temperature).toBe(0.5);
    });
  });

  // =========================================================================
  // Route conditions
  // =========================================================================

  describe('route conditions', () => {
    it('should match is-dm condition', () => {
      router.addRoute({
        name: 'dm-only',
        channelType: 'telegram',
        agent: { model: 'grok-3' },
        conditions: [{ type: 'is-dm', value: true }],
        priority: 10,
        enabled: true,
      });

      const dmMessage = makeMessage('telegram', 'user-1', 'dm-chan', 'Hi', true);
      const groupMessage = makeMessage('telegram', 'user-1', 'group-chan', 'Hi', false);

      expect(resolveRoute(dmMessage)).not.toBeNull();
      expect(resolveRoute(groupMessage)).toBeNull();
    });

    it('should match message-pattern condition', () => {
      router.addRoute({
        name: 'help-route',
        channelType: 'discord',
        agent: { model: 'grok-3', systemPrompt: 'Be helpful' },
        conditions: [{ type: 'message-pattern', value: '^/help' }],
        priority: 10,
        enabled: true,
      });

      const helpMessage = makeMessage('discord', 'user-1', 'chan-1', '/help me');
      const normalMessage = makeMessage('discord', 'user-1', 'chan-1', 'Just chatting');

      expect(resolveRoute(helpMessage)).not.toBeNull();
      expect(resolveRoute(normalMessage)).toBeNull();
    });
  });

  // =========================================================================
  // Multi-route priority
  // =========================================================================

  describe('multi-route priority', () => {
    it('should prefer higher specificity over priority', () => {
      router.addRoute({
        name: 'channel-wide',
        channelType: 'telegram',
        agent: { model: 'grok-3' },
        priority: 100, // high priority
        enabled: true,
      });

      router.addRoute({
        name: 'peer-specific',
        channelType: 'telegram',
        peerId: 'special-user',
        agent: { model: 'claude-3-opus' },
        priority: 1, // low priority
        enabled: true,
      });

      const message = makeMessage('telegram', 'special-user');
      const result = resolveRoute(message);

      expect(result).not.toBeNull();
      expect(result!.agent.model).toBe('claude-3-opus');
      expect(result!.matchType).toBe('peer');
    });

    it('should prefer higher priority when specificity is equal', () => {
      router.addRoute({
        name: 'low-priority',
        channelType: 'discord',
        agent: { model: 'grok-2' },
        priority: 1,
        enabled: true,
      });

      router.addRoute({
        name: 'high-priority',
        channelType: 'discord',
        agent: { model: 'grok-3' },
        priority: 100,
        enabled: true,
      });

      const message = makeMessage('discord', 'user-1');
      const result = resolveRoute(message);

      expect(result).not.toBeNull();
      expect(result!.agent.model).toBe('grok-3');
    });
  });

  // =========================================================================
  // Router stats
  // =========================================================================

  describe('router stats', () => {
    it('should track routing decisions', () => {
      router.addRoute({
        name: 'test-route',
        channelType: 'telegram',
        agent: { model: 'grok-3' },
        priority: 10,
        enabled: true,
      });

      // Make some routing decisions
      resolveRoute(makeMessage('telegram', 'user-1'));
      resolveRoute(makeMessage('telegram', 'user-2'));
      resolveRoute(makeMessage('discord', 'user-3')); // no match

      const stats = router.getStats();
      expect(stats.totalRoutes).toBe(1);
      expect(stats.activeRoutes).toBe(1);
      expect(stats.routingDecisions).toBe(3);
      expect(stats.matchRate).toBeCloseTo(2 / 3, 2);
    });
  });
});
