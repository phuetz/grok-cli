/**
 * Unit Tests for BrowserTool - New Browser Actions (Phase 8)
 *
 * Tests the 13 new browser tool actions:
 * - drag
 * - upload_files
 * - wait_for_navigation
 * - set_timezone
 * - set_locale
 * - get_local_storage
 * - set_local_storage
 * - get_session_storage
 * - set_session_storage
 * - add_route_rule
 * - remove_route_rule
 * - clear_route_rules
 * - download
 */

import { BrowserManager } from '../../src/browser-automation/browser-manager';
import { BrowserTool, BrowserToolInput } from '../../src/browser-automation/browser-tool';

// Mock the browser-manager module so BrowserTool constructor gets our mock
jest.mock('../../src/browser-automation/browser-manager', () => {
  const mockManager = {
    // Drag
    drag: jest.fn().mockResolvedValue(undefined),
    // Upload
    uploadFiles: jest.fn().mockResolvedValue(undefined),
    // Wait
    waitForNavigation: jest.fn().mockResolvedValue(undefined),
    // Storage
    getLocalStorage: jest.fn().mockResolvedValue({}),
    setLocalStorage: jest.fn().mockResolvedValue(undefined),
    getSessionStorage: jest.fn().mockResolvedValue({}),
    setSessionStorage: jest.fn().mockResolvedValue(undefined),
    // Route Rules
    addRouteRule: jest.fn().mockResolvedValue(undefined),
    removeRouteRule: jest.fn().mockResolvedValue(undefined),
    clearRouteRules: jest.fn().mockResolvedValue(undefined),
    // Timezone/Locale
    setTimezone: jest.fn().mockResolvedValue(undefined),
    setLocale: jest.fn().mockResolvedValue(undefined),
    // Download
    downloadFile: jest.fn().mockResolvedValue({ path: '/tmp/file.pdf', suggestedFilename: 'file.pdf' }),
    // Other methods that may be called during execute
    isLaunched: jest.fn().mockReturnValue(true),
    launch: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    getUrl: jest.fn().mockReturnValue('https://example.com'),
    getTitle: jest.fn().mockResolvedValue('Test Page'),
    getElement: jest.fn().mockReturnValue(null),
    getCurrentSnapshot: jest.fn().mockReturnValue(null),
    navigate: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    type: jest.fn().mockResolvedValue(undefined),
    fill: jest.fn().mockResolvedValue(undefined),
    select: jest.fn().mockResolvedValue(undefined),
    press: jest.fn().mockResolvedValue(undefined),
    hover: jest.fn().mockResolvedValue(undefined),
    scroll: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('fake')),
    pdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
    getCookies: jest.fn().mockResolvedValue([]),
    setCookies: jest.fn().mockResolvedValue(undefined),
    clearCookies: jest.fn().mockResolvedValue(undefined),
    setHeaders: jest.fn().mockResolvedValue(undefined),
    setOffline: jest.fn().mockResolvedValue(undefined),
    emulateDevice: jest.fn().mockResolvedValue(undefined),
    setGeolocation: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue({ success: true, value: 'ok' }),
    getContent: jest.fn().mockResolvedValue('<html></html>'),
    getTabs: jest.fn().mockResolvedValue([]),
    newTab: jest.fn().mockResolvedValue({ id: 'tab-1', targetId: 'tab-1', url: 'about:blank', title: '', active: true, index: 0 }),
    focusTab: jest.fn().mockResolvedValue(undefined),
    closeTab: jest.fn().mockResolvedValue(undefined),
    takeSnapshot: jest.fn().mockResolvedValue({ id: 'snap-1', elements: [], elementMap: new Map(), valid: true }),
    toTextRepresentation: jest.fn().mockReturnValue('snapshot text'),
    handleDialog: jest.fn().mockResolvedValue(undefined),
  };

  return {
    BrowserManager: jest.fn().mockImplementation(() => mockManager),
    getBrowserManager: jest.fn().mockReturnValue(mockManager),
    resetBrowserManager: jest.fn(),
    __mockManager: mockManager,
  };
});

// Mock logger to suppress output
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fs and os for screenshot directory
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

