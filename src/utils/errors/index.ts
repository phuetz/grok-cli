/**
 * Error Formatter Module (barrel)
 *
 * Re-exports all error-related types, enums, constants, and functions
 * from the sub-modules.
 */

// Categories and severities
export {
  ErrorCategory,
  ErrorSeverity,
  ERROR_CATEGORIES,
  ERROR_SEVERITIES,
  getErrorCategory,
  getErrorSeverity,
} from "./error-categories.js";

// Templates and types
export {
  QuickAction,
  ErrorContext,
  ERROR_TEMPLATES,
} from "./error-templates.js";

// Context building
export {
  createErrorContext,
  translateTechnicalError,
  extractFilePath,
  createEnrichedErrorContext,
} from "./error-context.js";

// Formatters
export {
  formatStackTrace,
  formatError,
  formatErrorJson,
  printError,
  printErrorJson,
  formatWarning,
  formatSuccess,
  formatInfo,
} from "./error-formatters.js";

// Diagnostics
export {
  DiagnosticInfo,
  generateDiagnosticReport,
  formatDiagnosticReport,
  isRecoverableError,
  getRetryDelay,
  groupErrorsByCategory,
  createErrorSummary,
} from "./error-diagnostics.js";
