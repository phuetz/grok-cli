/**
 * Structured Error Types for Grok CLI
 *
 * @deprecated This module is deprecated. Use src/errors/index.ts instead.
 * This re-export exists only for backward compatibility and will be removed in a future version.
 */

// Re-export all errors explicitly for backward compatibility
export {
  CodeBuddyError,
  ContextLimitExceededError,
  SandboxViolationError,
  ConfirmationDeniedError,
  ToolExecutionError,
  ToolValidationError,
  ToolNotFoundError,
  ApiError,
  RateLimitError,
  AuthenticationError,
  getErrorMessage,
  isCodeBuddyError,
  isOperationalError,
  wrapError,
  createApiError,
} from '../errors/index.js';
