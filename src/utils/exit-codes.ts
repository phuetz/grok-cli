/**
 * Exit Codes Module
 *
 * Standardized exit codes for CLI operations.
 * Following common conventions for shell scripting and CI/CD integration.
 */

/**
 * Standard exit codes
 */
export const EXIT_CODES = {
  /** Successful execution */
  SUCCESS: 0,

  /** General error */
  GENERAL_ERROR: 1,

  /** Invalid command line usage */
  INVALID_USAGE: 2,

  /** API error (rate limit, server error, etc.) */
  API_ERROR: 3,

  /** Authentication error (invalid/missing API key) */
  AUTHENTICATION_ERROR: 4,

  /** Operation timeout */
  TIMEOUT: 5,

  /** File not found */
  FILE_NOT_FOUND: 6,

  /** Permission denied */
  PERMISSION_DENIED: 7,

  /** Configuration error */
  CONFIG_ERROR: 8,

  /** Network error */
  NETWORK_ERROR: 9,

  /** Resource exhausted (memory, disk, etc.) */
  RESOURCE_EXHAUSTED: 10,

  /** Invalid input data */
  INVALID_INPUT: 11,

  /** Operation cancelled by user */
  USER_CANCELLED: 130, // Standard Ctrl+C exit code

  /** Operation aborted due to cost limit */
  COST_LIMIT_EXCEEDED: 12,

  /** Tool execution failed */
  TOOL_EXECUTION_FAILED: 13,

  /** MCP server error */
  MCP_ERROR: 14,

  /** Model not available */
  MODEL_NOT_AVAILABLE: 15,
} as const;

/**
 * Exit code type
 */
export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

/**
 * Exit code descriptions for error messages
 */
export const EXIT_CODE_DESCRIPTIONS: Record<ExitCode, string> = {
  [EXIT_CODES.SUCCESS]: "Operation completed successfully",
  [EXIT_CODES.GENERAL_ERROR]: "An unexpected error occurred",
  [EXIT_CODES.INVALID_USAGE]: "Invalid command line usage",
  [EXIT_CODES.API_ERROR]: "API request failed",
  [EXIT_CODES.AUTHENTICATION_ERROR]: "Authentication failed",
  [EXIT_CODES.TIMEOUT]: "Operation timed out",
  [EXIT_CODES.FILE_NOT_FOUND]: "File or directory not found",
  [EXIT_CODES.PERMISSION_DENIED]: "Permission denied",
  [EXIT_CODES.CONFIG_ERROR]: "Configuration error",
  [EXIT_CODES.NETWORK_ERROR]: "Network connection error",
  [EXIT_CODES.RESOURCE_EXHAUSTED]: "Resource limit exceeded",
  [EXIT_CODES.INVALID_INPUT]: "Invalid input data",
  [EXIT_CODES.USER_CANCELLED]: "Operation cancelled by user",
  [EXIT_CODES.COST_LIMIT_EXCEEDED]: "Cost limit exceeded",
  [EXIT_CODES.TOOL_EXECUTION_FAILED]: "Tool execution failed",
  [EXIT_CODES.MCP_ERROR]: "MCP server error",
  [EXIT_CODES.MODEL_NOT_AVAILABLE]: "Model not available",
};

/**
 * Exit with a specific code and optional message
 */
export function exitWithCode(code: ExitCode, message?: string): never {
  if (message) {
    if (code === EXIT_CODES.SUCCESS) {
      console.log(message);
    } else {
      console.error(message);
    }
  }
  process.exit(code);
}

/**
 * Get description for an exit code
 */
export function getExitCodeDescription(code: number): string {
  return EXIT_CODE_DESCRIPTIONS[code as ExitCode] || `Unknown error (code ${code})`;
}

/**
 * Map error types to exit codes
 */
export function errorToExitCode(error: Error): ExitCode {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();

  // Authentication errors
  if (
    errorMessage.includes("api key") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("401")
  ) {
    return EXIT_CODES.AUTHENTICATION_ERROR;
  }

  // Rate limiting / API errors
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("429") ||
    errorMessage.includes("500") ||
    errorMessage.includes("502") ||
    errorMessage.includes("503")
  ) {
    return EXIT_CODES.API_ERROR;
  }

  // Timeout
  if (
    errorMessage.includes("timeout") ||
    errorMessage.includes("timed out") ||
    errorName.includes("timeout")
  ) {
    return EXIT_CODES.TIMEOUT;
  }

  // File not found
  if (
    errorMessage.includes("enoent") ||
    errorMessage.includes("not found") ||
    errorMessage.includes("no such file")
  ) {
    return EXIT_CODES.FILE_NOT_FOUND;
  }

  // Permission denied
  if (
    errorMessage.includes("eacces") ||
    errorMessage.includes("permission denied") ||
    errorMessage.includes("forbidden")
  ) {
    return EXIT_CODES.PERMISSION_DENIED;
  }

  // Network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("econnreset") ||
    errorMessage.includes("enotfound")
  ) {
    return EXIT_CODES.NETWORK_ERROR;
  }

  // Cost limit
  if (
    errorMessage.includes("cost limit") ||
    errorMessage.includes("budget exceeded")
  ) {
    return EXIT_CODES.COST_LIMIT_EXCEEDED;
  }

  // MCP errors
  if (errorMessage.includes("mcp") || errorMessage.includes("model context protocol")) {
    return EXIT_CODES.MCP_ERROR;
  }

  // Default to general error
  return EXIT_CODES.GENERAL_ERROR;
}

/**
 * Exit handler that maps errors to appropriate exit codes
 */
export function handleFatalError(error: Error): never {
  const exitCode = errorToExitCode(error);
  const description = getExitCodeDescription(exitCode);

  console.error(`\n❌ ${description}`);
  console.error(`   ${error.message}`);

  if (process.env.DEBUG) {
    console.error(`\nStack trace:`);
    console.error(error.stack);
  }

  console.error(`\nExit code: ${exitCode}`);

  process.exit(exitCode);
}

export default EXIT_CODES;
