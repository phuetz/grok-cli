/**
 * Common Input Validators
 *
 * Basic validators for strings, numbers, arrays, objects, booleans,
 * enums, URLs, emails, and composite/assertion helpers.
 */

import type { ValidationResult, ValidationOptions } from './types.js';

// ============================================================================
// String Validators
// ============================================================================

/**
 * Validate that a value is a non-empty string
 */
export function validateString(
  value: unknown,
  options: ValidationOptions = {}
): ValidationResult<string> {
  const { fieldName = 'value', allowEmpty = false, customError } = options;

  if (value === undefined || value === null) {
    return {
      valid: false,
      error: customError || `${fieldName} is required`,
    };
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: customError || `${fieldName} must be a string`,
    };
  }

  if (!allowEmpty && value.trim() === '') {
    return {
      valid: false,
      error: customError || `${fieldName} cannot be empty`,
    };
  }

  return { valid: true, value };
}

/**
 * Validate string with length constraints
 */
export function validateStringLength(
  value: unknown,
  minLength: number,
  maxLength: number,
  options: ValidationOptions = {}
): ValidationResult<string> {
  const stringResult = validateString(value, options);
  if (!stringResult.valid) return stringResult;

  const { fieldName = 'value' } = options;
  const str = stringResult.value!;

  if (str.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (str.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${maxLength} characters`,
    };
  }

  return { valid: true, value: str };
}

/**
 * Validate string matches a pattern
 */
export function validatePattern(
  value: unknown,
  pattern: RegExp,
  options: ValidationOptions & { patternDescription?: string } = {}
): ValidationResult<string> {
  const stringResult = validateString(value, options);
  if (!stringResult.valid) return stringResult;

  const { fieldName = 'value', patternDescription = 'required format' } = options;
  const str = stringResult.value!;

  if (!pattern.test(str)) {
    return {
      valid: false,
      error: `${fieldName} does not match ${patternDescription}`,
    };
  }

  return { valid: true, value: str };
}

// ============================================================================
// Number Validators
// ============================================================================

/**
 * Validate that a value is a number
 */
export function validateNumber(
  value: unknown,
  options: ValidationOptions = {}
): ValidationResult<number> {
  const { fieldName = 'value', customError } = options;

  if (value === undefined || value === null) {
    return {
      valid: false,
      error: customError || `${fieldName} is required`,
    };
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || isNaN(num)) {
    return {
      valid: false,
      error: customError || `${fieldName} must be a valid number`,
    };
  }

  return { valid: true, value: num };
}

/**
 * Validate number within range
 */
export function validateNumberRange(
  value: unknown,
  min: number,
  max: number,
  options: ValidationOptions = {}
): ValidationResult<number> {
  const numResult = validateNumber(value, options);
  if (!numResult.valid) return numResult;

  const { fieldName = 'value' } = options;
  const num = numResult.value!;

  if (num < min || num > max) {
    return {
      valid: false,
      error: `${fieldName} must be between ${min} and ${max}`,
    };
  }

  return { valid: true, value: num };
}

/**
 * Validate positive integer
 */
export function validatePositiveInteger(
  value: unknown,
  options: ValidationOptions = {}
): ValidationResult<number> {
  const numResult = validateNumber(value, options);
  if (!numResult.valid) return numResult;

  const { fieldName = 'value' } = options;
  const num = numResult.value!;

  if (!Number.isInteger(num) || num < 1) {
    return {
      valid: false,
      error: `${fieldName} must be a positive integer`,
    };
  }

  return { valid: true, value: num };
}

// ============================================================================
// Array Validators
// ============================================================================

/**
 * Validate that a value is an array
 */
export function validateArray<T = unknown>(
  value: unknown,
  options: ValidationOptions & { minLength?: number; maxLength?: number } = {}
): ValidationResult<T[]> {
  const { fieldName = 'value', minLength, maxLength, customError } = options;

  if (value === undefined || value === null) {
    return {
      valid: false,
      error: customError || `${fieldName} is required`,
    };
  }

  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: customError || `${fieldName} must be an array`,
    };
  }

  if (minLength !== undefined && value.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must have at least ${minLength} items`,
    };
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must have at most ${maxLength} items`,
    };
  }

  return { valid: true, value: value as T[] };
}

// ============================================================================
// Object Validators
// ============================================================================

/**
 * Validate that a value is a non-null object
 */
export function validateObject<T extends Record<string, unknown> = Record<string, unknown>>(
  value: unknown,
  options: ValidationOptions = {}
): ValidationResult<T> {
  const { fieldName = 'value', customError } = options;

  if (value === undefined || value === null) {
    return {
      valid: false,
      error: customError || `${fieldName} is required`,
    };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return {
      valid: false,
      error: customError || `${fieldName} must be an object`,
    };
  }

  return { valid: true, value: value as T };
}

// ============================================================================
// Enum/Choice Validators
// ============================================================================

/**
 * Validate that a value is one of the allowed choices
 */
export function validateChoice<T extends string>(
  value: unknown,
  choices: readonly T[],
  options: ValidationOptions = {}
): ValidationResult<T> {
  const stringResult = validateString(value, options);
  if (!stringResult.valid) return stringResult as ValidationResult<T>;

  const { fieldName = 'value' } = options;
  const str = stringResult.value!;

  if (!choices.includes(str as T)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${choices.join(', ')}`,
    };
  }

  return { valid: true, value: str as T };
}

