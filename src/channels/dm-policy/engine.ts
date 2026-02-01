/**
 * DM Policy Engine
 *
 * Intelligent message routing with policy evaluation and sender reputation.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type {
  DMPolicyRule,
  DMCondition,
  PolicyDecision,
  MessageContext,
  SenderReputation,
  InteractionResult,
  PolicyEngineConfig,
  DMPolicyAction,
  ReputationFlag,
  ComparisonOperator,
  RateLimitConfig,
} from './types.js';
import { DEFAULT_POLICY_ENGINE_CONFIG } from './types.js';

// ============================================================================
// Rate Limiter
// ============================================================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
  resetAt: number;
}

// ============================================================================
// DM Policy Engine
// ============================================================================

/**
 * DM Policy Engine
 *
 * Evaluates messages against policy rules and manages sender reputation.
 */
export class DMPolicyEngine extends EventEmitter {
  private config: PolicyEngineConfig;
  private rules: Map<string, DMPolicyRule> = new Map();
  private reputations: Map<string, SenderReputation> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private reputationCache: Map<string, { reputation: SenderReputation; expiresAt: number }> = new Map();

  constructor(config: Partial<PolicyEngineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_POLICY_ENGINE_CONFIG, ...config };
    this.initializeDefaultRules();
  }

  // ============================================================================
  // Rule Management
  // ============================================================================

  /**
   * Add a policy rule
   */
  addRule(rule: DMPolicyRule): void {
    this.rules.set(rule.id, rule);
    this.emit('rule:added', rule);
  }

  /**
   * Remove a policy rule
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.emit('rule:removed', ruleId);
    }
    return deleted;
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): DMPolicyRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): DMPolicyRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules sorted by priority
   */
  getSortedRules(): DMPolicyRule[] {
    return this.getAllRules()
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enable a rule
   */
  enableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.enabled = true;
    return true;
  }

  /**
   * Disable a rule
   */
  disableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.enabled = false;
    return true;
  }

  // ============================================================================
  // Policy Evaluation
  // ============================================================================

  /**
   * Evaluate a message against all rules
   */
  evaluate(context: MessageContext): PolicyDecision {
    // Get sender reputation
    const reputation = this.getReputation(context.senderId);

    // Check rate limits first
    const rateLimitDecision = this.checkRateLimits(context);
    if (rateLimitDecision) {
      return rateLimitDecision;
    }

    // Evaluate rules in priority order
    const sortedRules = this.getSortedRules();

    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, context, reputation)) {
        const decision = this.createDecision(rule, context, reputation);
        this.emit('rule:matched', rule, context);
        this.emit('decision:made', decision, context);
        return decision;
      }
    }

    // No rule matched, use default action
    const defaultDecision: PolicyDecision = {
      action: this.config.defaultAction,
      reason: 'No matching rule, using default action',
      senderReputation: reputation,
      evaluatedAt: new Date(),
    };

    this.emit('decision:made', defaultDecision, context);
    return defaultDecision;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(
    rule: DMPolicyRule,
    context: MessageContext,
    reputation: SenderReputation
  ): boolean {
    // All conditions must match (AND logic)
    return rule.conditions.every(condition =>
      this.evaluateCondition(condition, context, reputation)
    );
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: DMCondition,
    context: MessageContext,
    reputation: SenderReputation
  ): boolean {
    let result: boolean;

    switch (condition.type) {
      case 'sender':
        result = this.compare(context.senderId, condition.operator, condition.value);
        break;

      case 'channel':
        result = this.compare(context.channelType, condition.operator, condition.value);
        break;

      case 'content':
        result = this.compare(context.content, condition.operator, condition.value);
        break;

      case 'reputation':
        result = this.compare(reputation.score, condition.operator, condition.value);
        break;

      case 'time': {
        const hour = context.timestamp.getHours();
        result = this.compare(hour, condition.operator, condition.value);
        break;
      }

      case 'first_contact':
        result = this.compare(context.isFirstContact, condition.operator, condition.value);
        break;

      case 'attachment':
        result = this.compare(context.hasAttachments, condition.operator, condition.value);
        break;

      case 'mention':
        result = this.compare(context.mentions || [], condition.operator, condition.value);
        break;

      case 'keyword': {
        const hasKeyword = this.containsKeywords(
          context.content,
          condition.value as string[]
        );
        result = this.compare(hasKeyword, condition.operator, true);
        break;
      }

      case 'rate': {
        const rate = this.getMessageRate(context.senderId);
        result = this.compare(rate, condition.operator, condition.value);
        break;
      }

      default:
        result = false;
    }

    return condition.negate ? !result : result;
  }

  /**
   * Compare values with operator
   */
  private compare(actual: unknown, operator: ComparisonOperator, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;

      case 'ne':
        return actual !== expected;

      case 'gt':
        return (actual as number) > (expected as number);

      case 'gte':
        return (actual as number) >= (expected as number);

      case 'lt':
        return (actual as number) < (expected as number);

      case 'lte':
        return (actual as number) <= (expected as number);

      case 'in':
        return (expected as unknown[]).includes(actual);

      case 'nin':
        return !(expected as unknown[]).includes(actual);

      case 'match':
        return new RegExp(expected as string, 'i').test(actual as string);

      case 'contains':
        return (actual as string).toLowerCase().includes(
          (expected as string).toLowerCase()
        );

      default:
        return false;
    }
  }

  /**
   * Check if content contains keywords
   */
  private containsKeywords(content: string, keywords: string[]): boolean {
    const lowerContent = content.toLowerCase();
    return keywords.some(kw => lowerContent.includes(kw.toLowerCase()));
  }

  /**
   * Create decision from matched rule
   */
  private createDecision(
    rule: DMPolicyRule,
    context: MessageContext,
    reputation: SenderReputation
  ): PolicyDecision {
    const decision: PolicyDecision = {
      action: rule.action,
      matchedRule: rule,
      reason: `Matched rule: ${rule.name}`,
      senderReputation: reputation,
      evaluatedAt: new Date(),
    };

    if (rule.action === 'forward' && rule.forwardTo) {
      decision.forwardTo = rule.forwardTo;
    }

    if (rule.action === 'challenge' && rule.challengeType) {
      decision.challenge = {
        type: rule.challengeType,
      };
      this.emit('challenge:issued', context.senderId, rule.challengeType);
    }

    if (rule.action === 'queue' && rule.queueName) {
      decision.queueName = rule.queueName;
    }

    if (rule.action === 'deny') {
      // Check if we should block the sender
      if (reputation.score < 20) {
        this.blockSender(context.senderId, 'Low reputation score');
      }
    }

    return decision;
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  /**
   * Check rate limits for sender
   */
  private checkRateLimits(context: MessageContext): PolicyDecision | null {
    // Find applicable rate limit rules
    const rateLimitRules = this.getSortedRules().filter(r => r.rateLimit);

    for (const rule of rateLimitRules) {
      if (!rule.rateLimit) continue;

      // Check if rule conditions match
      const reputation = this.getReputation(context.senderId);
      if (!this.evaluateRule(rule, context, reputation)) continue;

      // Check rate limit
      const key = `${context.senderId}:${rule.id}`;
      const entry = this.getRateLimitEntry(key, rule.rateLimit);

      if (entry.count >= rule.rateLimit.maxMessages) {
        return {
          action: 'rate_limit',
          matchedRule: rule,
          reason: 'Rate limit exceeded',
          rateLimit: {
            remaining: 0,
            resetAt: new Date(entry.resetAt),
          },
          senderReputation: reputation,
          evaluatedAt: new Date(),
        };
      }

      // Increment counter
      entry.count++;
    }

    return null;
  }

  /**
   * Get or create rate limit entry
   */
  private getRateLimitEntry(key: string, config: RateLimitConfig): RateLimitEntry {
    const now = Date.now();
    let entry = this.rateLimits.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        windowStart: now,
        resetAt: now + config.windowMs,
      };
      this.rateLimits.set(key, entry);
    }

    return entry;
  }

  /**
   * Get current message rate for sender
   */
  private getMessageRate(senderId: string): number {
    let totalRate = 0;

    for (const [key, entry] of this.rateLimits) {
      if (key.startsWith(`${senderId}:`)) {
        const windowMs = entry.resetAt - entry.windowStart;
        const elapsedMs = Date.now() - entry.windowStart;
        if (elapsedMs > 0 && elapsedMs <= windowMs) {
          totalRate += entry.count / (elapsedMs / 60000); // messages per minute
        }
      }
    }

    return totalRate;
  }

  // ============================================================================
  // Reputation Management
  // ============================================================================

  /**
   * Get sender reputation
   */
  getReputation(senderId: string): SenderReputation {
    // Check cache
    const cached = this.reputationCache.get(senderId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.reputation;
    }

    // Get or create reputation
    let reputation = this.reputations.get(senderId);

    if (!reputation) {
      reputation = this.createReputation(senderId);
      this.reputations.set(senderId, reputation);
    }

    // Cache it
    this.reputationCache.set(senderId, {
      reputation,
      expiresAt: Date.now() + this.config.reputationCacheTTLMs,
    });

    return reputation;
  }

  /**
   * Create new reputation for sender
   */
  private createReputation(senderId: string): SenderReputation {
    return {
      senderId,
      score: this.config.initialReputationScore,
      interactions: 0,
      positiveInteractions: 0,
      negativeInteractions: 0,
      flags: ['new'],
      firstSeen: new Date(),
      lastSeen: new Date(),
    };
  }

  /**
   * Update sender reputation
   */
  updateReputation(result: InteractionResult): void {
    const reputation = this.getReputation(result.senderId);

    // Update counts
    reputation.interactions++;
    reputation.lastSeen = new Date();
    reputation.lastInteractionResult = result.type;

    switch (result.type) {
      case 'positive':
        reputation.positiveInteractions++;
        break;
      case 'negative':
        reputation.negativeInteractions++;
        break;
    }

    // Update score
    reputation.score = Math.max(
      this.config.minReputationScore,
      Math.min(
        this.config.maxReputationScore,
        reputation.score + result.scoreAdjustment
      )
    );

    // Update flags
    if (result.addFlags) {
      for (const flag of result.addFlags) {
        if (!reputation.flags.includes(flag)) {
          reputation.flags.push(flag);
        }
      }
    }

    if (result.removeFlags) {
      reputation.flags = reputation.flags.filter(f => !result.removeFlags!.includes(f));
    }

    // Remove 'new' flag after some interactions
    if (reputation.interactions > 5 && reputation.flags.includes('new')) {
      reputation.flags = reputation.flags.filter(f => f !== 'new');
    }

    // Invalidate cache
    this.reputationCache.delete(result.senderId);

    this.emit('reputation:updated', reputation);
  }

  /**
   * Block a sender
   */
  blockSender(senderId: string, reason: string): void {
    const reputation = this.getReputation(senderId);

    if (!reputation.flags.includes('blocked')) {
      reputation.flags.push('blocked');
      reputation.score = this.config.minReputationScore;
      this.reputationCache.delete(senderId);

      this.emit('sender:blocked', senderId, reason);
    }
  }

  /**
   * Unblock a sender
   */
  unblockSender(senderId: string): void {
    const reputation = this.getReputation(senderId);

    if (reputation.flags.includes('blocked')) {
      reputation.flags = reputation.flags.filter(f => f !== 'blocked');
      reputation.score = this.config.initialReputationScore;
      this.reputationCache.delete(senderId);

      this.emit('sender:unblocked', senderId);
    }
  }

  /**
   * Check if sender is blocked
   */
  isSenderBlocked(senderId: string): boolean {
    const reputation = this.getReputation(senderId);
    return reputation.flags.includes('blocked');
  }

  /**
   * Mark sender as trusted
   */
  trustSender(senderId: string): void {
    this.updateReputation({
      senderId,
      type: 'positive',
      scoreAdjustment: 30,
      addFlags: ['trusted'],
      removeFlags: ['suspicious', 'new'],
    });
  }

  /**
   * Mark sender as suspicious
   */
  markSuspicious(senderId: string): void {
    this.updateReputation({
      senderId,
      type: 'negative',
      scoreAdjustment: -20,
      addFlags: ['suspicious'],
      removeFlags: ['trusted'],
    });
  }

  // ============================================================================
  // Default Rules
  // ============================================================================

  /**
   * Initialize default policy rules
   */
  private initializeDefaultRules(): void {
    // Block known spam patterns
    this.addRule({
      id: 'block-spam-keywords',
      name: 'Block Spam Keywords',
      description: 'Block messages containing common spam keywords',
      priority: 100,
      enabled: true,
      conditions: [
        {
          type: 'keyword',
          operator: 'eq',
          value: ['buy now', 'free money', 'click here', 'act now', 'limited time'],
        },
      ],
      action: 'deny',
    });

    // Block senders with very low reputation
    this.addRule({
      id: 'block-low-reputation',
      name: 'Block Low Reputation',
      description: 'Block senders with very low reputation score',
      priority: 90,
      enabled: true,
      conditions: [
        {
          type: 'reputation',
          operator: 'lt',
          value: 10,
        },
      ],
      action: 'deny',
    });

    // Challenge first-time senders with low reputation
    this.addRule({
      id: 'challenge-new-senders',
      name: 'Challenge New Senders',
      description: 'Challenge first-time senders',
      priority: 50,
      enabled: true,
      conditions: [
        {
          type: 'first_contact',
          operator: 'eq',
          value: true,
        },
        {
          type: 'reputation',
          operator: 'lt',
          value: 40,
        },
      ],
      action: 'challenge',
      challengeType: 'question',
    });

    // Rate limit all senders
    this.addRule({
      id: 'global-rate-limit',
      name: 'Global Rate Limit',
      description: 'Limit message rate for all senders',
      priority: 80,
      enabled: true,
      conditions: [],
      action: 'allow',
      rateLimit: {
        maxMessages: 30,
        windowMs: 60000, // 1 minute
        onExceeded: 'queue',
      },
    });

    // Allow trusted senders
    this.addRule({
      id: 'allow-trusted',
      name: 'Allow Trusted',
      description: 'Always allow trusted senders',
      priority: 200,
      enabled: true,
      conditions: [
        {
          type: 'reputation',
          operator: 'gte',
          value: 80,
        },
      ],
      action: 'allow',
    });
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get engine statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    trackedSenders: number;
    blockedSenders: number;
    trustedSenders: number;
    activeRateLimits: number;
  } {
    const reputations = Array.from(this.reputations.values());

    return {
      totalRules: this.rules.size,
      enabledRules: this.getSortedRules().length,
      trackedSenders: reputations.length,
      blockedSenders: reputations.filter(r => r.flags.includes('blocked')).length,
      trustedSenders: reputations.filter(r => r.flags.includes('trusted')).length,
      activeRateLimits: this.rateLimits.size,
    };
  }

  /**
   * Clear all rate limits
   */
  clearRateLimits(): void {
    this.rateLimits.clear();
  }

  /**
   * Clear reputation cache
   */
  clearReputationCache(): void {
    this.reputationCache.clear();
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.rateLimits.clear();
    this.reputationCache.clear();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let policyEngineInstance: DMPolicyEngine | null = null;

/**
 * Get DM policy engine instance
 */
export function getDMPolicyEngine(config?: Partial<PolicyEngineConfig>): DMPolicyEngine {
  if (!policyEngineInstance) {
    policyEngineInstance = new DMPolicyEngine(config);
  }
  return policyEngineInstance;
}

/**
 * Reset DM policy engine instance
 */
export function resetDMPolicyEngine(): void {
  if (policyEngineInstance) {
    policyEngineInstance.shutdown();
    policyEngineInstance = null;
  }
}

export default DMPolicyEngine;
