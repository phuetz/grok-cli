/**
 * Plugins module - Plugin marketplace, sandbox execution, and plugin system
 */

export {
  PluginMarketplace,
  getPluginMarketplace,
  resetPluginMarketplace,
  type Plugin,
  type Author,
  type PluginCategory,
  type Permission,
  type PluginConfigSchema,
  type InstalledPlugin,
  type PluginSearchResult,
  type PluginReview,
  type PluginInstance,
  type PluginAPI,
  type CommandContext,
  type CommandHandler,
  type HookHandler,
  type ToolDefinition,
  type ProviderDefinition,
  type MarketplaceConfig,
} from "./marketplace.js";

export {
  PluginSandbox,
  createPluginSandbox,
  type SandboxOptions,
  type SandboxPermission,
  type SandboxMessage,
  type SandboxAPI,
} from "./sandbox-worker.js";

export {
  PluginManager,
  getPluginManager,
  resetPluginManager,
  type PluginType,
  type PluginManifest,
  type PluginContext,
  type SystemPlugin,
  type ToolPlugin,
  type MiddlewarePlugin,
  type LoadedPlugin,
} from "./plugin-system.js";
