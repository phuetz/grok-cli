/**
 * Moltbot Hooks Type Definitions
 *
 * All interfaces and types for the Moltbot-inspired hooks system.
 */

// ============================================================================
// Intro/Readme Types
// ============================================================================

/**
 * Intro/Readme configuration
 */
export interface IntroConfig {
  enabled: boolean;
  sources: IntroSource[];
  combineMode: "prepend" | "append" | "replace";
  maxLength?: number;
}

export interface IntroSource {
  id: string;
  type: "file" | "inline" | "url";
  path?: string;
  content?: string;
  url?: string;
  priority: number;
  enabled: boolean;
  description?: string;
}

export interface IntroResult {
  content: string;
  sources: string[];
  truncated: boolean;
}

// ============================================================================
// Session Persistence Types
// ============================================================================

/**
 * Session persistence configuration
 */
export interface SessionPersistenceConfig {
  enabled: boolean;
  storageType: "json" | "sqlite";
  storagePath: string;
  maxSessions: number;
  maxMessagesPerSession: number;
  autoSaveInterval: number; // milliseconds
  compressOldSessions: boolean;
}

export interface PersistedSession {
  id: string;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
  messages: PersistedMessage[];
  metadata: Record<string, unknown>;
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolCalls?: PersistedToolCall[];
}

export interface PersistedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  timestamp: string;
}

// ============================================================================
// Command Logging Types
// ============================================================================

/**
 * Command logging configuration
 */
export interface CommandLogConfig {
  enabled: boolean;
  logPath: string;
  logLevel: "minimal" | "standard" | "verbose";
  rotateDaily: boolean;
  maxLogSize: number; // bytes
  maxLogFiles: number;
  includeTimestamps: boolean;
  includeSessionId: boolean;
  redactSecrets: boolean;
  secretPatterns: string[];
}

export interface CommandLogEntry {
  timestamp: string;
  sessionId?: string;
  type: "tool_call" | "bash" | "file_edit" | "file_create" | "api_call" | "user_input" | "assistant_response";
  action: string;
  details: Record<string, unknown>;
  duration?: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// Combined Configuration Types
// ============================================================================

/**
 * Combined Moltbot hooks configuration
 */
export interface MoltbotHooksConfig {
  intro: IntroConfig;
  persistence: SessionPersistenceConfig;
  commandLog: CommandLogConfig;
}

// ============================================================================
// Setup Types
// ============================================================================

/**
 * Setup options for Moltbot hooks
 */
export interface MoltbotSetupOptions {
  enableIntroHook: boolean;
  enableSessionPersistence: boolean;
  enableCommandLogging: boolean;
  introContent?: string;
  projectLevel?: boolean;
  globalLevel?: boolean;
}

/**
 * Setup result
 */
export interface MoltbotSetupResult {
  success: boolean;
  filesCreated: string[];
  errors: string[];
}
