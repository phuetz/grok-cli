/**
 * Unit Tests for BrowserTool
 *
 * Tests the browser automation tool's functionality including:
 * - Initialization and configuration
 * - Navigation and page interaction
 * - Form handling
 * - Screenshot capture
 * - Security (blocked URLs)
 * - Error handling
 */

import { BrowserTool, getBrowserTool, resetBrowserTool, BrowserConfig } from '../../src/tools/browser-tool';

// Mock playwright module
const mockPage = {
  goto: jest.fn().mockResolvedValue(null),
  click: jest.fn().mockResolvedValue(undefined),
  fill: jest.fn().mockResolvedValue(undefined),
  screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
  textContent: jest.fn().mockResolvedValue('Page text content'),
  innerHTML: jest.fn().mockResolvedValue('<div>HTML content</div>'),
  content: jest.fn().mockResolvedValue('<html><body>Full page</body></html>'),
  title: jest.fn().mockResolvedValue('Test Page Title'),
  url: jest.fn().mockReturnValue('https://example.com'),
  evaluate: jest.fn().mockResolvedValue('evaluated result'),
  waitForSelector: jest.fn().mockResolvedValue({}),
  selectOption: jest.fn().mockResolvedValue(['option1']),
  hover: jest.fn().mockResolvedValue(undefined),
  goBack: jest.fn().mockResolvedValue(null),
  goForward: jest.fn().mockResolvedValue(null),
  reload: jest.fn().mockResolvedValue(null),
  close: jest.fn().mockResolvedValue(undefined),
  $: jest.fn().mockResolvedValue({}),
  $$: jest.fn().mockResolvedValue([]),
  $$eval: jest.fn().mockImplementation((_selector, fn) => {
    // Simulate DOM evaluation
    if (_selector === 'a[href]') {
      return Promise.resolve([
        { href: 'https://example.com/link1', text: 'Link 1', title: 'Title 1' },
        { href: 'https://example.com/link2', text: 'Link 2', title: undefined },
      ]);
    }
    if (_selector === 'form') {
      return Promise.resolve([
        {
          action: 'https://example.com/submit',
          method: 'POST',
          id: 'form1',
          name: 'testForm',
          fields: [
            { name: 'username', type: 'text', id: 'user', required: true },
            { name: 'password', type: 'password', id: 'pass', required: true },
          ],
        },
      ]);
    }
    return Promise.resolve([]);
  }),
};

const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockChromium = {
  launch: jest.fn().mockResolvedValue(mockBrowser),
};

// Mock playwright object
const mockPlaywright = {
  chromium: mockChromium,
  firefox: { launch: mockChromium.launch },
  webkit: { launch: mockChromium.launch },
};

