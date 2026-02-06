/**
 * Error Formatter Module
 *
 * Structured error output with suggestions and documentation links.
 * Designed for accessibility and clear communication.
 *
 * Features:
 * - User-friendly error messages in plain language
 * - Actionable suggestions for each error type
 * - Readable stack trace formatting
 * - Quick actions for common fixes
 *
 * This file re-exports everything from the errors/ sub-modules.
 */

export * from './errors/index.js';

// Re-export the default export for backwards compatibility
import {
  formatError,
  formatErrorJson,
  formatWarning,
  formatSuccess,
  formatInfo,
  formatStackTrace,
  formatDiagnosticReport,
  createErrorContext,
  createEnrichedErrorContext,
  translateTechnicalError,
  printError,
  printErrorJson,
  generateDiagnosticReport,
  isRecoverableError,
  getRetryDelay,
  groupErrorsByCategory,
  createErrorSummary,
  extractFilePath,
  getErrorCategory,
  getErrorSeverity,
  ErrorCategory,
  ErrorSeverity,
  ERROR_TEMPLATES,
  ERROR_CATEGORIES,
  ERROR_SEVERITIES,
} from './errors/index.js';

export default {
  // Formatage
  formatError,
  formatErrorJson,
  formatWarning,
  formatSuccess,
  formatInfo,
  formatStackTrace,
  formatDiagnosticReport,

  // Creation de contexte
  createErrorContext,
  createEnrichedErrorContext,
  translateTechnicalError,

  // Affichage
  printError,
  printErrorJson,

  // Diagnostic
  generateDiagnosticReport,
  isRecoverableError,
  getRetryDelay,
  groupErrorsByCategory,
  createErrorSummary,
  extractFilePath,

  // Categories et severites
  getErrorCategory,
  getErrorSeverity,
  ErrorCategory,
  ErrorSeverity,

  // Templates et constantes
  ERROR_TEMPLATES,
  ERROR_CATEGORIES,
  ERROR_SEVERITIES,
};
