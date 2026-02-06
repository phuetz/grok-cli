/**
 * Configuration Validation Module
 *
 * Barrel re-exports for all config validation schemas, types, and validators.
 */

// Schema definitions, type constants, and Zod schemas
export {
  // JSON Schema types
  type JSONSchema,
  type ValidationError,
  type ValidationResult,

  // Type constants
  AI_PROVIDERS,
  type AIProvider,
  AUTONOMY_LEVELS,
  type AutonomyLevel,
  AGENT_MODES,
  type AgentMode,
  HOOK_EVENTS,
  type HookEvent,
  THEMES,
  type Theme,

  // Zod schemas
  SettingsSchema,
  type Settings,
  UserSettingsSchema,
  type UserSettings,
  HookSchema,
  HooksConfigSchema,
  type HookConfig,
  type HooksConfig,
  MCPServerSchema,
  MCPConfigSchema,
  type MCPServerConfig,
  type MCPConfig,
  YoloConfigSchema,
  type YoloConfig,
  EnvVarsSchema,
  type EnvVars,

  // Schema registries
  ZOD_SCHEMAS,
  SCHEMAS,
} from './schema.js';

// Validators, classes, and functions
export {
  // Legacy validator
  ConfigValidator,
  getConfigValidator,
  validateStartupConfig,

  // Zod validator
  ZodConfigValidator,
  getZodConfigValidator,

  // Startup validation
  type StartupValidationResult,
  validateStartupConfigWithZod,
  isConfigValid,

  // Config loading
  loadValidatedSettings,
  loadValidatedUserSettings,

  // Command handler
  handleConfigValidateCommand,
} from './validators.js';