// Get the mock manager and getBrowserManager references
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const browserManagerModule = require('../../src/browser-automation/browser-manager') as any;
const mockManager = browserManagerModule.__mockManager;
const mockGetBrowserManager = browserManagerModule.getBrowserManager;

describe('BrowserTool - New Browser Actions', () => {
  let tool: BrowserTool;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply getBrowserManager return value after clearAllMocks
    mockGetBrowserManager.mockReturnValue(mockManager);
    // Re-apply default return values after clearAllMocks
    mockManager.isLaunched.mockReturnValue(true);
    mockManager.getUrl.mockReturnValue('https://example.com');
    mockManager.getTitle.mockResolvedValue('Test Page');
    mockManager.drag.mockResolvedValue(undefined);
    mockManager.uploadFiles.mockResolvedValue(undefined);
    mockManager.waitForNavigation.mockResolvedValue(undefined);
    mockManager.getLocalStorage.mockResolvedValue({});
    mockManager.setLocalStorage.mockResolvedValue(undefined);
    mockManager.getSessionStorage.mockResolvedValue({});
    mockManager.setSessionStorage.mockResolvedValue(undefined);
    mockManager.addRouteRule.mockResolvedValue(undefined);
    mockManager.removeRouteRule.mockResolvedValue(undefined);
    mockManager.clearRouteRules.mockResolvedValue(undefined);
    mockManager.setTimezone.mockResolvedValue(undefined);
    mockManager.setLocale.mockResolvedValue(undefined);
    mockManager.downloadFile.mockResolvedValue({ path: '/tmp/file.pdf', suggestedFilename: 'file.pdf' });

    tool = new BrowserTool();
  });

  // ==========================================================================
  // Drag & Drop
  // ==========================================================================

  describe('drag', () => {
    it('should drag from source element to target element', async () => {
      const result = await tool.execute({ action: 'drag', sourceRef: 1, targetRef: 5 });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Dragged [1] to [5]');
      expect(mockManager.drag).toHaveBeenCalledWith({ sourceRef: 1, targetRef: 5 });
    });

    it('should include both refs in output message', async () => {
      const result = await tool.execute({ action: 'drag', sourceRef: 10, targetRef: 20 });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Dragged [10] to [20]');
    });

    it('should return error when source ref is missing', async () => {
      const result = await tool.execute({ action: 'drag', targetRef: 5 } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source ref and target ref are required');
    });

    it('should return error when target ref is missing', async () => {
      const result = await tool.execute({ action: 'drag', sourceRef: 1 } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source ref and target ref are required');
    });

    it('should return error when both source and target refs are missing', async () => {
      const result = await tool.execute({ action: 'drag' } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source ref and target ref are required');
    });

    it('should not call manager.drag when validation fails', async () => {
      await tool.execute({ action: 'drag' } as BrowserToolInput);

      expect(mockManager.drag).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // File Upload
  // ==========================================================================

  describe('upload_files', () => {
    it('should upload files to an element', async () => {
      const result = await tool.execute({
        action: 'upload_files',
        ref: 3,
        files: ['/path/to/file1.txt', '/path/to/file2.png'],
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Uploaded 2 file(s) to [3]');
      expect(mockManager.uploadFiles).toHaveBeenCalledWith({
        ref: 3,
        files: ['/path/to/file1.txt', '/path/to/file2.png'],
      });
    });

    it('should upload a single file', async () => {
      const result = await tool.execute({
        action: 'upload_files',
        ref: 7,
        files: ['/tmp/document.pdf'],
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Uploaded 1 file(s) to [7]');
    });

    it('should return error when element ref is missing', async () => {
      const result = await tool.execute({
        action: 'upload_files',
        files: ['/path/to/file.txt'],
      } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Element ref is required');
    });

    it('should return error when files array is missing', async () => {
      const result = await tool.execute({
        action: 'upload_files',
        ref: 3,
      } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Files array is required');
    });

    it('should return error when files array is empty', async () => {
      const result = await tool.execute({
        action: 'upload_files',
        ref: 3,
        files: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Files array is required');
    });

    it('should not call manager.uploadFiles when validation fails', async () => {
      await tool.execute({ action: 'upload_files', ref: 3 } as BrowserToolInput);

      expect(mockManager.uploadFiles).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Wait for Navigation
  // ==========================================================================

  describe('wait_for_navigation', () => {
    it('should wait for navigation to complete', async () => {
      const result = await tool.execute({ action: 'wait_for_navigation' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Navigation completed');
      expect(mockManager.waitForNavigation).toHaveBeenCalledWith({ timeout: undefined });
    });

    it('should pass custom timeout to manager', async () => {
      const result = await tool.execute({ action: 'wait_for_navigation', timeout: 10000 });

      expect(result.success).toBe(true);
      expect(mockManager.waitForNavigation).toHaveBeenCalledWith({ timeout: 10000 });
    });

    it('should call waitForNavigation without timeout when not specified', async () => {
      await tool.execute({ action: 'wait_for_navigation' });

      expect(mockManager.waitForNavigation).toHaveBeenCalledWith({ timeout: undefined });
    });
  });

  // ==========================================================================
  // Set Timezone
  // ==========================================================================

  describe('set_timezone', () => {
    it('should set timezone successfully', async () => {
      const result = await tool.execute({ action: 'set_timezone', timezone: 'America/New_York' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Timezone set: America/New_York');
      expect(mockManager.setTimezone).toHaveBeenCalledWith('America/New_York');
    });

    it('should set timezone for different regions', async () => {
      const result = await tool.execute({ action: 'set_timezone', timezone: 'Asia/Tokyo' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Timezone set: Asia/Tokyo');
      expect(mockManager.setTimezone).toHaveBeenCalledWith('Asia/Tokyo');
    });

    it('should set UTC timezone', async () => {
      const result = await tool.execute({ action: 'set_timezone', timezone: 'UTC' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Timezone set: UTC');
    });

    it('should return error when timezone is missing', async () => {
      const result = await tool.execute({ action: 'set_timezone' } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timezone is required');
    });

    it('should include example in timezone error message', async () => {
      const result = await tool.execute({ action: 'set_timezone' } as BrowserToolInput);

      expect(result.error).toContain('America/New_York');
    });

    it('should not call manager.setTimezone when validation fails', async () => {
      await tool.execute({ action: 'set_timezone' } as BrowserToolInput);

      expect(mockManager.setTimezone).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Set Locale
  // ==========================================================================

  describe('set_locale', () => {
    it('should set locale successfully', async () => {
      const result = await tool.execute({ action: 'set_locale', locale: 'en-US' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Locale set: en-US');
      expect(mockManager.setLocale).toHaveBeenCalledWith('en-US');
    });

    it('should set locale for different languages', async () => {
      const result = await tool.execute({ action: 'set_locale', locale: 'ja-JP' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Locale set: ja-JP');
    });

    it('should set locale for European languages', async () => {
      const result = await tool.execute({ action: 'set_locale', locale: 'de-DE' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Locale set: de-DE');
      expect(mockManager.setLocale).toHaveBeenCalledWith('de-DE');
    });

    it('should return error when locale is missing', async () => {
      const result = await tool.execute({ action: 'set_locale' } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Locale is required');
    });

    it('should include example in locale error message', async () => {
      const result = await tool.execute({ action: 'set_locale' } as BrowserToolInput);

      expect(result.error).toContain('en-US');
    });

    it('should not call manager.setLocale when validation fails', async () => {
      await tool.execute({ action: 'set_locale' } as BrowserToolInput);

      expect(mockManager.setLocale).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Get Local Storage
  // ==========================================================================

  describe('get_local_storage', () => {
    it('should return empty localStorage', async () => {
      mockManager.getLocalStorage.mockResolvedValueOnce({});

      const result = await tool.execute({ action: 'get_local_storage' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('0 localStorage entries');
      expect(result.output).toContain('localStorage is empty');
    });

    it('should return localStorage entries', async () => {
      mockManager.getLocalStorage.mockResolvedValueOnce({
        theme: 'dark',
        language: 'en',
        token: 'abc123',
      });

      const result = await tool.execute({ action: 'get_local_storage' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('3 localStorage entries');
      expect(result.output).toContain('theme: dark');
      expect(result.output).toContain('language: en');
    });

    it('should truncate long values in display', async () => {
      const longValue = 'x'.repeat(100);
      mockManager.getLocalStorage.mockResolvedValueOnce({
        longKey: longValue,
      });

      const result = await tool.execute({ action: 'get_local_storage' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('...');
    });

    it('should include storage data in result data field', async () => {
      const storageData = { key1: 'val1', key2: 'val2' };
      mockManager.getLocalStorage.mockResolvedValueOnce(storageData);

      const result = await tool.execute({ action: 'get_local_storage' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ storage: storageData });
    });

    it('should call manager.getLocalStorage', async () => {
      await tool.execute({ action: 'get_local_storage' });

      expect(mockManager.getLocalStorage).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Set Local Storage
  // ==========================================================================

  describe('set_local_storage', () => {
    it('should set localStorage entries', async () => {
      const storageData = { theme: 'light', lang: 'fr' };

      const result = await tool.execute({
        action: 'set_local_storage',
        storageData,
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Set 2 localStorage entries');
      expect(mockManager.setLocalStorage).toHaveBeenCalledWith(storageData);
    });

    it('should set a single localStorage entry', async () => {
      const result = await tool.execute({
        action: 'set_local_storage',
        storageData: { key: 'value' },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Set 1 localStorage entries');
    });

    it('should return error when storageData is missing', async () => {
      const result = await tool.execute({ action: 'set_local_storage' } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage data object is required');
    });

    it('should not call manager.setLocalStorage when validation fails', async () => {
      await tool.execute({ action: 'set_local_storage' } as BrowserToolInput);

      expect(mockManager.setLocalStorage).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Get Session Storage
  // ==========================================================================

  describe('get_session_storage', () => {
    it('should return empty sessionStorage', async () => {
      mockManager.getSessionStorage.mockResolvedValueOnce({});

      const result = await tool.execute({ action: 'get_session_storage' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('0 sessionStorage entries');
      expect(result.output).toContain('sessionStorage is empty');
    });

    it('should return sessionStorage entries', async () => {
      mockManager.getSessionStorage.mockResolvedValueOnce({
        sessionId: 'abc-def-ghi',
        cart: '{"items":3}',
      });

      const result = await tool.execute({ action: 'get_session_storage' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('2 sessionStorage entries');
      expect(result.output).toContain('sessionId: abc-def-ghi');
      expect(result.output).toContain('cart: {"items":3}');
    });

    it('should truncate long values in display', async () => {
      const longValue = 'y'.repeat(100);
      mockManager.getSessionStorage.mockResolvedValueOnce({
        bigData: longValue,
      });

      const result = await tool.execute({ action: 'get_session_storage' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('...');
    });

    it('should include storage data in result data field', async () => {
      const storageData = { sess1: 'val1' };
      mockManager.getSessionStorage.mockResolvedValueOnce(storageData);

      const result = await tool.execute({ action: 'get_session_storage' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ storage: storageData });
    });

    it('should call manager.getSessionStorage', async () => {
      await tool.execute({ action: 'get_session_storage' });

      expect(mockManager.getSessionStorage).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Set Session Storage
  // ==========================================================================

  describe('set_session_storage', () => {
    it('should set sessionStorage entries', async () => {
      const storageData = { sessionToken: 'xyz789', userId: '42' };

      const result = await tool.execute({
        action: 'set_session_storage',
        storageData,
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Set 2 sessionStorage entries');
      expect(mockManager.setSessionStorage).toHaveBeenCalledWith(storageData);
    });

    it('should set a single sessionStorage entry', async () => {
      const result = await tool.execute({
        action: 'set_session_storage',
        storageData: { token: 'abc' },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Set 1 sessionStorage entries');
    });

    it('should return error when storageData is missing', async () => {
      const result = await tool.execute({ action: 'set_session_storage' } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage data object is required');
    });

    it('should not call manager.setSessionStorage when validation fails', async () => {
      await tool.execute({ action: 'set_session_storage' } as BrowserToolInput);

      expect(mockManager.setSessionStorage).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Add Route Rule
  // ==========================================================================

  describe('add_route_rule', () => {
    it('should add a block route rule with default action', async () => {
      const result = await tool.execute({
        action: 'add_route_rule',
        rulePattern: '**/*.ads.js',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Route rule added');
      expect(result.output).toContain('block');
      expect(result.output).toContain('**/*.ads.js');
      expect(mockManager.addRouteRule).toHaveBeenCalledWith(
        expect.objectContaining({
          urlPattern: '**/*.ads.js',
          action: 'block',
        })
      );
    });

    it('should add a mock route rule with response', async () => {
      const result = await tool.execute({
        action: 'add_route_rule',
        rulePattern: '**/api/data',
        ruleAction: 'mock',
        ruleResponse: { status: 200, body: '{"mocked":true}', contentType: 'application/json' },
      } as BrowserToolInput);

      expect(result.success).toBe(true);
      expect(result.output).toContain('mock');
      expect(mockManager.addRouteRule).toHaveBeenCalledWith(
        expect.objectContaining({
          urlPattern: '**/api/data',
          action: 'mock',
          mockResponse: {
            status: 200,
            body: '{"mocked":true}',
            contentType: 'application/json',
          },
        })
      );
    });

    it('should use provided rule ID', async () => {
      const result = await tool.execute({
        action: 'add_route_rule',
        ruleId: 'my-custom-rule',
        rulePattern: '**/tracking/**',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('my-custom-rule');
      expect(mockManager.addRouteRule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'my-custom-rule',
        })
      );
    });

    it('should auto-generate rule ID when not provided', async () => {
      const result = await tool.execute({
        action: 'add_route_rule',
        rulePattern: '**/analytics/**',
      });

      expect(result.success).toBe(true);
      expect(mockManager.addRouteRule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining('rule-'),
        })
      );
    });

    it('should return error when rule pattern is missing', async () => {
      const result = await tool.execute({ action: 'add_route_rule' } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rule pattern is required');
    });

    it('should default mock response status to 200', async () => {
      await tool.execute({
        action: 'add_route_rule',
        rulePattern: '**/api/**',
        ruleAction: 'mock',
        ruleResponse: { body: 'mocked' },
      } as BrowserToolInput);

      expect(mockManager.addRouteRule).toHaveBeenCalledWith(
        expect.objectContaining({
          mockResponse: expect.objectContaining({
            status: 200,
          }),
        })
      );
    });

    it('should not include mockResponse when ruleResponse is not provided', async () => {
      await tool.execute({
        action: 'add_route_rule',
        rulePattern: '**/blocked/**',
      });

      const calledArg = mockManager.addRouteRule.mock.calls[0][0];
      expect(calledArg.mockResponse).toBeUndefined();
    });

    it('should not call manager.addRouteRule when validation fails', async () => {
      await tool.execute({ action: 'add_route_rule' } as BrowserToolInput);

      expect(mockManager.addRouteRule).not.toHaveBeenCalled();
    });

    it('should format output with rule ID, action, and pattern', async () => {
      const result = await tool.execute({
        action: 'add_route_rule',
        ruleId: 'test-rule',
        rulePattern: '**/test/**',
      });

      expect(result.output).toBe('Route rule added: test-rule (block **/test/**)');
    });
  });

  // ==========================================================================
  // Remove Route Rule
  // ==========================================================================

  describe('remove_route_rule', () => {
    it('should remove a route rule by ID', async () => {
      const result = await tool.execute({
        action: 'remove_route_rule',
        ruleId: 'my-rule-1',
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Route rule removed: my-rule-1');
      expect(mockManager.removeRouteRule).toHaveBeenCalledWith('my-rule-1');
    });

    it('should return error when rule ID is missing', async () => {
      const result = await tool.execute({ action: 'remove_route_rule' } as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rule ID is required');
    });

    it('should not call manager.removeRouteRule when validation fails', async () => {
      await tool.execute({ action: 'remove_route_rule' } as BrowserToolInput);

      expect(mockManager.removeRouteRule).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Clear Route Rules
  // ==========================================================================

  describe('clear_route_rules', () => {
    it('should clear all route rules', async () => {
      const result = await tool.execute({ action: 'clear_route_rules' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('All route rules cleared');
      expect(mockManager.clearRouteRules).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Download
  // ==========================================================================

  describe('download', () => {
    it('should download a file by clicking an element ref', async () => {
      mockManager.downloadFile.mockResolvedValueOnce({
        path: '/tmp/downloads/report.pdf',
        suggestedFilename: 'report.pdf',
      });

      const result = await tool.execute({ action: 'download', ref: 10 });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Downloaded: report.pdf');
      expect(result.output).toContain('/tmp/downloads/report.pdf');
      expect(mockManager.downloadFile).toHaveBeenCalledWith({ ref: 10, timeout: undefined });
    });

    it('should download without specifying a ref', async () => {
      mockManager.downloadFile.mockResolvedValueOnce({
        path: '/tmp/downloads/data.csv',
        suggestedFilename: 'data.csv',
      });

      const result = await tool.execute({ action: 'download' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Downloaded: data.csv');
      expect(mockManager.downloadFile).toHaveBeenCalledWith({ ref: undefined, timeout: undefined });
    });

    it('should pass custom timeout to downloadFile', async () => {
      mockManager.downloadFile.mockResolvedValueOnce({
        path: '/tmp/large-file.zip',
        suggestedFilename: 'large-file.zip',
      });

      const result = await tool.execute({ action: 'download', ref: 5, timeout: 60000 });

      expect(result.success).toBe(true);
      expect(mockManager.downloadFile).toHaveBeenCalledWith({ ref: 5, timeout: 60000 });
    });

    it('should include download data in result', async () => {
      const downloadResult = {
        path: '/tmp/downloads/image.png',
        suggestedFilename: 'image.png',
      };
      mockManager.downloadFile.mockResolvedValueOnce(downloadResult);

      const result = await tool.execute({ action: 'download', ref: 2 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(downloadResult);
    });

    it('should format download output with filename and path', async () => {
      mockManager.downloadFile.mockResolvedValueOnce({
        path: '/tmp/dl/archive.tar.gz',
        suggestedFilename: 'archive.tar.gz',
      });

      const result = await tool.execute({ action: 'download' });

      expect(result.output).toBe('Downloaded: archive.tar.gz \u2192 /tmp/dl/archive.tar.gz');
    });
  });

  // ==========================================================================
  // Action dispatch correctness
  // ==========================================================================

  describe('action dispatch', () => {
    it('should dispatch each action to the correct manager method', async () => {
      const actions: Array<{ input: BrowserToolInput; managerMethod: string }> = [
        { input: { action: 'drag', sourceRef: 1, targetRef: 2 }, managerMethod: 'drag' },
        { input: { action: 'upload_files', ref: 1, files: ['/f.txt'] }, managerMethod: 'uploadFiles' },
        { input: { action: 'wait_for_navigation' }, managerMethod: 'waitForNavigation' },
        { input: { action: 'set_timezone', timezone: 'UTC' }, managerMethod: 'setTimezone' },
        { input: { action: 'set_locale', locale: 'en-US' }, managerMethod: 'setLocale' },
        { input: { action: 'get_local_storage' }, managerMethod: 'getLocalStorage' },
        { input: { action: 'set_local_storage', storageData: { k: 'v' } }, managerMethod: 'setLocalStorage' },
        { input: { action: 'get_session_storage' }, managerMethod: 'getSessionStorage' },
        { input: { action: 'set_session_storage', storageData: { k: 'v' } }, managerMethod: 'setSessionStorage' },
        { input: { action: 'add_route_rule', rulePattern: '**/*' }, managerMethod: 'addRouteRule' },
        { input: { action: 'remove_route_rule', ruleId: 'r1' }, managerMethod: 'removeRouteRule' },
        { input: { action: 'clear_route_rules' }, managerMethod: 'clearRouteRules' },
        { input: { action: 'download' }, managerMethod: 'downloadFile' },
      ];

      for (const { input, managerMethod } of actions) {
        jest.clearAllMocks();
        // Re-apply defaults needed after clearAllMocks
        mockGetBrowserManager.mockReturnValue(mockManager);
        mockManager.isLaunched.mockReturnValue(true);
        mockManager.getLocalStorage.mockResolvedValue({});
        mockManager.getSessionStorage.mockResolvedValue({});
        mockManager.downloadFile.mockResolvedValue({ path: '/tmp/f', suggestedFilename: 'f' });

        const result = await tool.execute(input);

        expect(result.success).toBe(true);
        expect(mockManager[managerMethod]).toHaveBeenCalled();
      }
    });
  });

  // ==========================================================================
  // Unknown action handling
  // ==========================================================================

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await tool.execute({ action: 'nonexistent_action' } as unknown as BrowserToolInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
      expect(result.error).toContain('nonexistent_action');
    });
  });
});
