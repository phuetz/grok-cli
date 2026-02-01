/**
 * DM Policy Engine Tests
 */

import {
  DMPolicyEngine,
  DEFAULT_POLICY_ENGINE_CONFIG,
} from '../../../src/channels/dm-policy/index.js';
import type {
  DMPolicyRule,
  MessageContext,
  PolicyDecision,
} from '../../../src/channels/dm-policy/index.js';

describe('DMPolicyEngine', () => {
  let engine: DMPolicyEngine;

  const createContext = (overrides: Partial<MessageContext> = {}): MessageContext => ({
    messageId: 'msg-1',
    senderId: 'sender-1',
    channelType: 'telegram',
    content: 'Hello world',
    hasAttachments: false,
    isFirstContact: false,
    timestamp: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    engine = new DMPolicyEngine();
  });

  afterEach(() => {
    engine.shutdown();
  });

  describe('rule management', () => {
    it('should have default rules', () => {
      const rules = engine.getAllRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should add custom rule', () => {
      engine.addRule({
        id: 'custom-rule',
        name: 'Custom Rule',
        priority: 50,
        enabled: true,
        conditions: [
          { type: 'channel', operator: 'eq', value: 'slack' },
        ],
        action: 'allow',
      });

      const rule = engine.getRule('custom-rule');
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Custom Rule');
    });

    it('should remove rule', () => {
      engine.addRule({
        id: 'to-remove',
        name: 'Remove Me',
        priority: 50,
        enabled: true,
        conditions: [],
        action: 'allow',
      });

      expect(engine.removeRule('to-remove')).toBe(true);
      expect(engine.getRule('to-remove')).toBeUndefined();
    });

    it('should enable rule', () => {
      engine.addRule({
        id: 'disabled',
        name: 'Disabled',
        priority: 50,
        enabled: false,
        conditions: [],
        action: 'allow',
      });

      expect(engine.enableRule('disabled')).toBe(true);
      expect(engine.getRule('disabled')?.enabled).toBe(true);
    });

    it('should disable rule', () => {
      engine.addRule({
        id: 'enabled',
        name: 'Enabled',
        priority: 50,
        enabled: true,
        conditions: [],
        action: 'allow',
      });

      expect(engine.disableRule('enabled')).toBe(true);
      expect(engine.getRule('enabled')?.enabled).toBe(false);
    });

    it('should sort rules by priority', () => {
      engine.addRule({
        id: 'low-priority',
        name: 'Low',
        priority: 10,
        enabled: true,
        conditions: [],
        action: 'allow',
      });

      engine.addRule({
        id: 'high-priority',
        name: 'High',
        priority: 500,
        enabled: true,
        conditions: [],
        action: 'deny',
      });

      const sorted = engine.getSortedRules();
      expect(sorted[0].id).toBe('high-priority');
    });
  });

  describe('policy evaluation', () => {
    beforeEach(() => {
      // Clear default rules for testing
      for (const rule of engine.getAllRules()) {
        engine.removeRule(rule.id);
      }
    });

    it('should use default action when no rule matches', () => {
      const context = createContext();
      const decision = engine.evaluate(context);

      expect(decision.action).toBe(DEFAULT_POLICY_ENGINE_CONFIG.defaultAction);
    });

    it('should match sender condition', () => {
      engine.addRule({
        id: 'match-sender',
        name: 'Match Sender',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'sender', operator: 'eq', value: 'vip-sender' },
        ],
        action: 'allow',
      });

      const decision = engine.evaluate(createContext({ senderId: 'vip-sender' }));
      expect(decision.action).toBe('allow');
      expect(decision.matchedRule?.id).toBe('match-sender');
    });

    it('should match channel condition', () => {
      engine.addRule({
        id: 'match-channel',
        name: 'Match Channel',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'channel', operator: 'eq', value: 'discord' },
        ],
        action: 'deny',
      });

      const decision = engine.evaluate(createContext({ channelType: 'discord' }));
      expect(decision.action).toBe('deny');
    });

    it('should match content with contains operator', () => {
      engine.addRule({
        id: 'match-content',
        name: 'Match Content',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'content', operator: 'contains', value: 'secret' },
        ],
        action: 'queue',
      });

      const decision = engine.evaluate(createContext({ content: 'This is a secret message' }));
      expect(decision.action).toBe('queue');
    });

    it('should match content with regex', () => {
      engine.addRule({
        id: 'match-regex',
        name: 'Match Regex',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'content', operator: 'match', value: '\\d{4}-\\d{4}' },
        ],
        action: 'challenge',
        challengeType: 'question',
      });

      const decision = engine.evaluate(createContext({ content: 'Card: 1234-5678' }));
      expect(decision.action).toBe('challenge');
      expect(decision.challenge?.type).toBe('question');
    });

    it('should match first contact condition', () => {
      engine.addRule({
        id: 'first-contact',
        name: 'First Contact',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'first_contact', operator: 'eq', value: true },
        ],
        action: 'challenge',
        challengeType: 'captcha',
      });

      const decision = engine.evaluate(createContext({ isFirstContact: true }));
      expect(decision.action).toBe('challenge');
    });

    it('should match attachment condition', () => {
      engine.addRule({
        id: 'has-attachment',
        name: 'Has Attachment',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'attachment', operator: 'eq', value: true },
        ],
        action: 'queue',
        queueName: 'attachment-review',
      });

      const decision = engine.evaluate(createContext({ hasAttachments: true }));
      expect(decision.action).toBe('queue');
      expect(decision.queueName).toBe('attachment-review');
    });

    it('should match keyword condition', () => {
      engine.addRule({
        id: 'keyword-match',
        name: 'Keyword Match',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'keyword', operator: 'eq', value: ['spam', 'advertisement'] },
        ],
        action: 'deny',
      });

      const decision = engine.evaluate(createContext({ content: 'This is not spam at all' }));
      expect(decision.action).toBe('deny');
    });

    it('should support negation', () => {
      engine.addRule({
        id: 'negate',
        name: 'Negate',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'channel', operator: 'eq', value: 'telegram', negate: true },
        ],
        action: 'deny',
      });

      // Should match because condition is negated
      const decision = engine.evaluate(createContext({ channelType: 'slack' }));
      expect(decision.action).toBe('deny');

      // Should not match because channel is telegram
      const decision2 = engine.evaluate(createContext({ channelType: 'telegram' }));
      expect(decision2.action).toBe(DEFAULT_POLICY_ENGINE_CONFIG.defaultAction);
    });

    it('should require all conditions to match (AND logic)', () => {
      engine.addRule({
        id: 'multi-condition',
        name: 'Multi Condition',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'channel', operator: 'eq', value: 'telegram' },
          { type: 'first_contact', operator: 'eq', value: true },
        ],
        action: 'challenge',
        challengeType: 'question',
      });

      // Only first condition matches
      const decision1 = engine.evaluate(createContext({
        channelType: 'telegram',
        isFirstContact: false,
      }));
      expect(decision1.action).toBe(DEFAULT_POLICY_ENGINE_CONFIG.defaultAction);

      // Both conditions match
      const decision2 = engine.evaluate(createContext({
        channelType: 'telegram',
        isFirstContact: true,
      }));
      expect(decision2.action).toBe('challenge');
    });

    it('should use forward action correctly', () => {
      engine.addRule({
        id: 'forward-rule',
        name: 'Forward',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'keyword', operator: 'eq', value: ['urgent', 'emergency'] },
        ],
        action: 'forward',
        forwardTo: 'priority-queue',
      });

      const decision = engine.evaluate(createContext({ content: 'This is urgent!' }));
      expect(decision.action).toBe('forward');
      expect(decision.forwardTo).toBe('priority-queue');
    });
  });

  describe('reputation management', () => {
    it('should create reputation for new sender', () => {
      const reputation = engine.getReputation('new-sender');

      expect(reputation).toBeDefined();
      expect(reputation.score).toBe(DEFAULT_POLICY_ENGINE_CONFIG.initialReputationScore);
      expect(reputation.flags).toContain('new');
    });

    it('should update reputation on positive interaction', () => {
      engine.updateReputation({
        senderId: 'test-sender',
        type: 'positive',
        scoreAdjustment: 10,
      });

      const reputation = engine.getReputation('test-sender');
      expect(reputation.score).toBeGreaterThan(DEFAULT_POLICY_ENGINE_CONFIG.initialReputationScore);
      expect(reputation.positiveInteractions).toBe(1);
    });

    it('should update reputation on negative interaction', () => {
      engine.updateReputation({
        senderId: 'test-sender',
        type: 'negative',
        scoreAdjustment: -10,
      });

      const reputation = engine.getReputation('test-sender');
      expect(reputation.score).toBeLessThan(DEFAULT_POLICY_ENGINE_CONFIG.initialReputationScore);
      expect(reputation.negativeInteractions).toBe(1);
    });

    it('should cap reputation at max', () => {
      engine.updateReputation({
        senderId: 'test-sender',
        type: 'positive',
        scoreAdjustment: 1000,
      });

      const reputation = engine.getReputation('test-sender');
      expect(reputation.score).toBe(DEFAULT_POLICY_ENGINE_CONFIG.maxReputationScore);
    });

    it('should cap reputation at min', () => {
      engine.updateReputation({
        senderId: 'test-sender',
        type: 'negative',
        scoreAdjustment: -1000,
      });

      const reputation = engine.getReputation('test-sender');
      expect(reputation.score).toBe(DEFAULT_POLICY_ENGINE_CONFIG.minReputationScore);
    });

    it('should add and remove flags', () => {
      engine.updateReputation({
        senderId: 'test-sender',
        type: 'positive',
        scoreAdjustment: 0,
        addFlags: ['trusted', 'verified'],
      });

      let reputation = engine.getReputation('test-sender');
      expect(reputation.flags).toContain('trusted');
      expect(reputation.flags).toContain('verified');

      engine.updateReputation({
        senderId: 'test-sender',
        type: 'neutral',
        scoreAdjustment: 0,
        removeFlags: ['trusted'],
      });

      reputation = engine.getReputation('test-sender');
      expect(reputation.flags).not.toContain('trusted');
      expect(reputation.flags).toContain('verified');
    });

    it('should block sender', () => {
      engine.blockSender('bad-sender', 'Spam');

      expect(engine.isSenderBlocked('bad-sender')).toBe(true);

      const reputation = engine.getReputation('bad-sender');
      expect(reputation.flags).toContain('blocked');
      expect(reputation.score).toBe(DEFAULT_POLICY_ENGINE_CONFIG.minReputationScore);
    });

    it('should unblock sender', () => {
      engine.blockSender('to-unblock', 'Test');
      engine.unblockSender('to-unblock');

      expect(engine.isSenderBlocked('to-unblock')).toBe(false);

      const reputation = engine.getReputation('to-unblock');
      expect(reputation.flags).not.toContain('blocked');
    });

    it('should trust sender', () => {
      engine.trustSender('good-sender');

      const reputation = engine.getReputation('good-sender');
      expect(reputation.flags).toContain('trusted');
      expect(reputation.score).toBeGreaterThan(DEFAULT_POLICY_ENGINE_CONFIG.initialReputationScore);
    });

    it('should mark sender as suspicious', () => {
      engine.markSuspicious('sus-sender');

      const reputation = engine.getReputation('sus-sender');
      expect(reputation.flags).toContain('suspicious');
      expect(reputation.score).toBeLessThan(DEFAULT_POLICY_ENGINE_CONFIG.initialReputationScore);
    });
  });

  describe('reputation-based rules', () => {
    beforeEach(() => {
      // Keep only reputation-based rules
      for (const rule of engine.getAllRules()) {
        if (!rule.id.includes('reputation') && !rule.id.includes('trusted')) {
          engine.removeRule(rule.id);
        }
      }
    });

    it('should match reputation condition', () => {
      engine.addRule({
        id: 'high-rep',
        name: 'High Reputation',
        priority: 100,
        enabled: true,
        conditions: [
          { type: 'reputation', operator: 'gte', value: 70 },
        ],
        action: 'allow',
      });

      // Set high reputation
      engine.updateReputation({
        senderId: 'high-rep-sender',
        type: 'positive',
        scoreAdjustment: 30,
      });

      const decision = engine.evaluate(createContext({ senderId: 'high-rep-sender' }));
      expect(decision.action).toBe('allow');
    });
  });

  describe('events', () => {
    it('should emit rule:added event', () => {
      const handler = jest.fn();
      engine.on('rule:added', handler);

      engine.addRule({
        id: 'new-rule',
        name: 'New',
        priority: 50,
        enabled: true,
        conditions: [],
        action: 'allow',
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should emit decision:made event', () => {
      const handler = jest.fn();
      engine.on('decision:made', handler);

      engine.evaluate(createContext());

      expect(handler).toHaveBeenCalled();
    });

    it('should emit reputation:updated event', () => {
      const handler = jest.fn();
      engine.on('reputation:updated', handler);

      engine.updateReputation({
        senderId: 'test',
        type: 'positive',
        scoreAdjustment: 5,
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should emit sender:blocked event', () => {
      const handler = jest.fn();
      engine.on('sender:blocked', handler);

      engine.blockSender('blocked-sender', 'Test reason');

      expect(handler).toHaveBeenCalledWith('blocked-sender', 'Test reason');
    });

    it('should emit challenge:issued event', () => {
      // Clear all rules first
      for (const rule of engine.getAllRules()) {
        engine.removeRule(rule.id);
      }

      const handler = jest.fn();
      engine.on('challenge:issued', handler);

      engine.addRule({
        id: 'challenge-rule',
        name: 'Challenge',
        priority: 100,
        enabled: true,
        conditions: [],
        action: 'challenge',
        challengeType: 'captcha',
      });

      engine.evaluate(createContext());

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    it('should return correct stats', () => {
      const stats = engine.getStats();

      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.enabledRules).toBeGreaterThan(0);
      expect(stats.trackedSenders).toBe(0);
    });

    it('should track senders', () => {
      engine.getReputation('sender-1');
      engine.getReputation('sender-2');

      const stats = engine.getStats();
      expect(stats.trackedSenders).toBe(2);
    });

    it('should track blocked senders', () => {
      engine.blockSender('bad-1', 'Reason');
      engine.blockSender('bad-2', 'Reason');

      const stats = engine.getStats();
      expect(stats.blockedSenders).toBe(2);
    });

    it('should track trusted senders', () => {
      engine.trustSender('good-1');
      engine.trustSender('good-2');

      const stats = engine.getStats();
      expect(stats.trustedSenders).toBe(2);
    });
  });
});
