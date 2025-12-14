/**
 * GROK_HOME - Centralized configuration directory management
 *
 * Supports the GROK_HOME environment variable to customize the location
 * of Grok CLI configuration files and data (like VIBE_HOME in Mistral Vibe).
 *
 * Default: ~/.grok/
 *
 * Usage:
 *   export GROK_HOME="/path/to/custom/home"
 *   grok "your prompt"
 *
 * Directory structure:
 *   $GROK_HOME/
 *   ├── config.toml          # Configuration file
 *   ├── user-settings.json   # User settings
 *   ├── .env                 # API keys
 *   ├── grok.db              # SQLite database
 *   ├── agents/              # Custom agents
 *   ├── prompts/             # Custom system prompts
 *   ├── commands/            # Custom slash commands
 *   ├── themes/              # Custom themes
 *   ├── personas/            # AI personas
 *   ├── memory/              # Persistent memory
 *   ├── sessions/            # Session data
 *   ├── checkpoints/         # File checkpoints
 *   ├── tasks/               # Background tasks
 *   ├── branches/            # Conversation branches
 *   ├── cache/               # Cache data
 *   └── logs/                # Log files
 */

import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Get the GROK_HOME directory path
 *
 * Priority:
 * 1. GROK_HOME environment variable
 * 2. ~/.grok/ (default)
 */
export function getGrokHome(): string {
  return process.env.GROK_HOME || path.join(os.homedir(), '.grok');
}

/**
 * Get a path within GROK_HOME
 *
 * @param relativePath - Path relative to GROK_HOME (e.g., 'agents', 'config.toml')
 * @returns Absolute path
 */
export function getGrokPath(...relativePath: string[]): string {
  return path.join(getGrokHome(), ...relativePath);
}

/**
 * Get the agents directory path
 */
export function getAgentsDir(): string {
  return getGrokPath('agents');
}

/**
 * Get the prompts directory path
 */
export function getPromptsDir(): string {
  return getGrokPath('prompts');
}

/**
 * Get the commands directory path
 */
export function getCommandsDir(): string {
  return getGrokPath('commands');
}

/**
 * Get the themes directory path
 */
export function getThemesDir(): string {
  return getGrokPath('themes');
}

/**
 * Get the database path
 */
export function getDatabasePath(): string {
  return getGrokPath('grok.db');
}

/**
 * Get the user settings path
 */
export function getUserSettingsPath(): string {
  return getGrokPath('user-settings.json');
}

/**
 * Get the sessions directory path
 */
export function getSessionsDir(): string {
  return getGrokPath('sessions');
}

/**
 * Get the memory directory path
 */
export function getMemoryDir(): string {
  return getGrokPath('memory');
}

/**
 * Get the checkpoints directory path
 */
export function getCheckpointsDir(): string {
  return getGrokPath('checkpoints');
}

/**
 * Get the cache directory path
 */
export function getCacheDir(): string {
  return getGrokPath('cache');
}

/**
 * Get the tasks directory path
 */
export function getTasksDir(): string {
  return getGrokPath('tasks');
}

/**
 * Get the branches directory path
 */
export function getBranchesDir(): string {
  return getGrokPath('branches');
}

/**
 * Get the personas directory path
 */
export function getPersonasDir(): string {
  return getGrokPath('personas');
}

/**
 * Get the offline data directory path
 */
export function getOfflineDir(): string {
  return getGrokPath('offline');
}

/**
 * Ensure GROK_HOME directory exists
 */
export function ensureGrokHome(): void {
  const grokHome = getGrokHome();
  if (!fs.existsSync(grokHome)) {
    fs.mkdirSync(grokHome, { recursive: true });
  }
}

/**
 * Ensure a subdirectory exists within GROK_HOME
 */
export function ensureGrokDir(...relativePath: string[]): string {
  const dir = getGrokPath(...relativePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Check if custom GROK_HOME is set
 */
export function isCustomGrokHome(): boolean {
  return !!process.env.GROK_HOME;
}

/**
 * Format GROK_HOME info for display
 */
export function formatGrokHomeInfo(): string {
  const grokHome = getGrokHome();
  const isCustom = isCustomGrokHome();

  return `GROK_HOME: ${grokHome}${isCustom ? ' (custom)' : ' (default)'}`;
}
