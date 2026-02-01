/**
 * DM Pairing Policy Types
 *
 * Type definitions for intelligent message routing with sender reputation.
 */

// ============================================================================
// Policy Actions
// ============================================================================

/**
 * Actions that can be taken on a message
 */
export type DMPolicyAction =
  | 'allow'       // Allow the message through
  | 'deny'        // Block the message
  | 'queue'       // Queue for later processing
  | 'forward'     // Forward to another handler
  | 'challenge'   // Require sender verification
  | 'rate_limit'; // Apply rate limiting

/**
 * Challenge types for sender verification
 */
export type ChallengeType =
  | 'captcha'      // CAPTCHA challenge
  | 'question'     // Simple question
  | 'code'         // Verification code
  | 'oauth';       // OAuth verification

// ============================================================================
// Conditions
// ============================================================================

/**
 * Condition types for policy matching
 */
export type ConditionType =
  | 'sender'           // Match sender ID or pattern
  | 'channel'          // Match channel type
  | 'content'          // Match message content
  | 'reputation'       // Match reputation score
  | 'time'             // Match time of day
  | 'rate'             // Match message rate
  | 'first_contact'    // Is first contact from sender
  | 'attachment'       // Has attachments
  | 'mention'          // Mentions specific entities
  | 'keyword';         // Contains keywords

/**
 * Comparison operators
 */
export type ComparisonOperator =
  | 'eq'   // Equal
  | 'ne'   // Not equal
  | 'gt'   // Greater than
  | 'gte'  // Greater than or equal
  | 'lt'   // Less than
  | 'lte'  // Less than or equal
  | 'in'   // In list
  | 'nin'  // Not in list
  | 'match' // Regex match
  | 'contains'; // Contains substring

/**
 * Policy condition
 */
export interface DMCondition {
  /** Condition type */
  type: ConditionType;
  /** Field to check (for complex types) */
  field?: string;
  /** Comparison operator */
  operator: ComparisonOperator;
  /** Value to compare against */
  value: unknown;
  /** Negate the condition */
  negate?: boolean;
}

// ============================================================================
// Policy Rules
// ============================================================================

/**
 * Policy rule
 */
export interface DMPolicyRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Description */
  description?: string;
  /** Priority (higher = evaluated first) */
  priority: number;
  /** Is rule enabled */
  enabled: boolean;
  /** Conditions to match (AND logic) */
  conditions: DMCondition[];
  /** Action to take when matched */
  action: DMPolicyAction;
  /** Forward target (for 'forward' action) */
  forwardTo?: string;
  /** Challenge type (for 'challenge' action) */
  challengeType?: ChallengeType;
  /** Rate limit (for 'rate_limit' action) */
  rateLimit?: RateLimitConfig;
  /** Queue name (for 'queue' action) */
  queueName?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum messages */
  maxMessages: number;
  /** Time window (ms) */
  windowMs: number;
  /** Action when limit exceeded */
  onExceeded: 'deny' | 'queue' | 'challenge';
}

// ============================================================================
// Sender Reputation
// ============================================================================

/**
 * Reputation flags
 */
export type ReputationFlag =
  | 'verified'      // Verified sender
  | 'trusted'       // Trusted sender
  | 'new'           // New sender
  | 'suspicious'    // Suspicious activity
  | 'spammer'       // Known spammer
  | 'blocked'       // Blocked sender
  | 'vip';          // VIP sender

/**
 * Sender reputation
 */
export interface SenderReputation {
  /** Sender ID */
  senderId: string;
  /** Reputation score (0-100) */
  score: number;
  /** Total interactions */
  interactions: number;
  /** Positive interactions */
  positiveInteractions: number;
  /** Negative interactions */
  negativeInteractions: number;
  /** Reputation flags */
  flags: ReputationFlag[];
  /** First seen */
  firstSeen: Date;
  /** Last seen */
  lastSeen: Date;
  /** Last interaction result */
  lastInteractionResult?: 'positive' | 'negative' | 'neutral';
  /** Custom attributes */
  attributes?: Record<string, unknown>;
}

/**
 * Interaction result for reputation updates
 */
export interface InteractionResult {
  /** Sender ID */
  senderId: string;
  /** Result type */
  type: 'positive' | 'negative' | 'neutral';
  /** Score adjustment */
  scoreAdjustment: number;
  /** Flags to add */
  addFlags?: ReputationFlag[];
  /** Flags to remove */
  removeFlags?: ReputationFlag[];
  /** Reason */
  reason?: string;
}

// ============================================================================
// Policy Decision
// ============================================================================

/**
 * Policy evaluation decision
 */
export interface PolicyDecision {
  /** Action to take */
  action: DMPolicyAction;
  /** Rule that matched (if any) */
  matchedRule?: DMPolicyRule;
  /** Reason for decision */
  reason: string;
  /** Forward target (if action is 'forward') */
  forwardTo?: string;
  /** Challenge config (if action is 'challenge') */
  challenge?: {
    type: ChallengeType;
    data?: unknown;
  };
  /** Rate limit info (if action is 'rate_limit') */
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
  /** Queue name (if action is 'queue') */
  queueName?: string;
  /** Sender reputation at time of decision */
  senderReputation?: SenderReputation;
  /** Evaluation timestamp */
  evaluatedAt: Date;
}

// ============================================================================
// Message Context
// ============================================================================

/**
 * Message context for policy evaluation
 */
export interface MessageContext {
  /** Message ID */
  messageId: string;
  /** Sender ID */
  senderId: string;
  /** Channel type */
  channelType: string;
  /** Channel ID */
  channelId?: string;
  /** Message content */
  content: string;
  /** Has attachments */
  hasAttachments: boolean;
  /** Attachment types */
  attachmentTypes?: string[];
  /** Mentions */
  mentions?: string[];
  /** Is first contact */
  isFirstContact: boolean;
  /** Timestamp */
  timestamp: Date;
  /** Custom attributes */
  attributes?: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Policy engine configuration
 */
export interface PolicyEngineConfig {
  /** Default action when no rule matches */
  defaultAction: DMPolicyAction;
  /** Enable reputation tracking */
  enableReputation: boolean;
  /** Initial reputation score for new senders */
  initialReputationScore: number;
  /** Reputation decay rate per day */
  reputationDecayRate: number;
  /** Maximum reputation score */
  maxReputationScore: number;
  /** Minimum reputation score */
  minReputationScore: number;
  /** Cache TTL for reputation lookups (ms) */
  reputationCacheTTLMs: number;
}

/**
 * Default policy engine configuration
 */
export const DEFAULT_POLICY_ENGINE_CONFIG: PolicyEngineConfig = {
  defaultAction: 'allow',
  enableReputation: true,
  initialReputationScore: 50,
  reputationDecayRate: 1, // Points per day
  maxReputationScore: 100,
  minReputationScore: 0,
  reputationCacheTTLMs: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// Events
// ============================================================================

/**
 * Policy events
 */
export interface PolicyEvents {
  'rule:added': (rule: DMPolicyRule) => void;
  'rule:removed': (ruleId: string) => void;
  'rule:matched': (rule: DMPolicyRule, context: MessageContext) => void;
  'decision:made': (decision: PolicyDecision, context: MessageContext) => void;
  'reputation:updated': (reputation: SenderReputation) => void;
  'sender:blocked': (senderId: string, reason: string) => void;
  'sender:unblocked': (senderId: string) => void;
  'challenge:issued': (senderId: string, type: ChallengeType) => void;
  'challenge:completed': (senderId: string, success: boolean) => void;
  'error': (error: Error) => void;
}
