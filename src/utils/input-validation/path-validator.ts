/**
 * Path Validation and Sanitization
 *
 * File path validation, sanitization, and security checks.
 * Prevents directory traversal attacks and access to sensitive paths.
 */

import * as path from 'path';

import type { ValidationResult, ValidationOptions } from './types.js';
import { validateString } from './common-validators.js';
import { VALIDATION_LIMITS } from './constants.js';

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Validate file path (basic check, not security)
 */
export function validateFilePath(
  value: unknown,
  options: ValidationOptions & { mustBeAbsolute?: boolean } = {}
): ValidationResult<string> {
  const stringResult = validateString(value, options);
  if (!stringResult.valid) return stringResult;

  const { fieldName = 'file path', mustBeAbsolute = false } = options;
  const str = stringResult.value!;

  // Check for null bytes (security)
  if (str.includes('\0')) {
    return {
      valid: false,
      error: `${fieldName} contains invalid characters`,
    };
  }

  // Check absolute path requirement
  if (mustBeAbsolute && !str.startsWith('/') && !str.match(/^[A-Za-z]:\\/)) {
    return {
      valid: false,
      error: `${fieldName} must be an absolute path`,
    };
  }

  return { valid: true, value: str };
}

// ============================================================================
// Path Sanitization
// ============================================================================

/**
 * Dangerous path patterns that should be blocked
 */
const DANGEROUS_PATH_PATTERNS = [
  /^\/etc\/(passwd|shadow|sudoers)/i,
  /^\/root\//,
  /\.ssh\/(id_rsa|id_ed25519|authorized_keys)/i,
  /\.(env|credentials|secrets?)(\.local)?$/i,
  /\/\.git\/config$/,
];

/**
 * Sanitize and validate a file path for write operations
 *
 * @param inputPath - The path to sanitize
 * @param basePath - Optional base path to resolve relative paths against
 * @returns Sanitized absolute path
 * @throws Error if path is dangerous or invalid
 */
export function sanitizeFilePath(inputPath: string, basePath?: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Path must be a non-empty string');
  }

  // Check for null bytes
  if (inputPath.includes('\0')) {
    throw new Error('Path contains null bytes');
  }

  // Normalize the path
  let normalizedPath = path.normalize(inputPath);

  // Resolve to absolute path if base path provided
  if (basePath && !path.isAbsolute(normalizedPath)) {
    normalizedPath = path.resolve(basePath, normalizedPath);
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATH_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      throw new Error(`Access to sensitive path is not allowed: ${inputPath}`);
    }
  }

  return normalizedPath;
}

/**
 * Check if a path is safe for write operations (doesn't throw, returns boolean)
 */
export function isPathSafeForWrite(inputPath: string, basePath?: string): boolean {
  try {
    sanitizeFilePath(inputPath, basePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Unified Path Validator Options
// ============================================================================

/**
 * Options for path validation in unified validators
 */
export interface PathValidationOptions {
  /** Allow absolute paths (default: true) */
  allowAbsolute?: boolean;
  /** Allow relative paths (default: true) */
  allowRelative?: boolean;
  /** Base directory to resolve relative paths against */
  basePath?: string;
  /** Check for dangerous patterns like sensitive files (default: true) */
  checkDangerous?: boolean;
  /** Field name for error messages */
  fieldName?: string;
}

/**
 * Unified validation result type
 */
export interface UnifiedValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  error?: string;
}

/**
 * Validate a file path for security and correctness.
 *
 * Checks for:
 * - Path traversal attacks (../)
 * - Null byte injection
 * - Dangerous paths (sensitive system files)
 * - Absolute/relative path restrictions
 *
 * @param input - The path to validate
 * @param options - Validation options
 * @returns ValidationResult with sanitized path or error
 */
export function validatePath(
  input: string,
  options: PathValidationOptions = {}
): UnifiedValidationResult<string> {
  const {
    allowAbsolute = true,
    allowRelative = true,
    basePath,
    checkDangerous = true,
    fieldName = 'path',
  } = options;

  // Basic type and empty check
  if (!input || typeof input !== 'string') {
    return { valid: false, error: `${fieldName} must be a non-empty string` };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  // Length check
  if (trimmed.length > VALIDATION_LIMITS.MAX_PATH_LENGTH) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum length of ${VALIDATION_LIMITS.MAX_PATH_LENGTH}`,
    };
  }

  // Null byte check
  if (trimmed.includes('\0')) {
    return { valid: false, error: `${fieldName} contains null bytes` };
  }

  // Path traversal check
  const traversalPatterns = [
    /\.\.[/\\]/, // ../  or ..\
    /[/\\]\.\./, // /../ or \..
    /^\.\.$/,    // just ".."
  ];
  for (const pattern of traversalPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: `${fieldName} contains path traversal pattern` };
    }
  }

  // Absolute/relative checks
  const isAbsolute = path.isAbsolute(trimmed);
  if (isAbsolute && !allowAbsolute) {
    return { valid: false, error: `${fieldName} must be a relative path` };
  }
  if (!isAbsolute && !allowRelative) {
    return { valid: false, error: `${fieldName} must be an absolute path` };
  }

  // Resolve path
  let resolvedPath = trimmed;
  if (basePath && !isAbsolute) {
    resolvedPath = path.resolve(basePath, trimmed);

    // Ensure resolved path stays within base
    const normalizedBase = path.normalize(basePath);
    const normalizedResolved = path.normalize(resolvedPath);
    if (!normalizedResolved.startsWith(normalizedBase + path.sep) &&
        normalizedResolved !== normalizedBase) {
      return { valid: false, error: `${fieldName} resolves outside allowed directory` };
    }
  } else {
    resolvedPath = path.normalize(trimmed);
  }

  // Dangerous path check
  if (checkDangerous) {
    for (const pattern of DANGEROUS_PATH_PATTERNS) {
      if (pattern.test(resolvedPath)) {
        return { valid: false, error: `${fieldName} points to a sensitive location` };
      }
    }
  }

  return { valid: true, value: resolvedPath };
}

// Re-export DANGEROUS_PATH_PATTERNS for use in other modules
export { DANGEROUS_PATH_PATTERNS };
