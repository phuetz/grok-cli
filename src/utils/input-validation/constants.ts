/**
 * Input Validation Constants
 *
 * Shared constants for validation limits used across all validators.
 */

/**
 * Configuration for input validation
 */
export const VALIDATION_LIMITS = {
  /** Maximum file path length */
  MAX_PATH_LENGTH: 4096,
  /** Maximum content size for file creation (10MB) */
  MAX_CONTENT_SIZE: 10 * 1024 * 1024,
  /** Maximum command length */
  MAX_COMMAND_LENGTH: 100000,
  /** Maximum URL length */
  MAX_URL_LENGTH: 2048,
  /** Maximum search query length */
  MAX_QUERY_LENGTH: 10000,
  /** Maximum code edit size (5MB) */
  MAX_CODE_EDIT_SIZE: 5 * 1024 * 1024,
  /** Maximum number of lines for file view */
  MAX_VIEW_LINES: 10000,
} as const;
