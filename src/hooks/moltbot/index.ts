/**
 * Moltbot Hooks Module
 *
 * Barrel re-exports for the Moltbot-inspired hooks system.
 */

// Types
export type {
  IntroConfig,
  IntroSource,
  IntroResult,
  SessionPersistenceConfig,
  PersistedSession,
  PersistedMessage,
  PersistedToolCall,
  CommandLogConfig,
  CommandLogEntry,
  MoltbotHooksConfig,
  MoltbotSetupOptions,
  MoltbotSetupResult,
} from './types.js';

// Default configuration and templates
export {
  DEFAULT_MOLTBOT_CONFIG,
  DEFAULT_INTRO_HOOK_TEMPLATE,
  DEFAULT_GLOBAL_INTRO_TEMPLATE,
} from './config.js';

// Managers
export { IntroHookManager } from './intro-hook-manager.js';
export { SessionPersistenceManager } from './session-persistence-manager.js';
export { CommandLogger } from './command-logger.js';

// Combined manager and singleton
export {
  MoltbotHooksManager,
  getMoltbotHooksManager,
  resetMoltbotHooksManager,
} from './moltbot-hooks-manager.js';

// Setup utilities
export {
  checkMoltbotSetup,
  setupMoltbotHooks,
  enableMoltbotHooks,
  disableMoltbotHooks,
  getIntroHookContent,
  setIntroHookContent,
  formatSetupStatus,
} from './setup-utilities.js';