// ============================================================================
// Boolean Validators
// ============================================================================

/**
 * Validate and parse boolean value
 */
export function validateBoolean(
  value: unknown,
  options: ValidationOptions = {}
): ValidationResult<boolean> {
  const { fieldName = 'value', customError } = options;

  if (value === undefined || value === null) {
    return {
      valid: false,
      error: customError || `${fieldName} is required`,
    };
  }

  if (typeof value === 'boolean') {
    return { valid: true, value };
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return { valid: true, value: true };
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return { valid: true, value: false };
    }
  }

  if (typeof value === 'number') {
    return { valid: true, value: value !== 0 };
  }

  return {
    valid: false,
    error: customError || `${fieldName} must be a boolean`,
  };
}

// ============================================================================
// Special Validators
// ============================================================================

/**
 * Validate URL format
 */
export function validateUrl(
  value: unknown,
  options: ValidationOptions & { protocols?: string[] } = {}
): ValidationResult<string> {
  const stringResult = validateString(value, options);
  if (!stringResult.valid) return stringResult;

  const { fieldName = 'URL', protocols = ['http:', 'https:'] } = options;
  const str = stringResult.value!;

  try {
    const url = new URL(str);
    if (!protocols.includes(url.protocol)) {
      return {
        valid: false,
        error: `${fieldName} must use one of these protocols: ${protocols.join(', ')}`,
      };
    }
    return { valid: true, value: str };
  } catch {
    return {
      valid: false,
      error: `${fieldName} is not a valid URL`,
    };
  }
}

/**
 * Validate email format
 */
export function validateEmail(
  value: unknown,
  options: ValidationOptions = {}
): ValidationResult<string> {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validatePattern(value, emailPattern, {
    ...options,
    fieldName: options.fieldName || 'email',
    patternDescription: 'a valid email format',
  });
}

// ============================================================================
// Composite Validators
// ============================================================================

/**
 * Validate optional value (returns valid with undefined if not provided)
 */
export function validateOptional<T>(
  value: unknown,
  validator: (value: unknown, options: ValidationOptions) => ValidationResult<T>,
  options: ValidationOptions = {}
): ValidationResult<T | undefined> {
  if (value === undefined || value === null) {
    return { valid: true, value: undefined };
  }
  return validator(value, options);
}

/**
 * Validate with default value
 */
export function validateWithDefault<T>(
  value: unknown,
  defaultValue: T,
  validator: (value: unknown, options: ValidationOptions) => ValidationResult<T>,
  options: ValidationOptions = {}
): ValidationResult<T> {
  if (value === undefined || value === null) {
    return { valid: true, value: defaultValue };
  }
  return validator(value, options);
}

// ============================================================================
// Schema-based Validation
// ============================================================================

export interface SchemaField<T = unknown> {
  validator: (value: unknown, options: ValidationOptions) => ValidationResult<T>;
  required?: boolean;
  default?: T;
  fieldName?: string;
}

export type Schema = Record<string, SchemaField>;

/**
 * Validate an object against a schema
 */
export function validateSchema<T extends Record<string, unknown>>(
  data: unknown,
  schema: Schema,
  options: { strict?: boolean } = {}
): ValidationResult<T> {
  const objectResult = validateObject(data);
  if (!objectResult.valid) return objectResult as ValidationResult<T>;

  const obj = objectResult.value!;
  const result: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    const value = obj[key];
    const fieldName = field.fieldName || key;

    if (value === undefined || value === null) {
      if (field.required !== false && field.default === undefined) {
        errors.push(`${fieldName} is required`);
      } else if (field.default !== undefined) {
        result[key] = field.default;
      }
      continue;
    }

    const fieldResult = field.validator(value, { fieldName });
    if (!fieldResult.valid) {
      errors.push(fieldResult.error!);
    } else {
      result[key] = fieldResult.value;
    }
  }

  // Check for unknown keys in strict mode
  if (options.strict) {
    const schemaKeys = new Set(Object.keys(schema));
    for (const key of Object.keys(obj)) {
      if (!schemaKeys.has(key)) {
        errors.push(`Unknown field: ${key}`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
    };
  }

  return { valid: true, value: result as T };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert validation passes or throw error
 */
export function assertValid<T>(result: ValidationResult<T>, context?: string): T {
  if (!result.valid) {
    const prefix = context ? `${context}: ` : '';
    throw new Error(`${prefix}${result.error}`);
  }
  return result.value!;
}

/**
 * Create a throwing validator
 */
export function createAssertingValidator<T>(
  validator: (value: unknown, options?: ValidationOptions) => ValidationResult<T>
): (value: unknown, context?: string, options?: ValidationOptions) => T {
  return (value: unknown, context?: string, options?: ValidationOptions) => {
    return assertValid(validator(value, options), context);
  };
}

// Pre-built asserting validators
export const assertString = createAssertingValidator(validateString);
export const assertNumber = createAssertingValidator(validateNumber);
export const assertPositiveInteger = createAssertingValidator(validatePositiveInteger);
export const assertArray = createAssertingValidator(validateArray);
export const assertObject = createAssertingValidator(validateObject);
export const assertBoolean = createAssertingValidator(validateBoolean);
export const assertUrl = createAssertingValidator(validateUrl);
export const assertEmail = createAssertingValidator(validateEmail);
