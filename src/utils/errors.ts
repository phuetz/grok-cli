/**
 * Custom error classes for Grok CLI
 */

/**
 * Base error class for all Grok CLI errors
 */
export class GrokError extends Error {
  constructor(message: string, public code?: string, public details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Error thrown when API key is missing or invalid
 */
export class APIKeyError extends GrokError {
  constructor(message: string = 'No API key found') {
    super(message, 'API_KEY_ERROR');
  }
}

/**
 * Error thrown when API request fails
 */
export class APIError extends GrokError {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message, 'API_ERROR', { statusCode, response });
  }
}

/**
 * Error thrown when network request fails
 */
export class NetworkError extends GrokError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'NETWORK_ERROR', originalError);
  }
}

/**
 * Error thrown when operation times out
 */
export class TimeoutError extends GrokError {
  constructor(message: string, public timeoutMs: number) {
    super(message, 'TIMEOUT_ERROR', { timeoutMs });
  }
}

/**
 * Error thrown when file operation fails
 */
export class FileError extends GrokError {
  constructor(
    message: string,
    public filePath: string,
    public operation: 'read' | 'write' | 'delete' | 'create'
  ) {
    super(message, 'FILE_ERROR', { filePath, operation });
  }
}

/**
 * Error thrown when file is not found
 */
export class FileNotFoundError extends FileError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, filePath, 'read');
    this.code = 'FILE_NOT_FOUND';
  }
}

/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends GrokError {
  constructor(
    message: string,
    public toolName: string,
    public toolArgs?: unknown
  ) {
    super(message, 'TOOL_EXECUTION_ERROR', { toolName, toolArgs });
  }
}

/**
 * Error thrown when bash command is invalid or dangerous
 */
export class InvalidCommandError extends GrokError {
  constructor(message: string, public command: string) {
    super(message, 'INVALID_COMMAND', { command });
  }
}

/**
 * Error thrown when bash command execution fails
 */
export class CommandExecutionError extends GrokError {
  constructor(
    message: string,
    public command: string,
    public exitCode?: number,
    public stderr?: string
  ) {
    super(message, 'COMMAND_EXECUTION_ERROR', { command, exitCode, stderr });
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends GrokError {
  constructor(message: string, public field?: string, public value?: unknown) {
    super(message, 'VALIDATION_ERROR', { field, value });
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends GrokError {
  constructor(message: string, public configKey?: string) {
    super(message, 'CONFIGURATION_ERROR', { configKey });
  }
}

/**
 * Checks if an error is a GrokError or subclass
 */
export function isGrokError(error: unknown): error is GrokError {
  return error instanceof GrokError;
}

/**
 * Safely extracts error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Wraps a promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(errorMessage, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

/**
 * Retries a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Error thrown when search operation fails
 */
export class SearchError extends GrokError {
  constructor(
    message: string,
    public query: string,
    public searchType?: string
  ) {
    super(message, 'SEARCH_ERROR', { query, searchType });
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends GrokError {
  constructor(
    message: string,
    public retryAfterMs?: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfterMs });
  }
}

/**
 * Error thrown when permission is denied
 */
export class PermissionError extends GrokError {
  constructor(
    message: string,
    public resource: string,
    public requiredPermission?: string
  ) {
    super(message, 'PERMISSION_ERROR', { resource, requiredPermission });
  }
}

/**
 * Error thrown when resource is not found
 */
export class NotFoundError extends GrokError {
  constructor(
    message: string,
    public resourceType: string,
    public resourceId?: string
  ) {
    super(message, 'NOT_FOUND_ERROR', { resourceType, resourceId });
  }
}

/**
 * Error thrown when input/output operation fails
 */
export class IOError extends GrokError {
  constructor(
    message: string,
    public operation: string,
    public path?: string
  ) {
    super(message, 'IO_ERROR', { operation, path });
  }
}

/**
 * Error thrown when parser fails
 */
export class ParseError extends GrokError {
  constructor(
    message: string,
    public input: string,
    public position?: number
  ) {
    super(message, 'PARSE_ERROR', { input: input.substring(0, 100), position });
  }
}

/**
 * Error thrown when agent exceeds maximum iterations
 */
export class MaxIterationsError extends GrokError {
  constructor(
    message: string,
    public maxIterations: number,
    public currentIteration: number
  ) {
    super(message, 'MAX_ITERATIONS_ERROR', { maxIterations, currentIteration });
  }
}

/**
 * Error thrown when MCP operation fails
 */
export class MCPError extends GrokError {
  constructor(
    message: string,
    public serverName?: string,
    public operation?: string
  ) {
    super(message, 'MCP_ERROR', { serverName, operation });
  }
}

/**
 * Error codes enum for easy reference
 */
export enum ErrorCode {
  API_KEY_ERROR = 'API_KEY_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  INVALID_COMMAND = 'INVALID_COMMAND',
  COMMAND_EXECUTION_ERROR = 'COMMAND_EXECUTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SEARCH_ERROR = 'SEARCH_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  IO_ERROR = 'IO_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  MAX_ITERATIONS_ERROR = 'MAX_ITERATIONS_ERROR',
  MCP_ERROR = 'MCP_ERROR',
}

/**
 * Create an error from an error code
 */
export function createError(code: ErrorCode, message: string, details?: unknown): GrokError {
  return new GrokError(message, code, details);
}

/**
 * Type guard to check if error has a specific code
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return isGrokError(error) && error.code === code;
}

/**
 * Wrap an error with additional context
 */
export function wrapError(error: unknown, context: string): GrokError {
  const message = getErrorMessage(error);
  const wrappedError = new GrokError(`${context}: ${message}`, 'WRAPPED_ERROR', {
    originalError: error instanceof Error ? error.stack : error,
  });
  return wrappedError;
}
