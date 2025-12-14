/**
 * Input Validation Utilities
 *
 * Centralized input validation for CLI arguments, tool inputs, and API parameters.
 * Provides type-safe validation with clear error messages.
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
export const assertFilePath = createAssertingValidator(validateFilePath);

// ============================================================================
// Bash Tool Schemas and Validators
// ============================================================================

/**
 * Schemas for bash tool operations
 */
export const bashToolSchemas = {
  execute: {
    command: { type: 'string' as const, required: true, minLength: 1 },
    timeout: { type: 'number' as const, required: false, min: 1, max: 600000 },
  },
  listFiles: {
    directory: { type: 'string' as const, required: false },
  },
  findFiles: {
    pattern: { type: 'string' as const, required: true, minLength: 1 },
    directory: { type: 'string' as const, required: false },
  },
  grep: {
    pattern: { type: 'string' as const, required: true, minLength: 1 },
    files: { type: 'string' as const, required: false },
  },
};

/**
 * Validate input against a schema
 */
export function validateWithSchema(
  schema: Record<string, { type: string; required?: boolean; minLength?: number; min?: number; max?: number }>,
  input: Record<string, unknown>,
  _context: string
): ValidationResult<Record<string, unknown>> {
  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];

    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }

    // Skip validation for optional undefined fields
    if (value === undefined || value === null) continue;

    // Type validation
    if (rules.type === 'string' && typeof value !== 'string') {
      return { valid: false, error: `${field} must be a string` };
    }
    if (rules.type === 'number' && typeof value !== 'number') {
      return { valid: false, error: `${field} must be a number` };
    }

    // String constraints
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return { valid: false, error: `${field} must be at least ${rules.minLength} characters` };
      }
    }

    // Number constraints
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        return { valid: false, error: `${field} must be at least ${rules.min}` };
      }
      if (rules.max !== undefined && value > rules.max) {
        return { valid: false, error: `${field} must be at most ${rules.max}` };
      }
    }
  }

  return { valid: true, value: input };
}

/**
 * Dangerous command patterns for validation
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /rm\s+(-rf?|--recursive)\s+[/~]/i,
  /rm\s+.*\/\s*$/i,
  />\s*\/dev\/sd[a-z]/i,
  /dd\s+.*if=.*of=\/dev/i,
  /mkfs/i,
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
  /chmod\s+-R\s+777\s+\//i,
  /wget.*\|\s*(ba)?sh/i,
  /curl.*\|\s*(ba)?sh/i,
  /sudo\s+(rm|dd|mkfs)/i,
];

/**
 * Validate a command for dangerous patterns
 */
export function validateCommand(command: string): ValidationResult<string> {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: 'Command must be a non-empty string' };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { valid: false, error: `Dangerous command pattern detected` };
    }
  }

  return { valid: true, value: command };
}

/**
 * Sanitize a string for safe shell use
 */
export function sanitizeForShell(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Escape single quotes by ending the quote, adding escaped quote, and reopening
  const escaped = input.replace(/'/g, "'\\''");

  // Wrap in single quotes for safety
  return `'${escaped}'`;
}
