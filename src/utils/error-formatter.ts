/**
 * Error Formatter Module
 *
 * Structured error output with suggestions and documentation links.
 * Designed for accessibility and clear communication.
 */

import { EXIT_CODES, ExitCode, getExitCodeDescription } from "./exit-codes.js";

/**
 * Error context for structured output
 */
export interface ErrorContext {
  /** Error code identifier */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional details about the error */
  details?: string;

  /** Actionable suggestion to fix the error */
  suggestion?: string;

  /** Link to documentation */
  docUrl?: string;

  /** Related error (cause) */
  cause?: Error;

  /** Exit code for CLI */
  exitCode?: ExitCode;
}

/**
 * Common error templates
 */
export const ERROR_TEMPLATES = {
  API_KEY_MISSING: {
    code: "API_KEY_MISSING",
    message: "API key is not configured",
    suggestion: "Run `grok config --set-api-key YOUR_KEY` or set GROK_API_KEY environment variable",
    docUrl: "https://github.com/phuetz/code-buddy#configuration",
    exitCode: EXIT_CODES.AUTHENTICATION_ERROR,
  },

  API_KEY_INVALID: {
    code: "API_KEY_INVALID",
    message: "API key is invalid or expired",
    suggestion: "Verify your API key at https://console.x.ai and update with `grok config --set-api-key`",
    docUrl: "https://github.com/phuetz/code-buddy#configuration",
    exitCode: EXIT_CODES.AUTHENTICATION_ERROR,
  },

  RATE_LIMITED: {
    code: "RATE_LIMITED",
    message: "API rate limit exceeded",
    suggestion: "Wait a few minutes before trying again, or upgrade your API plan",
    exitCode: EXIT_CODES.API_ERROR,
  },

  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    message: "Unable to connect to the API",
    suggestion: "Check your internet connection and try again",
    exitCode: EXIT_CODES.NETWORK_ERROR,
  },

  TIMEOUT: {
    code: "TIMEOUT",
    message: "Request timed out",
    suggestion: "Try again with a simpler request, or increase the timeout setting",
    exitCode: EXIT_CODES.TIMEOUT,
  },

  FILE_NOT_FOUND: {
    code: "FILE_NOT_FOUND",
    message: "File or directory not found",
    suggestion: "Verify the path exists and you have access to it",
    exitCode: EXIT_CODES.FILE_NOT_FOUND,
  },

  PERMISSION_DENIED: {
    code: "PERMISSION_DENIED",
    message: "Permission denied",
    suggestion: "Check file permissions or run with appropriate privileges",
    exitCode: EXIT_CODES.PERMISSION_DENIED,
  },

  COST_LIMIT: {
    code: "COST_LIMIT",
    message: "Session cost limit exceeded",
    suggestion: "Start a new session or increase MAX_COST environment variable",
    docUrl: "https://github.com/phuetz/code-buddy#cost-management",
    exitCode: EXIT_CODES.COST_LIMIT_EXCEEDED,
  },

  MODEL_NOT_FOUND: {
    code: "MODEL_NOT_FOUND",
    message: "Requested model is not available",
    suggestion: "Use `/model` to see available models",
    exitCode: EXIT_CODES.MODEL_NOT_AVAILABLE,
  },

  CONFIG_INVALID: {
    code: "CONFIG_INVALID",
    message: "Configuration file is invalid",
    suggestion: "Check the configuration file syntax or delete it to reset to defaults",
    docUrl: "https://github.com/phuetz/code-buddy#configuration",
    exitCode: EXIT_CODES.CONFIG_ERROR,
  },

  MCP_CONNECTION_FAILED: {
    code: "MCP_CONNECTION_FAILED",
    message: "Failed to connect to MCP server",
    suggestion: "Verify the MCP server is running and the configuration is correct",
    docUrl: "https://github.com/phuetz/code-buddy#mcp-servers",
    exitCode: EXIT_CODES.MCP_ERROR,
  },

  TOOL_FAILED: {
    code: "TOOL_FAILED",
    message: "Tool execution failed",
    suggestion: "Check tool parameters and try again",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
  },

  PATH_TRAVERSAL: {
    code: "PATH_TRAVERSAL",
    message: "Path traversal attempt blocked",
    suggestion: "Use paths within the project directory only",
    exitCode: EXIT_CODES.SECURITY_ERROR,
  },

  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    message: "Input validation failed",
    suggestion: "Check the input format and try again",
    exitCode: EXIT_CODES.VALIDATION_ERROR,
  },

  SESSION_EXPIRED: {
    code: "SESSION_EXPIRED",
    message: "Session has expired",
    suggestion: "Start a new session with `grok`",
    exitCode: EXIT_CODES.SESSION_ERROR,
  },

  CHECKPOINT_NOT_FOUND: {
    code: "CHECKPOINT_NOT_FOUND",
    message: "Checkpoint not found",
    suggestion: "Use `/checkpoints` to see available checkpoints",
    exitCode: EXIT_CODES.CHECKPOINT_ERROR,
  },

  MEMORY_LIMIT: {
    code: "MEMORY_LIMIT",
    message: "Memory limit exceeded",
    suggestion: "Try with smaller files or fewer concurrent operations",
    exitCode: EXIT_CODES.RESOURCE_ERROR,
  },

  DEPENDENCY_MISSING: {
    code: "DEPENDENCY_MISSING",
    message: "Required dependency is not installed",
    suggestion: "Run `npm install` or install the missing dependency",
    exitCode: EXIT_CODES.DEPENDENCY_ERROR,
  },

  SANDBOX_VIOLATION: {
    code: "SANDBOX_VIOLATION",
    message: "Operation blocked by sandbox",
    suggestion: "This command requires elevated permissions. Use --allow-dangerous or run in full-auto mode",
    docUrl: "https://github.com/phuetz/code-buddy#security-modes",
    exitCode: EXIT_CODES.SECURITY_ERROR,
  },

  CONTEXT_TOO_LARGE: {
    code: "CONTEXT_TOO_LARGE",
    message: "Context is too large for the model",
    suggestion: "Try with fewer files or use `/compact` to summarize context",
    exitCode: EXIT_CODES.CONTEXT_ERROR,
  },
} as const;

