/**
 * Error Formatters
 *
 * Functions for formatting errors, warnings, success messages, and info
 * for terminal output and JSON consumption.
 */

import { logger } from "../logger.js";
import { getExitCodeDescription } from "../exit-codes.js";
import { ErrorContext, QuickAction } from "./error-templates.js";

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
 * Format a stack trace for readability
 * Cleans up and simplifies stack traces for user-friendly display
 */
export function formatStackTrace(error: Error, maxLines = 5): string[] {
  if (!error.stack) return [];

  const lines = error.stack.split("\n");
  const formattedLines: string[] = [];

  // Skip the first line (it's the error message)
  const stackLines = lines.slice(1);

  for (let i = 0; i < Math.min(stackLines.length, maxLines); i++) {
    const line = stackLines[i].trim();

    // Parse the stack frame
    const match = line.match(/at\s+(?:(.+?)\s+)?\(?((?:file:|https?:|\/)[^)]+):(\d+):(\d+)\)?/);

    if (match) {
      const [, fnName, filePath, lineNum, colNum] = match;
      // Simplify the path - show only the last 2-3 segments
      const pathParts = filePath.split("/");
      const shortPath = pathParts.slice(-3).join("/");

      if (fnName) {
        formattedLines.push(`  ${i + 1}. ${fnName} (${shortPath}:${lineNum})`);
      } else {
        formattedLines.push(`  ${i + 1}. ${shortPath}:${lineNum}:${colNum}`);
      }
    } else if (line.startsWith("at ")) {
      // Fallback for non-standard format
      formattedLines.push(`  ${i + 1}. ${line.replace("at ", "")}`);
    }
  }

  if (stackLines.length > maxLines) {
    formattedLines.push(`  ... et ${stackLines.length - maxLines} autres lignes`);
  }

  return formattedLines;
}

/**
 * Format quick actions for display
 */
function formatQuickActions(actions: QuickAction[]): string[] {
  const lines: string[] = [];
  lines.push("Actions possibles:");

  actions.forEach((action, index) => {
    lines.push(`  ${index + 1}. ${action.label}`);
    if (action.command) {
      lines.push(`     $ ${action.command}`);
    }
    lines.push(`     ${action.description}`);
  });

  return lines;
}

/**
 * Format error for terminal output with improved UX
 */
export function formatError(ctx: ErrorContext): string {
  const lines: string[] = [];

  // Error header with clear visual separator
  lines.push("\u2501".repeat(50));
  lines.push(`\u274C Erreur: ${ctx.message}`);
  lines.push("\u2501".repeat(50));
  lines.push("");

  // File path if relevant
  if (ctx.filePath) {
    lines.push(`\uD83D\uDCC1 Fichier: ${ctx.filePath}`);
    lines.push("");
  }

  // Details in a more readable format
  if (ctx.details) {
    lines.push("Details:");
    // Split details into multiple lines if too long
    const detailLines = ctx.details.split("\n");
    detailLines.forEach((line) => {
      lines.push(`  ${line}`);
    });
    lines.push("");
  }

  // Cause with simplified message
  if (ctx.cause && ctx.cause.message !== ctx.message) {
    lines.push(`Cause: ${ctx.cause.message}`);
    lines.push("");
  }

  // Stack trace (optional, simplified)
  if (ctx.showStackTrace && ctx.cause) {
    const stackLines = formatStackTrace(ctx.cause);
    if (stackLines.length > 0) {
      lines.push("Stack trace:");
      lines.push(...stackLines);
      lines.push("");
    }
  }

  // Suggestion in a prominent way
  if (ctx.suggestion) {
    lines.push(`\uD83D\uDCA1 ${ctx.suggestion}`);
    lines.push("");
  }

  // Quick actions
  if (ctx.quickActions && ctx.quickActions.length > 0) {
    lines.push(...formatQuickActions(ctx.quickActions));
    lines.push("");
  }

  // Documentation link
  if (ctx.docUrl) {
    lines.push(`\uD83D\uDCDA Documentation: ${ctx.docUrl}`);
    lines.push("");
  }

  // Footer with technical info (smaller, less prominent)
  lines.push("\u2500".repeat(30));
  lines.push(`Code: ${ctx.code} | Version: ${getVersion()}`);

  if (ctx.exitCode !== undefined) {
    lines.push(`Exit: ${ctx.exitCode} (${getExitCodeDescription(ctx.exitCode)})`);
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
 * Print formatted error to stderr
 */
export function printError(ctx: ErrorContext): void {
  logger.error(formatError(ctx));
}

/**
 * Print formatted error as JSON to stderr
 */
export function printErrorJson(ctx: ErrorContext): void {
  logger.error(formatErrorJson(ctx));
}

/**
 * Format a warning message
 */
export function formatWarning(message: string, suggestion?: string): string {
  const lines = [`\u26A0\uFE0F  Warning: ${message}`];

  if (suggestion) {
    lines.push(`   \uD83D\uDCA1 ${suggestion}`);
  }

  return lines.join("\n");
}

/**
 * Format a success message
 */
export function formatSuccess(message: string, details?: string[]): string {
  const lines = [`\u2713 ${message}`];

  if (details) {
    for (const detail of details) {
      lines.push(`  \u2022 ${detail}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format an info message
 */
export function formatInfo(message: string): string {
  return `\u2139\uFE0F  ${message}`;
}
