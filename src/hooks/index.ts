/**
 * Hooks module - Event hooks and React hooks for input handling
 *
 * Features:
 * - Event hooks (hook-manager, hook-system)
 * - Lifecycle hooks (pre/post operations)
 * - Moltbot hooks (intro, persistence, command logging)
 * - React hooks for input handling
 */

export * from "./hook-manager.js";
export {
  HookSystem,
  getHookSystem,
  resetHookSystem,
  type HookType,
} from "./hook-system.js";
export * from "./use-enhanced-input.js";
export * from "./use-input-handler.js";
export * from "./use-input-history.js";

// Lifecycle hooks (pre/post operation hooks)
export {
  HooksManager,
  getHooksManager,
  initializeHooks,
  BUILTIN_HOOKS,
  DEFAULT_HOOKS_CONFIG,
  type HookType as LifecycleHookType,
  type HookContext,
  type HookDefinition,
  type HookResult,
  type HooksConfig,
} from "./lifecycle-hooks.js";

// Moltbot-inspired hooks (intro, persistence, command logging)
export {
  // Managers
  IntroHookManager,
  SessionPersistenceManager,
  CommandLogger,
  MoltbotHooksManager,
  // Singleton accessors
  getMoltbotHooksManager,
  resetMoltbotHooksManager,
  // Configuration
  DEFAULT_MOLTBOT_CONFIG,
  // Setup utilities (Moltbot-style)
  DEFAULT_INTRO_HOOK_TEMPLATE,
  DEFAULT_GLOBAL_INTRO_TEMPLATE,
  checkMoltbotSetup,
  setupMoltbotHooks,
  enableMoltbotHooks,
  disableMoltbotHooks,
  getIntroHookContent,
  setIntroHookContent,
  formatSetupStatus,
  // Types - Intro
  type IntroConfig,
  type IntroSource,
  type IntroResult,
  // Types - Session persistence
  type SessionPersistenceConfig,
  type PersistedSession,
  type PersistedMessage,
  type PersistedToolCall,
  // Types - Command logging
  type CommandLogConfig,
  type CommandLogEntry,
  // Types - Combined
  type MoltbotHooksConfig,
  // Types - Setup
  type MoltbotSetupOptions,
  type MoltbotSetupResult,
} from "./moltbot-hooks.js";