describe('BrowserTool', () => {
  let tool: BrowserTool;

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetBrowserTool();
    tool = new BrowserTool();
    // Inject mock playwright for testing
    tool._injectPlaywright(mockPlaywright);
  });

  afterEach(async () => {
    await tool.dispose();
  });

  describe('Constructor and Configuration', () => {
    it('should create with default config', () => {
      const config = tool.getConfig();

      expect(config.headless).toBe(true);
      expect(config.viewport).toEqual({ width: 1280, height: 720 });
      expect(config.timeout).toBe(30000);
      expect(config.browserType).toBe('chromium');
      expect(config.javaScriptEnabled).toBe(true);
    });

    it('should create with custom config', () => {
      const customTool = new BrowserTool({
        headless: false,
        viewport: { width: 1920, height: 1080 },
        timeout: 60000,
        browserType: 'firefox',
      });

      const config = customTool.getConfig();

      expect(config.headless).toBe(false);
      expect(config.viewport).toEqual({ width: 1920, height: 1080 });
      expect(config.timeout).toBe(60000);
      expect(config.browserType).toBe('firefox');
    });

    it('should update configuration', () => {
      const listener = jest.fn();
      tool.on('config:updated', listener);

      tool.updateConfig({ timeout: 45000 });

      expect(tool.getConfig().timeout).toBe(45000);
      expect(listener).toHaveBeenCalled();
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('browser');
      expect(tool.description).toContain('browser');
      expect(tool.dangerLevel).toBe('medium');
      expect(tool.inputSchema.properties.action).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should not be initialized before first action', () => {
      expect(tool.isInitialized()).toBe(false);
    });

    it('should initialize on first action', async () => {
      const result = await tool.execute({ action: 'navigate', url: 'https://example.com' });

      expect(result.success).toBe(true);
      expect(tool.isInitialized()).toBe(true);
      expect(mockChromium.launch).toHaveBeenCalledWith({ headless: true });
    });

    it('should return installation instructions when playwright unavailable', async () => {
      // Create a fresh tool without injecting playwright
      const freshTool = new BrowserTool();
      // Don't inject playwright - let it try to dynamically import

      const result = await freshTool.execute({ action: 'navigate', url: 'https://example.com' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Playwright is not installed');
      expect(result.error).toContain('npm install playwright');

      await freshTool.dispose();
    });
  });

  describe('Navigation', () => {
    it('should navigate to URL', async () => {
      const result = await tool.execute({ action: 'navigate', url: 'https://example.com' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Navigated to');
      expect(result.output).toContain('Test Page Title');
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ waitUntil: 'domcontentloaded' })
      );
    });

    it('should require URL for navigate action', async () => {
      const result = await tool.execute({ action: 'navigate' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('URL is required');
    });

    it('should emit navigate event', async () => {
      const listener = jest.fn();
      tool.on('browser:navigate', listener);

      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://example.com', title: 'Test Page Title' })
      );
    });
  });

  describe('Security - Blocked URLs', () => {
    const blockedUrls = [
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://192.168.1.1',
      'http://10.0.0.1',
      'http://172.16.0.1',
      'file:///etc/passwd',
      'http://0.0.0.0',
    ];

    test.each(blockedUrls)('should block internal URL: %s', async (url) => {
      const result = await tool.execute({ action: 'navigate', url });

      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked');
    });

    it('should allow external URLs', async () => {
      const result = await tool.execute({ action: 'navigate', url: 'https://google.com' });

      expect(result.success).toBe(true);
    });
  });

  describe('Click Action', () => {
    it('should click on element', async () => {
      // Initialize first
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'click', selector: '#submit-btn' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Clicked on');
      expect(mockPage.click).toHaveBeenCalledWith('#submit-btn', expect.any(Object));
    });

    it('should require selector for click', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'click' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Selector is required');
    });

    it('should emit click event', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });
      const listener = jest.fn();
      tool.on('browser:click', listener);

      await tool.execute({ action: 'click', selector: '.button' });

      expect(listener).toHaveBeenCalledWith({ selector: '.button' });
    });
  });

  describe('Fill Action', () => {
    it('should fill input field', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({
        action: 'fill',
        selector: '#username',
        value: 'testuser',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Filled');
      expect(mockPage.fill).toHaveBeenCalledWith('#username', 'testuser', expect.any(Object));
    });

    it('should require selector and value for fill', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result1 = await tool.execute({ action: 'fill', value: 'test' });
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Selector is required');

      const result2 = await tool.execute({ action: 'fill', selector: '#input' });
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Value is required');
    });
  });

  describe('Screenshot Action', () => {
    it('should take screenshot', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'screenshot' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Screenshot saved');
      expect(result.metadata?.path).toBeDefined();
      expect(mockPage.screenshot).toHaveBeenCalled();
    });

    it('should take full page screenshot', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      await tool.execute({
        action: 'screenshot',
        screenshotOptions: { fullPage: true },
      });

      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({ fullPage: true })
      );
    });

    it('should emit screenshot event', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });
      const listener = jest.fn();
      tool.on('browser:screenshot', listener);

      await tool.execute({ action: 'screenshot' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.any(String), size: expect.any(Number) })
      );
    });
  });

  describe('Get Text Action', () => {
    it('should get text from selector', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'getText', selector: '.content' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Page text content');
    });

    it('should get all page text when no selector', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });
      mockPage.evaluate.mockResolvedValueOnce('Full page text');

      const result = await tool.execute({ action: 'getText' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Full page text');
    });
  });

  describe('Get HTML Action', () => {
    it('should get HTML from selector', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'getHtml', selector: '.container' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('HTML content');
    });

    it('should get full page HTML when no selector', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'getHtml' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('<html>');
    });
  });

  describe('Evaluate Action', () => {
    it('should evaluate JavaScript', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({
        action: 'evaluate',
        script: 'document.title',
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('evaluated result');
    });

    it('should require script for evaluate', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'evaluate' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Script is required');
    });
  });

  describe('Wait For Selector Action', () => {
    it('should wait for selector', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({
        action: 'waitForSelector',
        selector: '.loaded',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Element found');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.loaded', expect.any(Object));
    });

    it('should require selector', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'waitForSelector' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Selector is required');
    });
  });

  describe('Get Links Action', () => {
    it('should get all links on page', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'getLinks' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Link 1');
      expect(result.output).toContain('https://example.com/link1');
      expect(result.metadata?.count).toBe(2);
    });
  });

  describe('Get Forms Action', () => {
    it('should get all forms on page', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'getForms' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Form 1');
      expect(result.output).toContain('POST');
      expect(result.output).toContain('username');
      expect(result.output).toContain('password');
    });
  });

  describe('Select Action', () => {
    it('should select option from dropdown', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({
        action: 'select',
        selector: '#dropdown',
        value: 'option1',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Selected');
      expect(mockPage.selectOption).toHaveBeenCalledWith('#dropdown', 'option1');
    });
  });

  describe('Hover Action', () => {
    it('should hover over element', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'hover', selector: '.menu-item' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hovering over');
      expect(mockPage.hover).toHaveBeenCalledWith('.menu-item');
    });
  });

  describe('Scroll Action', () => {
    it('should scroll page', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({
        action: 'scroll',
        scrollOptions: { y: 1000 },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Scrolled to');
    });
  });

  describe('Navigation History Actions', () => {
    it('should go back in history', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'goBack' });

      expect(result.success).toBe(true);
      expect(mockPage.goBack).toHaveBeenCalled();
    });

    it('should go forward in history', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'goForward' });

      expect(result.success).toBe(true);
      expect(mockPage.goForward).toHaveBeenCalled();
    });

    it('should reload page', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'reload' });

      expect(result.success).toBe(true);
      expect(mockPage.reload).toHaveBeenCalled();
    });
  });

  describe('Close Action', () => {
    it('should close browser', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'close' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Browser closed');
      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should emit closed event', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });
      const listener = jest.fn();
      tool.on('browser:closed', listener);

      await tool.execute({ action: 'close' });

      expect(listener).toHaveBeenCalled();
    });

    it('should handle close without initialization', async () => {
      const result = await tool.execute({ action: 'close' });

      expect(result.success).toBe(true);
    });
  });

  describe('Page Info', () => {
    it('should return null when not initialized', async () => {
      const info = await tool.getPageInfo();

      expect(info).toBeNull();
    });

    it('should return page info when initialized', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const info = await tool.getPageInfo();

      expect(info).toEqual({
        url: 'https://example.com',
        title: 'Test Page Title',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      const result = await tool.execute({ action: 'unknownAction' as any });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should handle action errors gracefully', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });
      mockPage.click.mockRejectedValueOnce(new Error('Element not found'));

      const result = await tool.execute({ action: 'click', selector: '.missing' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Element not found');
    });

    it('should return error result on action failure', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });
      mockPage.click.mockRejectedValueOnce(new Error('Click failed'));

      const result = await tool.execute({ action: 'click', selector: '.btn' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Click failed');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getBrowserTool', async () => {
      await resetBrowserTool();

      const instance1 = getBrowserTool();
      const instance2 = getBrowserTool();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', async () => {
      const instance1 = getBrowserTool();
      await resetBrowserTool();
      const instance2 = getBrowserTool();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Dispose', () => {
    it('should cleanup resources on dispose', async () => {
      await tool.execute({ action: 'navigate', url: 'https://example.com' });

      await tool.dispose();

      expect(tool.isInitialized()).toBe(false);
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});
