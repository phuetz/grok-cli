/**
 * Tests for Error Classes and Utilities
 */

import {
  GrokError,
  APIKeyError,
  APIError,
  NetworkError,
  TimeoutError,
  FileError,
  FileNotFoundError,
  ToolExecutionError,
  InvalidCommandError,
  CommandExecutionError,
  ValidationError,
  ConfigurationError,
  SearchError,
  RateLimitError,
  PermissionError,
  NotFoundError,
  IOError,
  ParseError,
  MaxIterationsError,
  MCPError,
  ErrorCode,
  isGrokError,
  getErrorMessage,
  withTimeout,
  withRetry,
  createError,
  hasErrorCode,
  wrapError,
} from '../src/utils/errors';

describe('GrokError', () => {
  it('should create error with message and code', () => {
    const error = new GrokError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('GrokError');
  });

  it('should create error with details', () => {
    const error = new GrokError('Test error', 'TEST_CODE', { key: 'value' });
    expect(error.details).toEqual({ key: 'value' });
  });

  it('should serialize to JSON', () => {
    const error = new GrokError('Test error', 'TEST_CODE', { key: 'value' });
    const json = error.toJSON();
    expect(json).toEqual({
      name: 'GrokError',
      message: 'Test error',
      code: 'TEST_CODE',
      details: { key: 'value' },
    });
  });
});

describe('APIKeyError', () => {
  it('should create error with default message', () => {
    const error = new APIKeyError();
    expect(error.message).toBe('No API key found');
    expect(error.code).toBe('API_KEY_ERROR');
  });

  it('should create error with custom message', () => {
    const error = new APIKeyError('Invalid API key format');
    expect(error.message).toBe('Invalid API key format');
  });
});

describe('APIError', () => {
  it('should create error with status code', () => {
    const error = new APIError('Request failed', 500, { error: 'Internal Server Error' });
    expect(error.message).toBe('Request failed');
    expect(error.statusCode).toBe(500);
    expect(error.response).toEqual({ error: 'Internal Server Error' });
  });
});

describe('NetworkError', () => {
  it('should create error with original error', () => {
    const originalError = new Error('Connection refused');
    const error = new NetworkError('Network request failed', originalError);
    expect(error.message).toBe('Network request failed');
    expect(error.originalError).toBe(originalError);
  });
});

describe('TimeoutError', () => {
  it('should create error with timeout value', () => {
    const error = new TimeoutError('Request timed out', 5000);
    expect(error.message).toBe('Request timed out');
    expect(error.timeoutMs).toBe(5000);
  });
});

describe('FileError', () => {
  it('should create error with file path and operation', () => {
    const error = new FileError('Cannot read file', '/path/to/file.txt', 'read');
    expect(error.message).toBe('Cannot read file');
    expect(error.filePath).toBe('/path/to/file.txt');
    expect(error.operation).toBe('read');
  });
});

describe('FileNotFoundError', () => {
  it('should create error with file path', () => {
    const error = new FileNotFoundError('/path/to/missing.txt');
    expect(error.message).toBe('File not found: /path/to/missing.txt');
    expect(error.filePath).toBe('/path/to/missing.txt');
    expect(error.code).toBe('FILE_NOT_FOUND');
  });
});

describe('ToolExecutionError', () => {
  it('should create error with tool name and args', () => {
    const error = new ToolExecutionError('Tool failed', 'bash', { command: 'ls' });
    expect(error.message).toBe('Tool failed');
    expect(error.toolName).toBe('bash');
    expect(error.toolArgs).toEqual({ command: 'ls' });
  });
});

describe('InvalidCommandError', () => {
  it('should create error with command', () => {
    const error = new InvalidCommandError('Command is dangerous', 'rm -rf /');
    expect(error.message).toBe('Command is dangerous');
    expect(error.command).toBe('rm -rf /');
  });
});

describe('CommandExecutionError', () => {
  it('should create error with command details', () => {
    const error = new CommandExecutionError('Command failed', 'ls /nonexistent', 2, 'No such file');
    expect(error.message).toBe('Command failed');
    expect(error.command).toBe('ls /nonexistent');
    expect(error.exitCode).toBe(2);
    expect(error.stderr).toBe('No such file');
  });
});

describe('ValidationError', () => {
  it('should create error with field and value', () => {
    const error = new ValidationError('Invalid email', 'email', 'not-an-email');
    expect(error.message).toBe('Invalid email');
    expect(error.field).toBe('email');
    expect(error.value).toBe('not-an-email');
  });
});

describe('ConfigurationError', () => {
  it('should create error with config key', () => {
    const error = new ConfigurationError('Invalid config', 'api.baseUrl');
    expect(error.message).toBe('Invalid config');
    expect(error.configKey).toBe('api.baseUrl');
  });
});

describe('SearchError', () => {
  it('should create error with query and type', () => {
    const error = new SearchError('Search failed', 'test query', 'text');
    expect(error.message).toBe('Search failed');
    expect(error.query).toBe('test query');
    expect(error.searchType).toBe('text');
  });
});

describe('RateLimitError', () => {
  it('should create error with retry after', () => {
    const error = new RateLimitError('Too many requests', 60000);
    expect(error.message).toBe('Too many requests');
    expect(error.retryAfterMs).toBe(60000);
  });
});

describe('PermissionError', () => {
  it('should create error with resource and permission', () => {
    const error = new PermissionError('Access denied', '/etc/passwd', 'read');
    expect(error.message).toBe('Access denied');
    expect(error.resource).toBe('/etc/passwd');
    expect(error.requiredPermission).toBe('read');
  });
});

