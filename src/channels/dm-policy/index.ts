/**
 * DM Pairing Policy Module
 *
 * Intelligent message routing with policy evaluation and sender reputation.
 *
 * Features:
 * - Rule-based policy evaluation
 * - Sender reputation tracking
 * - Rate limiting
 * - Challenge/verification system
 * - Automatic spam detection
 */

// Types
export type {
  DMPolicyAction,
  ChallengeType,
  ConditionType,
  ComparisonOperator,
  DMCondition,
  DMPolicyRule,
  RateLimitConfig,
  ReputationFlag,
  SenderReputation,
  InteractionResult,
  PolicyDecision,
  MessageContext,
  PolicyEngineConfig,
  PolicyEvents,
} from './types.js';

export {
  DEFAULT_POLICY_ENGINE_CONFIG,
} from './types.js';

// Engine
export {
  DMPolicyEngine,
  getDMPolicyEngine,
  resetDMPolicyEngine,
} from './engine.js';
