/**
 * Input Validation Module for Grok CLI
 * Provides comprehensive validation utilities for user inputs, file paths, and commands
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { ValidationError } from './errors.js';
import { logger } from './logger.js';

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedValue?: string;
}

/**
 * Options for string validation
 */
export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowEmpty?: boolean;
  trim?: boolean;
  sanitize?: boolean;
}

/**
 * Options for number validation
 */
export interface NumberValidationOptions {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
}

/**
 * Options for file path validation
 */
export interface PathValidationOptions {
  mustExist?: boolean;
  allowDirectory?: boolean;
  allowFile?: boolean;
  allowedExtensions?: string[];
  blockedPaths?: string[];
  maxDepth?: number;
}

/**
 * Dangerous patterns that should be blocked in user input
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /\x00/,                           // Null bytes
  /\.\.\/|\.\.\\/, // Path traversal
  /<script/i,                       // Script injection
  /\$\{.*\}/,                       // Template injection
  /`.*`/,                           // Command substitution
  /\$\(.*\)/,                       // Command substitution
  /;\s*rm\s+-rf/i,                  // Command chaining with rm
  /\|\s*bash/i,                     // Piping to bash
  /\|\s*sh/i,                       // Piping to sh
];

/**
 * Reserved file names on Windows
 */
const WINDOWS_RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
];

/**
 * InputValidator class provides comprehensive input validation
 */