describe('NotFoundError', () => {
  it('should create error with resource type and id', () => {
    const error = new NotFoundError('Not found', 'user', '123');
    expect(error.message).toBe('Not found');
    expect(error.resourceType).toBe('user');
    expect(error.resourceId).toBe('123');
  });
});

describe('IOError', () => {
  it('should create error with operation and path', () => {
    const error = new IOError('IO failed', 'write', '/tmp/file.txt');
    expect(error.message).toBe('IO failed');
    expect(error.operation).toBe('write');
    expect(error.path).toBe('/tmp/file.txt');
  });
});

describe('ParseError', () => {
  it('should create error with input and position', () => {
    const error = new ParseError('Parse failed', '{ invalid json }', 2);
    expect(error.message).toBe('Parse failed');
    expect(error.position).toBe(2);
  });

  it('should truncate long input', () => {
    const longInput = 'a'.repeat(200);
    const error = new ParseError('Parse failed', longInput, 0);
    expect((error.details as { input: string }).input.length).toBe(100);
  });
});

describe('MaxIterationsError', () => {
  it('should create error with iteration info', () => {
    const error = new MaxIterationsError('Max iterations reached', 100, 101);
    expect(error.message).toBe('Max iterations reached');
    expect(error.maxIterations).toBe(100);
    expect(error.currentIteration).toBe(101);
  });
});

describe('MCPError', () => {
  it('should create error with server name and operation', () => {
    const error = new MCPError('MCP failed', 'github-server', 'list_tools');
    expect(error.message).toBe('MCP failed');
    expect(error.serverName).toBe('github-server');
    expect(error.operation).toBe('list_tools');
  });
});

describe('isGrokError', () => {
  it('should return true for GrokError', () => {
    expect(isGrokError(new GrokError('test'))).toBe(true);
  });

  it('should return true for subclasses', () => {
    expect(isGrokError(new APIKeyError())).toBe(true);
    expect(isGrokError(new ValidationError('test'))).toBe(true);
  });

  it('should return false for regular Error', () => {
    expect(isGrokError(new Error('test'))).toBe(false);
  });

  it('should return false for non-errors', () => {
    expect(isGrokError('error')).toBe(false);
    expect(isGrokError(null)).toBe(false);
    expect(isGrokError(undefined)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error', () => {
    expect(getErrorMessage(new Error('test message'))).toBe('test message');
  });

  it('should return string as-is', () => {
    expect(getErrorMessage('string error')).toBe('string error');
  });

  it('should return default for unknown types', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
    expect(getErrorMessage(123)).toBe('An unknown error occurred');
  });
});

describe('withTimeout', () => {
  it('should resolve if promise completes in time', async () => {
    const result = await withTimeout(
      Promise.resolve('success'),
      1000
    );
    expect(result).toBe('success');
  });

  it('should reject if promise times out', async () => {
    await expect(
      withTimeout(
        new Promise(resolve => setTimeout(resolve, 1000)),
        100,
        'Operation timed out'
      )
    ).rejects.toThrow(TimeoutError);
  });

  it('should include timeout duration in error', async () => {
    try {
      await withTimeout(
        new Promise(resolve => setTimeout(resolve, 1000)),
        100
      );
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).timeoutMs).toBe(100);
    }
  });
});

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { initialDelay: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should give up after max retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fail'));

    await expect(
      withRetry(fn, { maxRetries: 2, initialDelay: 10 })
    ).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should respect shouldRetry predicate', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('do not retry'));

    await expect(
      withRetry(fn, {
        maxRetries: 3,
        initialDelay: 10,
        shouldRetry: () => false
      })
    ).rejects.toThrow('do not retry');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('createError', () => {
  it('should create error with code and message', () => {
    const error = createError(ErrorCode.API_ERROR, 'API failed', { status: 500 });
    expect(error.code).toBe(ErrorCode.API_ERROR);
    expect(error.message).toBe('API failed');
    expect(error.details).toEqual({ status: 500 });
  });
});

describe('hasErrorCode', () => {
  it('should return true for matching code', () => {
    const error = new GrokError('test', ErrorCode.API_ERROR);
    expect(hasErrorCode(error, ErrorCode.API_ERROR)).toBe(true);
  });

  it('should return false for non-matching code', () => {
    const error = new GrokError('test', ErrorCode.API_ERROR);
    expect(hasErrorCode(error, ErrorCode.NETWORK_ERROR)).toBe(false);
  });

  it('should return false for non-GrokError', () => {
    expect(hasErrorCode(new Error('test'), ErrorCode.API_ERROR)).toBe(false);
  });
});

describe('wrapError', () => {
  it('should wrap error with context', () => {
    const original = new Error('Original error');
    const wrapped = wrapError(original, 'During operation');
    expect(wrapped.message).toBe('During operation: Original error');
    expect(wrapped.code).toBe('WRAPPED_ERROR');
  });

  it('should handle non-Error values', () => {
    const wrapped = wrapError('string error', 'Context');
    expect(wrapped.message).toBe('Context: string error');
  });
});

describe('ErrorCode enum', () => {
  it('should have all expected codes', () => {
    expect(ErrorCode.API_KEY_ERROR).toBe('API_KEY_ERROR');
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.RATE_LIMIT_ERROR).toBe('RATE_LIMIT_ERROR');
    expect(ErrorCode.MCP_ERROR).toBe('MCP_ERROR');
  });
});