/**
 * Get package version for error reports
 */
function getVersion(): string {
  try {
    // This will be resolved at runtime
    return process.env.npm_package_version || "1.0.0";
  } catch {
    return "unknown";
  }
}

/**
 * Format error for terminal output
 */
export function formatError(ctx: ErrorContext): string {
  const lines: string[] = [];

  // Error header
  lines.push(`❌ Error: ${ctx.message}`);
  lines.push("");

  // Details
  if (ctx.details) {
    lines.push(`Details: ${ctx.details}`);
    lines.push("");
  }

  // Cause
  if (ctx.cause) {
    lines.push(`Cause: ${ctx.cause.message}`);
    lines.push("");
  }

  // Suggestion
  if (ctx.suggestion) {
    lines.push(`💡 Suggestion: ${ctx.suggestion}`);
    lines.push("");
  }

  // Documentation
  if (ctx.docUrl) {
    lines.push(`📚 Documentation: ${ctx.docUrl}`);
    lines.push("");
  }

  // Footer with code and version
  lines.push(`Error Code: ${ctx.code}`);
  lines.push(`Version: ${getVersion()}`);

  if (ctx.exitCode !== undefined) {
    lines.push(`Exit Code: ${ctx.exitCode} (${getExitCodeDescription(ctx.exitCode)})`);
  }

  return lines.join("\n");
}

/**
 * Format error as JSON for machine consumption
 */
export function formatErrorJson(ctx: ErrorContext): string {
  return JSON.stringify(
    {
      error: {
        code: ctx.code,
        message: ctx.message,
        details: ctx.details,
        suggestion: ctx.suggestion,
        documentation: ctx.docUrl,
        cause: ctx.cause?.message,
        exitCode: ctx.exitCode,
        version: getVersion(),
        timestamp: new Date().toISOString(),
      },
    },
    null,
    2
  );
}

/**
 * Create error context from an Error object
 */
export function createErrorContext(
  error: Error,
  template?: keyof typeof ERROR_TEMPLATES
): ErrorContext {
  if (template && ERROR_TEMPLATES[template]) {
    const base = ERROR_TEMPLATES[template];
    return {
      ...base,
      details: error.message,
      cause: error,
    };
  }

  // Auto-detect error type
  const message = error.message.toLowerCase();

  if (message.includes("api key") && message.includes("missing")) {
    return { ...ERROR_TEMPLATES.API_KEY_MISSING, details: error.message, cause: error };
  }

  if (message.includes("unauthorized") || message.includes("401")) {
    return { ...ERROR_TEMPLATES.API_KEY_INVALID, details: error.message, cause: error };
  }

  if (message.includes("rate limit") || message.includes("429")) {
    return { ...ERROR_TEMPLATES.RATE_LIMITED, details: error.message, cause: error };
  }

  if (message.includes("timeout")) {
    return { ...ERROR_TEMPLATES.TIMEOUT, details: error.message, cause: error };
  }

  if (message.includes("enoent") || message.includes("not found")) {
    return { ...ERROR_TEMPLATES.FILE_NOT_FOUND, details: error.message, cause: error };
  }

  if (message.includes("eacces") || message.includes("permission")) {
    return { ...ERROR_TEMPLATES.PERMISSION_DENIED, details: error.message, cause: error };
  }

  if (message.includes("network") || message.includes("econnrefused")) {
    return { ...ERROR_TEMPLATES.NETWORK_ERROR, details: error.message, cause: error };
  }

  if (message.includes("cost limit")) {
    return { ...ERROR_TEMPLATES.COST_LIMIT, details: error.message, cause: error };
  }

  // Generic error
  return {
    code: "UNKNOWN_ERROR",
    message: error.message,
    exitCode: EXIT_CODES.GENERAL_ERROR,
    cause: error,
  };
}

/**
 * Print formatted error to stderr
 */
export function printError(ctx: ErrorContext): void {
  console.error(formatError(ctx));
}

/**
 * Print formatted error as JSON to stderr
 */
export function printErrorJson(ctx: ErrorContext): void {
  console.error(formatErrorJson(ctx));
}

/**
 * Format a warning message
 */
export function formatWarning(message: string, suggestion?: string): string {
  const lines = [`⚠️  Warning: ${message}`];

  if (suggestion) {
    lines.push(`   💡 ${suggestion}`);
  }

  return lines.join("\n");
}

/**
 * Format a success message
 */
export function formatSuccess(message: string, details?: string[]): string {
  const lines = [`✓ ${message}`];

  if (details) {
    for (const detail of details) {
      lines.push(`  • ${detail}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format an info message
 */
export function formatInfo(message: string): string {
  return `ℹ️  ${message}`;
}

export default {
  formatError,
  formatErrorJson,
  createErrorContext,
  printError,
  printErrorJson,
  formatWarning,
  formatSuccess,
  formatInfo,
  ERROR_TEMPLATES,
};
