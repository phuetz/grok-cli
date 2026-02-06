/**
 * Input Validation Types
 *
 * Shared type definitions for all input validation modules.
 */

export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  error?: string;
}

export interface ValidationOptions {
  /** Field name for error messages */
  fieldName?: string;
  /** Allow empty strings (default: false) */
  allowEmpty?: boolean;
  /** Custom error message */
  customError?: string;
}
