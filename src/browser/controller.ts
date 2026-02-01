/**
 * Browser Controller
 *
 * Provides browser automation via Chrome DevTools Protocol.
 * Works with both Puppeteer and Playwright-style APIs.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger.js';
import type {
  BrowserLaunchOptions,
  NavigationOptions,
  ScreenshotOptions,
  PDFOptions,
  SelectorOptions,
  ClickOptions,
  TypeOptions,
  Cookie,
  PageMetrics,
  ConsoleMessage,
  ViewportOptions,
} from './types.js';
import { DEFAULT_BROWSER_OPTIONS, DEFAULT_NAVIGATION_OPTIONS } from './types.js';

// ============================================================================
// CDP Connection
// ============================================================================

/**
 * CDP WebSocket connection
 */
export class CDPConnection {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingMessages: Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map();
  private eventListeners: Map<string, Set<(params: unknown) => void>> = new Map();

  async connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // In Node.js, we'd use the 'ws' package
        // This is a simplified version for the interface
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => resolve();
        this.ws.onerror = (err) => reject(new Error(`WebSocket error: ${err}`));
        this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data as string));
        this.ws.onclose = () => this.handleClose();
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: { id?: number; method?: string; params?: unknown; result?: unknown; error?: { message: string } }): void {
    if (message.id !== undefined) {
      // Response to a command
      const pending = this.pendingMessages.get(message.id);
      if (pending) {
        this.pendingMessages.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.method) {
      // Event
      const listeners = this.eventListeners.get(message.method);
      if (listeners) {
        for (const listener of listeners) {
          listener(message.params);
        }
      }
    }
  }

  private handleClose(): void {
    for (const pending of this.pendingMessages.values()) {
      pending.reject(new Error('Connection closed'));
    }
    this.pendingMessages.clear();
  }

  async send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const id = ++this.messageId;

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event: string, callback: (params: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: (params: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============================================================================
// Page Controller
// ============================================================================

/**
 * Controls a browser page/tab
 */
export class PageController extends EventEmitter {
  private cdp: CDPConnection;
  private targetId: string;
  private frameId: string = '';

  constructor(cdp: CDPConnection, targetId: string) {
    super();
    this.cdp = cdp;
    this.targetId = targetId;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.cdp.on('Console.messageAdded', (params: unknown) => {
      const { message } = params as { message: { level: string; text: string } };
      this.emit('console', {
        type: message.level,
        text: message.text,
        args: [],
      } as ConsoleMessage);
    });

    this.cdp.on('Page.javascriptDialogOpening', (params: unknown) => {
      const { type, message } = params as { type: string; message: string };
      this.emit('dialog', { type, message });
    });
  }

  /**
   * Navigate to URL
   */
  async goto(url: string, options: NavigationOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_NAVIGATION_OPTIONS, ...options };

    await this.cdp.send('Page.enable');
    await this.cdp.send('Page.navigate', { url, referrer: opts.referer });

    // Wait for load
    await this.waitForNavigation(opts);
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(options: NavigationOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_NAVIGATION_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Navigation timeout'));
      }, opts.timeout);

      const eventName = opts.waitUntil === 'domcontentloaded'
        ? 'Page.domContentEventFired'
        : 'Page.loadEventFired';

      const handler = () => {
        clearTimeout(timeout);
        this.cdp.off(eventName, handler);
        resolve();
      };

      this.cdp.on(eventName, handler);
    });
  }

  /**
   * Get current URL
   */
  async url(): Promise<string> {
    const result = await this.cdp.send('Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true,
    }) as { result: { value: string } };
    return result.result.value;
  }

  /**
   * Get page title
   */
  async title(): Promise<string> {
    const result = await this.cdp.send('Runtime.evaluate', {
      expression: 'document.title',
      returnByValue: true,
    }) as { result: { value: string } };
    return result.result.value;
  }

  /**
   * Get page content
   */
  async content(): Promise<string> {
    const result = await this.cdp.send('Runtime.evaluate', {
      expression: 'document.documentElement.outerHTML',
      returnByValue: true,
    }) as { result: { value: string } };
    return result.result.value;
  }

  /**
   * Set page content
   */
  async setContent(html: string): Promise<void> {
    await this.cdp.send('Page.setDocumentContent', {
      frameId: this.frameId,
      html,
    });
  }

  /**
   * Wait for selector
   */
  async waitForSelector(selector: string, options: SelectorOptions = {}): Promise<void> {
    const timeout = options.timeout ?? 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.cdp.send('Runtime.evaluate', {
        expression: `document.querySelector('${selector.replace(/'/g, "\\'")}')`,
        returnByValue: false,
      }) as { result: { objectId?: string } };

      if (result.result.objectId) {
        return;
      }

      await new Promise(r => setTimeout(r, 100));
    }

    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  /**
   * Click element
   */
  async click(selector: string, options: ClickOptions = {}): Promise<void> {
    // Get element position
    const box = await this.cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`,
      returnByValue: true,
    }) as { result: { value: { x: number; y: number } | null } };

    if (!box.result.value) {
      throw new Error(`Element not found: ${selector}`);
    }

    const { x, y } = box.result.value;
    const offsetX = options.offsetX ?? 0;
    const offsetY = options.offsetY ?? 0;

    await this.cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: x + offsetX,
      y: y + offsetY,
      button: options.button ?? 'left',
      clickCount: options.clickCount ?? 1,
    });

    if (options.delay) {
      await new Promise(r => setTimeout(r, options.delay));
    }

    await this.cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: x + offsetX,
      y: y + offsetY,
      button: options.button ?? 'left',
      clickCount: options.clickCount ?? 1,
    });
  }

  /**
   * Type text into element
   */
  async type(selector: string, text: string, options: TypeOptions = {}): Promise<void> {
    await this.click(selector);

    for (const char of text) {
      await this.cdp.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: char,
      });
      await this.cdp.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        text: char,
      });

      if (options.delay) {
        await new Promise(r => setTimeout(r, options.delay));
      }
    }
  }

  /**
   * Evaluate JavaScript
   */
  async evaluate<T>(fn: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T> {
    const expression = typeof fn === 'string'
      ? fn
      : `(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(',')})`;

    const result = await this.cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }) as { result: { value: T } };

    return result.result.value;
  }

  /**
   * Take screenshot
   */
  async screenshot(options: ScreenshotOptions = {}): Promise<Buffer | string> {
    const format = options.type ?? 'png';
    const quality = format === 'png' ? undefined : options.quality ?? 80;

    const params: Record<string, unknown> = {
      format,
      quality,
      captureBeyondViewport: options.fullPage ?? false,
    };

    if (options.clip) {
      params.clip = {
        ...options.clip,
        scale: 1,
      };
    }

    const result = await this.cdp.send('Page.captureScreenshot', params) as { data: string };

    if (options.encoding === 'base64') {
      return result.data;
    }

    return Buffer.from(result.data, 'base64');
  }

  /**
   * Generate PDF
   */
  async pdf(options: PDFOptions = {}): Promise<Buffer> {
    const result = await this.cdp.send('Page.printToPDF', {
      landscape: options.landscape ?? false,
      displayHeaderFooter: options.displayHeaderFooter ?? false,
      headerTemplate: options.headerTemplate ?? '',
      footerTemplate: options.footerTemplate ?? '',
      printBackground: options.printBackground ?? false,
      scale: options.scale ?? 1,
      paperWidth: typeof options.width === 'number' ? options.width / 96 : undefined,
      paperHeight: typeof options.height === 'number' ? options.height / 96 : undefined,
      marginTop: typeof options.margin?.top === 'number' ? options.margin.top / 96 : undefined,
      marginBottom: typeof options.margin?.bottom === 'number' ? options.margin.bottom / 96 : undefined,
      marginLeft: typeof options.margin?.left === 'number' ? options.margin.left / 96 : undefined,
      marginRight: typeof options.margin?.right === 'number' ? options.margin.right / 96 : undefined,
      pageRanges: options.pageRanges ?? '',
      preferCSSPageSize: options.preferCSSPageSize ?? false,
    }) as { data: string };

    return Buffer.from(result.data, 'base64');
  }

  /**
   * Set viewport
   */
  async setViewport(viewport: ViewportOptions): Promise<void> {
    await this.cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
      mobile: viewport.isMobile ?? false,
      screenOrientation: viewport.isLandscape
        ? { angle: 90, type: 'landscapePrimary' }
        : { angle: 0, type: 'portraitPrimary' },
    });
  }

  /**
   * Get cookies
   */
  async cookies(): Promise<Cookie[]> {
    const result = await this.cdp.send('Network.getCookies') as { cookies: Cookie[] };
    return result.cookies;
  }

  /**
   * Set cookies
   */
  async setCookie(...cookies: Cookie[]): Promise<void> {
    for (const cookie of cookies) {
      await this.cdp.send('Network.setCookie', cookie as unknown as Record<string, unknown>);
    }
  }

  /**
   * Delete cookies
   */
  async deleteCookie(...cookies: Pick<Cookie, 'name' | 'domain'>[]): Promise<void> {
    for (const cookie of cookies) {
      await this.cdp.send('Network.deleteCookies', cookie as unknown as Record<string, unknown>);
    }
  }

  /**
   * Get page metrics
   */
  async metrics(): Promise<PageMetrics> {
    const result = await this.cdp.send('Performance.getMetrics') as { metrics: Array<{ name: string; value: number }> };
    const metrics: Record<string, number> = {};
    for (const { name, value } of result.metrics) {
      metrics[name] = value;
    }
    return metrics as unknown as PageMetrics;
  }

  /**
   * Reload page
   */
  async reload(options?: NavigationOptions): Promise<void> {
    await this.cdp.send('Page.reload');
    await this.waitForNavigation(options);
  }

  /**
   * Go back
   */
  async goBack(options?: NavigationOptions): Promise<void> {
    await this.cdp.send('Page.goBack');
    await this.waitForNavigation(options);
  }

  /**
   * Go forward
   */
  async goForward(options?: NavigationOptions): Promise<void> {
    await this.cdp.send('Page.goForward');
    await this.waitForNavigation(options);
  }

  /**
   * Close page
   */
  async close(): Promise<void> {
    await this.cdp.send('Target.closeTarget', { targetId: this.targetId });
  }
}

// ============================================================================
// Browser Controller
// ============================================================================

/**
 * Main browser controller
 */
export class BrowserController extends EventEmitter {
  private options: BrowserLaunchOptions;
  private process: ChildProcess | null = null;
  private cdp: CDPConnection | null = null;
  private pagesMap: Map<string, PageController> = new Map();
  private wsEndpoint: string = '';

  constructor(options: Partial<BrowserLaunchOptions> = {}) {
    super();
    this.options = { ...DEFAULT_BROWSER_OPTIONS, ...options };
  }

  /**
   * Launch browser
   */
  async launch(): Promise<void> {
    const execPath = this.options.executablePath ?? this.findChromePath();

    if (!execPath) {
      throw new Error('Chrome executable not found');
    }

    const args = [
      '--remote-debugging-port=' + (this.options.devToolsPort ?? 0),
      ...(this.options.headless ? ['--headless'] : []),
      ...(this.options.args ?? []),
    ];

    if (this.options.userDataDir) {
      args.push('--user-data-dir=' + this.options.userDataDir);
    }

    this.process = spawn(execPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Parse WebSocket URL from stderr
    this.wsEndpoint = await this.getWSEndpoint();

    // Connect via CDP
    this.cdp = new CDPConnection();
    await this.cdp.connect(this.wsEndpoint);
  }

  /**
   * Find Chrome executable path
   */
  private findChromePath(): string | null {
    const paths = [
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      // Mac
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      // Windows
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    // In a real implementation, we'd check if the path exists
    return paths[0];
  }

  /**
   * Get WebSocket endpoint from browser output
   */
  private async getWSEndpoint(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for browser to start'));
      }, this.options.timeout ?? 30000);

      this.process!.stderr!.on('data', (data: Buffer) => {
        const match = data.toString().match(/ws:\/\/[^\s]+/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[0]);
        }
      });

      this.process!.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.process!.on('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Browser exited with code ${code}`));
      });
    });
  }

  /**
   * Connect to existing browser
   */
  async connect(wsEndpoint: string): Promise<void> {
    this.wsEndpoint = wsEndpoint;
    this.cdp = new CDPConnection();
    await this.cdp.connect(wsEndpoint);
  }

  /**
   * Create new page
   */
  async newPage(): Promise<PageController> {
    if (!this.cdp) {
      throw new Error('Browser not connected');
    }

    const result = await this.cdp.send('Target.createTarget', {
      url: 'about:blank',
    }) as { targetId: string };

    const page = new PageController(this.cdp, result.targetId);
    this.pagesMap.set(result.targetId, page);

    if (this.options.defaultViewport) {
      await page.setViewport(this.options.defaultViewport);
    }

    return page;
  }

  /**
   * Get all pages
   */
  async pages(): Promise<PageController[]> {
    return Array.from(this.pagesMap.values());
  }

  /**
   * Get browser version
   */
  async version(): Promise<string> {
    if (!this.cdp) {
      throw new Error('Browser not connected');
    }

    const result = await this.cdp.send('Browser.getVersion') as { product: string };
    return result.product;
  }

  /**
   * Get WebSocket endpoint
   */
  wsEndpointUrl(): string {
    return this.wsEndpoint;
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    // Close all pages
    for (const page of this.pagesMap.values()) {
      await page.close().catch((err) => {
        logger.debug('Page close error (ignored)', { error: err instanceof Error ? err.message : String(err) });
      });
    }
    this.pagesMap.clear();

    // Disconnect CDP
    if (this.cdp) {
      this.cdp.disconnect();
      this.cdp = null;
    }

    // Kill process
    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    this.emit('close');
  }

  /**
   * Check if browser is connected
   */
  isConnected(): boolean {
    return this.cdp !== null;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let browserInstance: BrowserController | null = null;

/**
 * Get or launch browser
 */
export async function getBrowser(options?: Partial<BrowserLaunchOptions>): Promise<BrowserController> {
  if (!browserInstance) {
    browserInstance = new BrowserController(options);
    await browserInstance.launch();
  }
  return browserInstance;
}

/**
 * Close browser
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
