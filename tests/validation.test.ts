/**
 * Tests for Input Validation Module
 */

import { InputValidator, Validators, ValidationResult } from '../src/utils/validation';

describe('InputValidator', () => {
  describe('validateString', () => {
    it('should validate a valid string', () => {
      const result = InputValidator.validateString('hello world', 'testField');
      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe('hello world');
    });

    it('should reject non-string values', () => {
      const result = InputValidator.validateString(123, 'testField');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should reject empty strings when allowEmpty is false', () => {
      const result = InputValidator.validateString('', 'testField', { allowEmpty: false });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should accept empty strings when allowEmpty is true', () => {
      const result = InputValidator.validateString('', 'testField', { allowEmpty: true });
      expect(result.valid).toBe(true);
    });

    it('should enforce minimum length', () => {
      const result = InputValidator.validateString('hi', 'testField', { minLength: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 5 characters');
    });

    it('should enforce maximum length', () => {
      const result = InputValidator.validateString('hello world', 'testField', { maxLength: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 5 characters');
    });

    it('should validate against pattern', () => {
      const result = InputValidator.validateString('abc123', 'testField', {
        pattern: /^[a-z]+$/,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not match required pattern');
    });

    it('should detect path traversal attempts', () => {
      const result = InputValidator.validateString('../../../etc/passwd', 'path');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dangerous content');
    });

    it('should detect null bytes', () => {
      const result = InputValidator.validateString('hello\x00world', 'testField');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dangerous content');
    });

    it('should detect script injection', () => {
      const result = InputValidator.validateString('<script>alert("xss")</script>', 'testField');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dangerous content');
    });

    it('should detect command substitution', () => {
      const result = InputValidator.validateString('$(rm -rf /)', 'testField');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dangerous content');
    });

    it('should trim strings by default', () => {
      const result = InputValidator.validateString('  hello  ', 'testField');
      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe('hello');
    });

    it('should not trim when trim is false', () => {
      const result = InputValidator.validateString('  hello  ', 'testField', { trim: false });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateNumber', () => {
    it('should validate a valid number', () => {
      const result = InputValidator.validateNumber(42, 'testField');
      expect(result.valid).toBe(true);
    });

    it('should validate string numbers', () => {
      const result = InputValidator.validateNumber('42', 'testField');
      expect(result.valid).toBe(true);
    });

    it('should reject non-numeric strings', () => {
      const result = InputValidator.validateNumber('not a number', 'testField');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a valid number');
    });

    it('should enforce minimum value', () => {
      const result = InputValidator.validateNumber(5, 'testField', { min: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 10');
    });

    it('should enforce maximum value', () => {
      const result = InputValidator.validateNumber(100, 'testField', { max: 50 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 50');
    });

    it('should validate integers', () => {
      const result = InputValidator.validateNumber(3.14, 'testField', { integer: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an integer');
    });

    it('should validate positive numbers', () => {
      const result = InputValidator.validateNumber(-5, 'testField', { positive: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be positive');
    });
  });

  describe('validatePath', () => {
    it('should validate a valid path', async () => {
      const result = await InputValidator.validatePath('/tmp/test.txt');
      expect(result.valid).toBe(true);
    });

    it('should reject non-string paths', async () => {
      const result = await InputValidator.validatePath(123);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should reject empty paths', async () => {
      const result = await InputValidator.validatePath('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject path traversal', async () => {
      const result = await InputValidator.validatePath('../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path traversal');
    });

    it('should reject null bytes in path', async () => {
      const result = await InputValidator.validatePath('/tmp/test\x00.txt');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should enforce max depth', async () => {
      const deepPath = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z';
      const result = await InputValidator.validatePath(deepPath, { maxDepth: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('depth exceeds');
    });

    it('should check blocked paths', async () => {
      const result = await InputValidator.validatePath('/etc/passwd', {
        blockedPaths: ['/etc/passwd'],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should validate file extensions', async () => {
      const result = await InputValidator.validatePath('/tmp/test.exe', {
        allowedExtensions: ['.txt', '.js'],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });

  describe('validateArray', () => {
    it('should validate a valid array', () => {
      const result = InputValidator.validateArray([1, 2, 3], 'testField');
      expect(result.valid).toBe(true);
    });

    it('should reject non-arrays', () => {
      const result = InputValidator.validateArray('not an array', 'testField');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an array');
    });

    it('should enforce minimum items', () => {
      const result = InputValidator.validateArray([1], 'testField', { minItems: 3 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 3 items');
    });

    it('should enforce maximum items', () => {
      const result = InputValidator.validateArray([1, 2, 3, 4, 5], 'testField', { maxItems: 3 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 3 items');
    });

    it('should validate items with custom validator', () => {
      const itemValidator = (item: unknown) =>
        InputValidator.validateNumber(item, 'item', { min: 0 });
      const result = InputValidator.validateArray([1, -1, 3], 'testField', { itemValidator });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('[1]');
    });
  });

  describe('validateObject', () => {
    it('should validate a valid object', () => {
      const schema = {
        name: {
          required: true,
          validator: (v: unknown) => InputValidator.validateString(v, 'name'),
        },
      };
      const result = InputValidator.validateObject({ name: 'test' }, 'testField', schema);
      expect(result.valid).toBe(true);
    });

    it('should reject non-objects', () => {
      const result = InputValidator.validateObject('not an object', 'testField', {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an object');
    });

    it('should enforce required fields', () => {
      const schema = {
        name: {
          required: true,
          validator: (v: unknown) => InputValidator.validateString(v, 'name'),
        },
      };
      const result = InputValidator.validateObject({}, 'testField', schema);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('is required');
    });
  });

  describe('sanitizeString', () => {
    it('should remove null bytes', () => {
      const result = InputValidator.sanitizeString('hello\x00world');
      expect(result).toBe('helloworld');
    });

    it('should remove control characters', () => {
      const result = InputValidator.sanitizeString('hello\x01\x02world');
      expect(result).toBe('helloworld');
    });

    it('should normalize line endings', () => {
      const result = InputValidator.sanitizeString('hello\r\nworld\r\n');
      expect(result).toBe('hello\nworld');
    });

    it('should trim whitespace', () => {
      const result = InputValidator.sanitizeString('  hello  ');
      expect(result).toBe('hello');
    });
  });

  describe('sanitizeFileName', () => {
    it('should replace illegal characters', () => {
      const result = InputValidator.sanitizeFileName('file<>:"/\\|?*.txt');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain(':');
    });

    it('should remove trailing dots', () => {
      const result = InputValidator.sanitizeFileName('file...');
      expect(result).toBe('file');
    });

    it('should replace spaces with underscores', () => {
      const result = InputValidator.sanitizeFileName('my file name.txt');
      expect(result).toBe('my_file_name.txt');
    });

    it('should limit length to 255', () => {
      const longName = 'a'.repeat(300);
      const result = InputValidator.sanitizeFileName(longName);
      expect(result.length).toBe(255);
    });
  });

  describe('validateCommandArg', () => {
    it('should validate a valid command argument', () => {
      const result = InputValidator.validateCommandArg('simple-arg', 'arg');
      expect(result.valid).toBe(true);
    });

    it('should reject shell metacharacters', () => {
      const result = InputValidator.validateCommandArg('arg; rm -rf /', 'arg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('metacharacters');
    });

    it('should reject pipe characters', () => {
      const result = InputValidator.validateCommandArg('arg | cat', 'arg');
      expect(result.valid).toBe(false);
    });

    it('should reject backticks', () => {
      const result = InputValidator.validateCommandArg('`whoami`', 'arg');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate a valid email', () => {
      const result = InputValidator.validateEmail('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = InputValidator.validateEmail('not-an-email');
      expect(result.valid).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = InputValidator.validateEmail('test@');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate a valid URL', () => {
      const result = InputValidator.validateUrl('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const result = InputValidator.validateUrl('not-a-url');
      expect(result.valid).toBe(false);
    });

    it('should reject disallowed protocols', () => {
      const result = InputValidator.validateUrl('ftp://example.com', 'url', {
        allowedProtocols: ['http:', 'https:'],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('protocol');
    });
  });
});

describe('Validators convenience functions', () => {
  it('nonEmptyString should reject empty strings', () => {
    const validator = Validators.nonEmptyString('name');
    const result = validator('');
    expect(result.valid).toBe(false);
  });

  it('positiveInteger should validate positive integers', () => {
    const validator = Validators.positiveInteger('count');
    expect(validator(5).valid).toBe(true);
    expect(validator(-1).valid).toBe(false);
    expect(validator(3.14).valid).toBe(false);
  });
});
