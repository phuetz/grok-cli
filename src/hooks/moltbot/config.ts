/**
 * Moltbot Hooks Default Configuration
 *
 * Default configuration values and templates for the Moltbot hooks system.
 */

import * as path from "path";
import * as os from "os";

import type { MoltbotHooksConfig } from "./types.js";

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_MOLTBOT_CONFIG: MoltbotHooksConfig = {
  intro: {
    enabled: true,
    sources: [
      {
        id: "project-intro",
        type: "file",
        path: ".codebuddy/intro_hook.txt",
        priority: 1,
        enabled: true,
        description: "Project-specific AI role and instructions",
      },
      {
        id: "project-readme",
        type: "file",
        path: ".codebuddy/README.md",
        priority: 2,
        enabled: true,
        description: "Project documentation for context",
      },
      {
        id: "global-intro",
        type: "file",
        path: path.join(os.homedir(), ".codebuddy", "intro_hook.txt"),
        priority: 3,
        enabled: true,
        description: "Global AI role and instructions",
      },
    ],
    combineMode: "prepend",
    maxLength: 8000,
  },
  persistence: {
    enabled: true,
    storageType: "json",
    storagePath: path.join(os.homedir(), ".codebuddy", "sessions"),
    maxSessions: 50,
    maxMessagesPerSession: 500,
    autoSaveInterval: 30000, // 30 seconds
    compressOldSessions: true,
  },
  commandLog: {
    enabled: true,
    logPath: path.join(os.homedir(), ".codebuddy", "logs"),
    logLevel: "standard",
    rotateDaily: true,
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 30,
    includeTimestamps: true,
    includeSessionId: true,
    redactSecrets: true,
    secretPatterns: [
      "(api[_-]?key|apikey)[\"']?\\s*[:=]\\s*[\"']?([a-zA-Z0-9_-]{20,})",
      "(password|passwd|pwd)[\"']?\\s*[:=]\\s*[\"']?([^\"'\\s]+)",
      "(secret|token)[\"']?\\s*[:=]\\s*[\"']?([a-zA-Z0-9_-]{16,})",
      "(bearer)\\s+([a-zA-Z0-9._-]+)",
    ],
  },
};

// ============================================================================
// Templates
// ============================================================================

/**
 * Default intro hook template (like Moltbot's intro_hook.txt)
 */
export const DEFAULT_INTRO_HOOK_TEMPLATE = `# AI Role Configuration
# Edit this file to customize your AI assistant's behavior

## Your Role
You are an expert software developer and helpful coding assistant.

## Personality
- Be concise and direct
- Explain your reasoning when making decisions
- Ask clarifying questions when requirements are unclear
- Prioritize code quality and maintainability

## Project Context
[Describe your project here - its purpose, main technologies, coding standards]

## Rules
1. Always follow existing code patterns in this project
2. Write tests for new functionality
3. Document complex logic with comments
4. Prefer simple solutions over clever ones

## Forbidden Actions
- Never commit sensitive data (API keys, passwords)
- Never delete files without confirmation
- Never run destructive commands without warning
`;

/**
 * Default global intro hook template
 */
export const DEFAULT_GLOBAL_INTRO_TEMPLATE = `# Global AI Configuration
# This applies to all projects unless overridden by project-specific intro_hook.txt

## Default Behavior
- Be helpful and professional
- Follow best practices for each programming language
- Prioritize security and performance

## Coding Standards
- Use meaningful variable and function names
- Keep functions small and focused
- Write self-documenting code
`;