export class InputValidator {
  /**
   * Validate a string value
   */
  static validateString(
    value: unknown,
    fieldName: string,
    options: StringValidationOptions = {}
  ): ValidationResult {
    const {
      minLength = 0,
      maxLength = 10000,
      pattern,
      allowEmpty = false,
      trim = true,
      sanitize = true,
    } = options;

    // Type check
    if (typeof value !== 'string') {
      return {
        valid: false,
        error: `${fieldName} must be a string, got ${typeof value}`,
      };
    }

    let processedValue = trim ? value.trim() : value;

    // Empty check
    if (!allowEmpty && processedValue.length === 0) {
      return {
        valid: false,
        error: `${fieldName} cannot be empty`,
      };
    }

    // Length checks
    if (processedValue.length < minLength) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${minLength} characters`,
      };
    }

    if (processedValue.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} must be at most ${maxLength} characters`,
      };
    }

    // Pattern check
    if (pattern && !pattern.test(processedValue)) {
      return {
        valid: false,
        error: `${fieldName} does not match required pattern`,
      };
    }

    // Dangerous pattern check
    if (sanitize) {
      for (const dangerousPattern of DANGEROUS_PATTERNS) {
        if (dangerousPattern.test(processedValue)) {
          logger.warn('Dangerous pattern detected in input', {
            field: fieldName,
            pattern: dangerousPattern.source,
          });
          return {
            valid: false,
            error: `${fieldName} contains potentially dangerous content`,
          };
        }
      }
    }

    // Sanitize the value
    if (sanitize) {
      processedValue = InputValidator.sanitizeString(processedValue);
    }

    return {
      valid: true,
      sanitizedValue: processedValue,
    };
  }

  /**
   * Validate a number value
   */
  static validateNumber(
    value: unknown,
    fieldName: string,
    options: NumberValidationOptions = {}
  ): ValidationResult {
    const { min, max, integer = false, positive = false } = options;

    // Type check
    const num = typeof value === 'string' ? Number(value) : value;
    if (typeof num !== 'number' || isNaN(num)) {
      return {
        valid: false,
        error: `${fieldName} must be a valid number`,
      };
    }

    // Integer check
    if (integer && !Number.isInteger(num)) {
      return {
        valid: false,
        error: `${fieldName} must be an integer`,
      };
    }

    // Positive check
    if (positive && num < 0) {
      return {
        valid: false,
        error: `${fieldName} must be positive`,
      };
    }

    // Range checks
    if (min !== undefined && num < min) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${min}`,
      };
    }

    if (max !== undefined && num > max) {
      return {
        valid: false,
        error: `${fieldName} must be at most ${max}`,
      };
    }

    return {
      valid: true,
      sanitizedValue: String(num),
    };
  }

  /**
   * Validate a file path
   */
  static async validatePath(
    inputPath: unknown,
    options: PathValidationOptions = {}
  ): Promise<ValidationResult> {
    const {
      mustExist = false,
      allowDirectory = true,
      allowFile = true,
      allowedExtensions,
      blockedPaths = [],
      maxDepth = 20,
    } = options;

    // Type check
    if (typeof inputPath !== 'string') {
      return {
        valid: false,
        error: 'Path must be a string',
      };
    }

    const trimmedPath = inputPath.trim();

    // Empty check
    if (trimmedPath.length === 0) {
      return {
        valid: false,
        error: 'Path cannot be empty',
      };
    }

    // Path traversal check
    if (trimmedPath.includes('..')) {
      logger.warn('Path traversal attempt detected', { path: trimmedPath });
      return {
        valid: false,
        error: 'Path traversal is not allowed',
      };
    }

    // Null byte check
    if (trimmedPath.includes('\x00')) {
      return {
        valid: false,
        error: 'Path contains invalid characters',
      };
    }

    // Resolve the path
    const resolvedPath = path.resolve(trimmedPath);

    // Check path depth
    const pathDepth = resolvedPath.split(path.sep).length;
    if (pathDepth > maxDepth) {
      return {
        valid: false,
        error: `Path depth exceeds maximum allowed (${maxDepth})`,
      };
    }

    // Windows reserved name check
    const baseName = path.basename(resolvedPath).toUpperCase();
    const baseNameWithoutExt = baseName.split('.')[0];
    if (WINDOWS_RESERVED_NAMES.includes(baseNameWithoutExt)) {
      return {
        valid: false,
        error: 'Path contains a reserved name',
      };
    }

    // Blocked paths check
    for (const blockedPath of blockedPaths) {
      if (resolvedPath.startsWith(blockedPath) || resolvedPath.includes(blockedPath)) {
        logger.warn('Blocked path access attempt', { path: resolvedPath, blockedPath });
        return {
          valid: false,
          error: 'Access to this path is not allowed',
        };
      }
    }

    // Extension check
    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = path.extname(resolvedPath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return {
          valid: false,
          error: `File extension ${ext} is not allowed`,
        };
      }
    }

    // Existence check
    if (mustExist) {
      const exists = await fs.pathExists(resolvedPath);
      if (!exists) {
        return {
          valid: false,
          error: 'Path does not exist',
        };
      }

      const stats = await fs.stat(resolvedPath);
      if (stats.isDirectory() && !allowDirectory) {
        return {
          valid: false,
          error: 'Directory paths are not allowed',
        };
      }

      if (stats.isFile() && !allowFile) {
        return {
          valid: false,
          error: 'File paths are not allowed',
        };
      }
    }

    return {
      valid: true,
      sanitizedValue: resolvedPath,
    };
  }

  /**
   * Validate an array of values
   */
  static validateArray<T>(
    value: unknown,
    fieldName: string,
    options: {
      minItems?: number;
      maxItems?: number;
      itemValidator?: (item: unknown, index: number) => ValidationResult;
    } = {}
  ): ValidationResult {
    const { minItems = 0, maxItems = 1000, itemValidator } = options;

    if (!Array.isArray(value)) {
      return {
        valid: false,
        error: `${fieldName} must be an array`,
      };
    }

    if (value.length < minItems) {
      return {
        valid: false,
        error: `${fieldName} must have at least ${minItems} items`,
      };
    }

    if (value.length > maxItems) {
      return {
        valid: false,
        error: `${fieldName} must have at most ${maxItems} items`,
      };
    }

    if (itemValidator) {
      for (let i = 0; i < value.length; i++) {
        const itemResult = itemValidator(value[i], i);
        if (!itemResult.valid) {
          return {
            valid: false,
            error: `${fieldName}[${i}]: ${itemResult.error}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Validate an object against a schema
   */
  static validateObject(
    value: unknown,
    fieldName: string,
    schema: Record<string, {
      required?: boolean;
      validator: (val: unknown) => ValidationResult;
    }>
  ): ValidationResult {
    if (typeof value !== 'object' || value === null) {
      return {
        valid: false,
        error: `${fieldName} must be an object`,
      };
    }

    const obj = value as Record<string, unknown>;

    for (const [key, config] of Object.entries(schema)) {
      const fieldValue = obj[key];

      if (config.required && (fieldValue === undefined || fieldValue === null)) {
        return {
          valid: false,
          error: `${fieldName}.${key} is required`,
        };
      }

      if (fieldValue !== undefined && fieldValue !== null) {
        const result = config.validator(fieldValue);
        if (!result.valid) {
          return {
            valid: false,
            error: `${fieldName}.${key}: ${result.error}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Sanitize a string by removing dangerous characters
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/\x00/g, '')           // Remove null bytes
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters (except newlines handled separately)
      .replace(/[\r\n]+/g, '\n')      // Normalize line endings
      .trim();
  }

  /**
   * Sanitize a file name
   */
  static sanitizeFileName(input: string): string {
    return input
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Replace illegal characters
      .replace(/\.+$/g, '')                    // Remove trailing dots
      .replace(/\s+/g, '_')                    // Replace spaces with underscores
      .substring(0, 255);                       // Limit length
  }

  /**
   * Validate and sanitize a command argument
   */
  static validateCommandArg(
    arg: unknown,
    fieldName: string
  ): ValidationResult {
    const stringResult = InputValidator.validateString(arg, fieldName, {
      maxLength: 1000,
      sanitize: true,
    });

    if (!stringResult.valid) {
      return stringResult;
    }

    // Additional command-specific checks
    const value = stringResult.sanitizedValue!;

    // Check for shell metacharacters that could be dangerous
    const shellMetacharacters = /[;&|`$(){}[\]<>!]/;
    if (shellMetacharacters.test(value)) {
      return {
        valid: false,
        error: `${fieldName} contains shell metacharacters that are not allowed`,
      };
    }

    return stringResult;
  }

  /**
   * Validate email format
   */
  static validateEmail(
    value: unknown,
    fieldName: string = 'email'
  ): ValidationResult {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return InputValidator.validateString(value, fieldName, {
      pattern: emailPattern,
      maxLength: 254,
    });
  }

  /**
   * Validate URL format
   */
  static validateUrl(
    value: unknown,
    fieldName: string = 'url',
    options: { allowedProtocols?: string[] } = {}
  ): ValidationResult {
    const { allowedProtocols = ['http:', 'https:'] } = options;

    const stringResult = InputValidator.validateString(value, fieldName, {
      maxLength: 2048,
    });

    if (!stringResult.valid) {
      return stringResult;
    }

    try {
      const url = new URL(stringResult.sanitizedValue!);
      if (!allowedProtocols.includes(url.protocol)) {
        return {
          valid: false,
          error: `${fieldName} must use one of these protocols: ${allowedProtocols.join(', ')}`,
        };
      }
      return { valid: true, sanitizedValue: url.href };
    } catch {
      return {
        valid: false,
        error: `${fieldName} is not a valid URL`,
      };
    }
  }
}

/**
 * Validation decorators for use in classes
 */
export function validateArgs(validators: Record<number, (value: unknown) => ValidationResult>) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      for (const [indexStr, validator] of Object.entries(validators)) {
        const index = parseInt(indexStr, 10);
        const result = validator(args[index]);
        if (!result.valid) {
          throw new ValidationError(result.error || 'Validation failed');
        }
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Create a validator function for common use cases
 */
export const Validators = {
  nonEmptyString: (fieldName: string) => (value: unknown) =>
    InputValidator.validateString(value, fieldName, { allowEmpty: false }),

  positiveInteger: (fieldName: string) => (value: unknown) =>
    InputValidator.validateNumber(value, fieldName, { integer: true, positive: true }),

  filePath: (options?: PathValidationOptions) => (value: unknown) =>
    InputValidator.validatePath(value, options),

  arrayOf: <T>(fieldName: string, itemValidator: (item: unknown, index: number) => ValidationResult) =>
    (value: unknown) => InputValidator.validateArray<T>(value, fieldName, { itemValidator }),
};

export default InputValidator;
