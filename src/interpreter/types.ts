/**
 * Interpreter Types
 *
 * Types for Open Interpreter-inspired features:
 * - Profiles (fast, vision, safe, local, coding)
 * - Safe modes (off, ask, auto)
 * - Auto-run mode
 * - Budget/token tracking
 */

// ============================================================================
// Safe Mode
// ============================================================================

/**
 * Safe mode levels:
 * - off: Execute without confirmation
 * - ask: Ask for confirmation before execution
 * - auto: Automatically approve safe operations, ask for dangerous ones
 */
export type SafeMode = 'off' | 'ask' | 'auto';

// ============================================================================
// Profile System
// ============================================================================

export interface InterpreterProfile {
  /** Profile identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** LLM provider (grok, openai, anthropic, lmstudio, ollama, gemini) */
  provider: string;
  /** Model name */
  model: string;
  /** Base URL for API */
  baseURL?: string;
  /** API key (or reference like $GROK_API_KEY) */
  apiKey?: string;
  /** Auto-run mode */
  autoRun: boolean;
  /** Safe mode level */
  safeMode: SafeMode;
  /** Maximum budget in dollars */
  maxBudget?: number;
  /** Custom system instructions */
  customInstructions?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Max tokens per response */
  maxTokens?: number;
  /** Enabled capabilities */
  capabilities?: ProfileCapabilities;
  /** Tool restrictions */
  toolRestrictions?: ToolRestrictions;
}

export interface ProfileCapabilities {
  /** Enable vision/screen control */
  vision?: boolean;
  /** Enable code execution */
  codeExecution?: boolean;
  /** Enable file operations */
  fileOperations?: boolean;
  /** Enable web search */
  webSearch?: boolean;
  /** Enable browser automation */
  browserAutomation?: boolean;
  /** Enable shell commands */
  shellCommands?: boolean;
}

export interface ToolRestrictions {
  /** Allowed tools (whitelist) */
  allowedTools?: string[];
  /** Denied tools (blacklist) */
  deniedTools?: string[];
  /** Allowed file paths */
  allowedPaths?: string[];
  /** Denied file paths */
  deniedPaths?: string[];
  /** Allowed shell commands */
  allowedCommands?: string[];
  /** Denied shell commands */
  deniedCommands?: string[];
}

// ============================================================================
// Token & Budget Tracking
// ============================================================================

export interface TokenUsage {
  /** Input tokens used */
  input: number;
  /** Output tokens used */
  output: number;
  /** Total tokens used */
  total: number;
  /** Cached tokens (if supported) */
  cached?: number;
}

export interface CostBreakdown {
  /** Input cost in dollars */
  inputCost: number;
  /** Output cost in dollars */
  outputCost: number;
  /** Total cost in dollars */
  totalCost: number;
  /** Currency (default: USD) */
  currency: string;
}

export interface BudgetStatus {
  /** Maximum budget set */
  maxBudget: number;
  /** Current spend */
  currentSpend: number;
  /** Remaining budget */
  remaining: number;
  /** Percentage used */
  percentUsed: number;
  /** Is budget exceeded */
  exceeded: boolean;
}

export interface UsageStats {
  /** Token usage */
  tokens: TokenUsage;
  /** Cost breakdown */
  cost: CostBreakdown;
  /** Budget status */
  budget: BudgetStatus;
  /** Number of requests */
  requestCount: number;
  /** Session start time */
  sessionStart: Date;
  /** Last request time */
  lastRequest?: Date;
}

// ============================================================================
// Interpreter State
// ============================================================================

export interface InterpreterState {
  /** Current active profile */
  activeProfile: InterpreterProfile;
  /** Auto-run enabled */
  autoRun: boolean;
  /** Safe mode level */
  safeMode: SafeMode;
  /** Custom instructions */
  customInstructions?: string;
  /** Usage statistics */
  usage: UsageStats;
  /** Conversation history */
  conversationId?: string;
  /** Is currently processing */
  isProcessing: boolean;
  /** Loop mode enabled */
  loopMode: boolean;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  tokenCount?: number;
  cost?: number;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface ChatResult {
  /** Response content */
  content: string;
  /** Tools that were called */
  toolCalls?: ToolCall[];
  /** Tool execution results */
  toolResults?: ToolResult[];
  /** Tokens used for this request */
  tokens: TokenUsage;
  /** Cost for this request */
  cost: number;
  /** Whether execution was auto-approved */
  autoApproved: boolean;
  /** Any pending approvals needed */
  pendingApprovals?: PendingApproval[];
}

export interface PendingApproval {
  id: string;
  type: 'tool' | 'file' | 'shell' | 'network';
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  action: () => Promise<ToolResult>;
}

// ============================================================================
// Events
// ============================================================================

export interface InterpreterEvents {
  /** Profile changed */
  'profile:changed': (profile: InterpreterProfile) => void;
  /** Safe mode changed */
  'safeMode:changed': (mode: SafeMode) => void;
  /** Auto-run changed */
  'autoRun:changed': (enabled: boolean) => void;
  /** Budget warning (80% used) */
  'budget:warning': (status: BudgetStatus) => void;
  /** Budget exceeded */
  'budget:exceeded': (status: BudgetStatus) => void;
  /** Token usage updated */
  'usage:updated': (usage: UsageStats) => void;
  /** Approval needed */
  'approval:needed': (approval: PendingApproval) => void;
  /** Tool executed */
  'tool:executed': (name: string, result: ToolResult) => void;
  /** Error occurred */
  'error': (error: Error) => void;
}

// ============================================================================
// Configuration
// ============================================================================

export interface InterpreterConfig {
  /** Path to profiles directory */
  profilesDir: string;
  /** Default profile to load */
  defaultProfile: string;
  /** Global max budget (can be overridden by profile) */
  globalMaxBudget?: number;
  /** Enable usage persistence */
  persistUsage: boolean;
  /** Usage persistence path */
  usagePath?: string;
  /** Model pricing (per 1M tokens) */
  pricing: ModelPricing;
}

export interface ModelPricing {
  [model: string]: {
    input: number;  // $ per 1M input tokens
    output: number; // $ per 1M output tokens
  };
}

export const DEFAULT_MODEL_PRICING: ModelPricing = {
  // Grok
  'grok-3': { input: 3.00, output: 15.00 },
  'grok-3-mini': { input: 0.30, output: 0.50 },
  'grok-3-fast': { input: 5.00, output: 15.00 },
  'grok-2': { input: 2.00, output: 10.00 },
  'grok-beta': { input: 5.00, output: 15.00 },
  // Gemini
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  // Anthropic
  'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  // Local (free)
  'lmstudio': { input: 0, output: 0 },
  'ollama': { input: 0, output: 0 },
};

export const DEFAULT_INTERPRETER_CONFIG: InterpreterConfig = {
  profilesDir: '~/.codebuddy/profiles',
  defaultProfile: 'default',
  globalMaxBudget: 10.00,
  persistUsage: true,
  usagePath: '~/.codebuddy/usage.json',
  pricing: DEFAULT_MODEL_PRICING,
};
