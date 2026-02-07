/**
 * Agent Profile Types
 *
 * User-defined agent profiles that extend base operating modes
 * with custom configurations.
 *
 * @module agent/profiles
 */

import type { OperatingMode } from '../operating-modes.js';

/**
 * Safety level for an agent profile.
 */
export type SafetyLevel = 'strict' | 'standard' | 'permissive';

/**
 * An agent profile definition, loaded from JSON.
 */
export interface AgentProfile {
  /** Unique profile identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the profile's purpose */
  description: string;
  /** Safety level override */
  safety?: SafetyLevel;
  /** Base operating mode to extend */
  extends?: OperatingMode;
  /** Tool overrides */
  allowedTools?: string[] | 'all' | 'none';
  /** Blocked tools */
  blockedTools?: string[];
  /** System prompt addition */
  systemPromptAddition?: string;
  /** Max tool rounds override */
  maxToolRounds?: number;
  /** Enable extended thinking override */
  enableExtendedThinking?: boolean;
  /** Thinking budget override */
  thinkingBudget?: number;
  /** Preferred model override */
  preferredModel?: string;
  /** Max cost per request override */
  maxCostPerRequest?: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of loading agent profiles.
 */
export interface ProfileLoadResult {
  /** Successfully loaded profiles */
  profiles: AgentProfile[];
  /** Errors encountered during loading */
  errors: Array<{ file: string; error: string }>;
}
