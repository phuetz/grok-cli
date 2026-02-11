/**
 * Commands Module
 *
 * This module manages the CLI command system, including:
 * - Slash commands (e.g., /help, /mode)
 * - Custom commands defined in .codebuddy/commands/
 * - Enhanced command handlers for special features
 * - Specialized command implementations (compression, watch mode, etc.)
 *
 * @module Commands
 */

// Slash commands
export {
  SlashCommandManager,
  getSlashCommandManager,
  resetSlashCommandManager,
} from "./slash-commands.js";
export type {
  SlashCommand,
  SlashCommandArgument,
  SlashCommandResult,
} from "./slash-commands.js";

// Custom commands
export {
  CustomCommandLoader,
  getCustomCommandLoader,
  type CustomCommand,
} from "./custom-commands.js";

// Enhanced command handler
export {
  EnhancedCommandHandler,
  getEnhancedCommandHandler,
  resetEnhancedCommandHandler,
  type CommandHandlerResult,
} from "./enhanced-command-handler.js";

// Gemini CLI inspired
export {
  compressContext,
  createCompressedMessages,
  formatCompressResult,
  type CompressResult,
} from "./compress.js";

export {
  isShellCommand,
  extractCommand,
  executeShellCommand,
  executeInteractiveCommand,
  type ShellResult,
} from "./shell-prefix.js";

// Aider inspired
export {
  WatchModeManager,
  extractAIComments,
  removeAIComment,
  type AIComment,
  type WatchConfig,
} from "./watch-mode.js";

// GitHub Copilot CLI inspired
export {
  generateBranchName,
  isGitRepo,
  getCurrentBranch,
  type DelegateConfig,
  type DelegateResult,
} from "./delegate.js";
