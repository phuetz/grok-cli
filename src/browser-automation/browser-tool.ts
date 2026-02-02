/**
 * Browser Tool
 *
 * OpenClaw-inspired unified browser control interface for AI agents.
 */

import { ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getBrowserManager, BrowserManager } from './browser-manager.js';

// ============================================================================
// Types
// ============================================================================

export type BrowserAction =
  // Lifecycle
  | 'launch'
  | 'connect'
  | 'close'
  // Tabs
  | 'tabs'
  | 'new_tab'
  | 'focus_tab'
  | 'close_tab'
  // Snapshot
  | 'snapshot'
  | 'get_element'
  | 'find_elements'
  // Navigation
  | 'navigate'
  | 'go_back'
  | 'go_forward'
  | 'reload'
  // Interaction
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'type'
  | 'fill'
  | 'select'
  | 'press'
  | 'hover'
  | 'scroll'
  // Media
  | 'screenshot'
  | 'pdf'
  // Cookies
  | 'get_cookies'
  | 'set_cookie'
  | 'clear_cookies'
  // Network
  | 'set_headers'
  | 'set_offline'
  // Device
  | 'emulate_device'
  | 'set_geolocation'
  // JS
  | 'evaluate'
  | 'get_content'
  // Info
  | 'get_url'
  | 'get_title';

export interface BrowserToolInput {
  action: BrowserAction;
  // Connection
  cdpUrl?: string;
  headless?: boolean;
  // Tab
  tabId?: string;
  // Navigation
  url?: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  // Snapshot
  interactiveOnly?: boolean;
  includeHidden?: boolean;
  maxElements?: number;
  labels?: boolean;
  // Element
  ref?: number;
  role?: string;
  name?: string;
  // Interaction
  text?: string;
  key?: string;
  modifiers?: string[];
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  clear?: boolean;
  // Fill
  fields?: Record<string, string>;
  submit?: boolean;
  // Select
  value?: string;
  label?: string;
  index?: number;
  // Scroll
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
  toElement?: number;
  // Screenshot
  fullPage?: boolean;
  element?: number;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  outputPath?: string;
  // Cookies
  cookieName?: string;
  cookieValue?: string;
  cookieDomain?: string;
  // Headers
  headers?: Record<string, string>;
  offline?: boolean;
  // Device
  device?: string;
  viewport?: { width: number; height: number };
  // Geolocation
  latitude?: number;
  longitude?: number;
  // JS
  expression?: string;
  // Timeout
  timeout?: number;
}

// ============================================================================
// Browser Tool
// ============================================================================

export class BrowserTool {
  private manager: BrowserManager;
  private screenshotDir: string;

  constructor() {
    this.manager = getBrowserManager();
    this.screenshotDir = path.join(os.tmpdir(), 'codebuddy-screenshots');
  }

  /**
   * Execute browser action
   */
  async execute(input: BrowserToolInput): Promise<ToolResult> {
    const { action } = input;

    logger.debug('Browser action', { action, input });

    try {
      switch (action) {
        // Lifecycle
        case 'launch':
          return this.launch(input);
        case 'connect':
          return this.connect(input);
        case 'close':
          return this.close();

        // Tabs
        case 'tabs':
          return this.getTabs();
        case 'new_tab':
          return this.newTab(input);
        case 'focus_tab':
          return this.focusTab(input);
        case 'close_tab':
          return this.closeTab(input);

        // Snapshot
        case 'snapshot':
          return this.takeSnapshot(input);
        case 'get_element':
          return this.getElement(input);
        case 'find_elements':
          return this.findElements(input);

        // Navigation
        case 'navigate':
          return this.navigate(input);
        case 'go_back':
          return this.goBack();
        case 'go_forward':
          return this.goForward();
        case 'reload':
          return this.reload();

        // Interaction
        case 'click':
          return this.click(input);
        case 'double_click':
          return this.doubleClick(input);
        case 'right_click':
          return this.rightClick(input);
        case 'type':
          return this.type(input);
        case 'fill':
          return this.fill(input);
        case 'select':
          return this.select(input);
        case 'press':
          return this.press(input);
        case 'hover':
          return this.hover(input);
        case 'scroll':
          return this.scroll(input);

        // Media
        case 'screenshot':
          return this.screenshot(input);
        case 'pdf':
          return this.pdf(input);

        // Cookies
        case 'get_cookies':
          return this.getCookies();
        case 'set_cookie':
          return this.setCookie(input);
        case 'clear_cookies':
          return this.clearCookies();

        // Network
        case 'set_headers':
          return this.setHeaders(input);
        case 'set_offline':
          return this.setOffline(input);

        // Device
        case 'emulate_device':
          return this.emulateDevice(input);
        case 'set_geolocation':
          return this.setGeolocation(input);

        // JS
        case 'evaluate':
          return this.evaluate(input);
        case 'get_content':
          return this.getContent();

        // Info
        case 'get_url':
          return this.getUrl();
        case 'get_title':
          return this.getTitle();

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Browser action error', { action, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  private async launch(input: BrowserToolInput): Promise<ToolResult> {
    if (this.manager.isLaunched()) {
      return { success: true, output: 'Browser already launched' };
    }

    await this.manager.launch();

    return { success: true, output: 'Browser launched successfully' };
  }

  private async connect(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.cdpUrl) {
      return { success: false, error: 'CDP URL is required' };
    }

    await this.manager.connect(input.cdpUrl);

    return { success: true, output: `Connected to browser at ${input.cdpUrl}` };
  }

  private async close(): Promise<ToolResult> {
    await this.manager.close();
    return { success: true, output: 'Browser closed' };
  }

  // ============================================================================
  // Tabs
  // ============================================================================

  private async getTabs(): Promise<ToolResult> {
    const tabs = await this.manager.getTabs();

    const output = tabs
      .map(t => `${t.active ? '>' : ' '} [${t.id}] ${t.title} - ${t.url}`)
      .join('\n');

    return {
      success: true,
      output: `${tabs.length} tabs open:\n${output}`,
      data: { tabs },
    };
  }

  private async newTab(input: BrowserToolInput): Promise<ToolResult> {
    const tab = await this.manager.newTab(input.url);

    return {
      success: true,
      output: `New tab opened: ${tab.title} (${tab.url})`,
      data: { tab },
    };
  }

  private async focusTab(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.tabId) {
      return { success: false, error: 'Tab ID is required' };
    }

    await this.manager.focusTab(input.tabId);

    return { success: true, output: `Focused tab: ${input.tabId}` };
  }

  private async closeTab(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.tabId) {
      return { success: false, error: 'Tab ID is required' };
    }

    await this.manager.closeTab(input.tabId);

    return { success: true, output: `Closed tab: ${input.tabId}` };
  }

  // ============================================================================
  // Snapshot
  // ============================================================================

  private async takeSnapshot(input: BrowserToolInput): Promise<ToolResult> {
    const snapshot = await this.manager.takeSnapshot({
      interactiveOnly: input.interactiveOnly ?? true,
      includeHidden: input.includeHidden,
      maxElements: input.maxElements,
    });

    const textRepresentation = this.manager.toTextRepresentation(snapshot);

    return {
      success: true,
      output: textRepresentation,
      data: {
        snapshotId: snapshot.id,
        url: snapshot.url,
        title: snapshot.title,
        elementCount: snapshot.elements.length,
      },
    };
  }

  private async getElement(input: BrowserToolInput): Promise<ToolResult> {
    if (input.ref === undefined) {
      return { success: false, error: 'Element ref is required' };
    }

    const element = this.manager.getElement(input.ref);
    if (!element) {
      return { success: false, error: `Element [${input.ref}] not found. Take a new snapshot.` };
    }

    return {
      success: true,
      output: `Element [${element.ref}]: ${element.role} - "${element.name}" at (${element.center.x}, ${element.center.y})`,
      data: element,
    };
  }

  private async findElements(input: BrowserToolInput): Promise<ToolResult> {
    const snapshot = this.manager.getCurrentSnapshot();
    if (!snapshot) {
      return { success: false, error: 'No valid snapshot. Take a snapshot first.' };
    }

    let elements = snapshot.elements;

    if (input.role) {
      elements = elements.filter(e => e.role.toLowerCase() === input.role!.toLowerCase());
    }

    if (input.name) {
      const nameLower = input.name.toLowerCase();
      elements = elements.filter(e =>
        e.name.toLowerCase().includes(nameLower) ||
        (e.text && e.text.toLowerCase().includes(nameLower))
      );
    }

    if (input.interactiveOnly) {
      elements = elements.filter(e => e.interactive);
    }

    const output = elements
      .slice(0, 20)
      .map(e => `[${e.ref}] ${e.role}: "${e.name || e.text || 'unnamed'}"`)
      .join('\n');

    return {
      success: true,
      output: `Found ${elements.length} elements:\n${output}`,
      data: { elements: elements.slice(0, 50) },
    };
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  private async navigate(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.url) {
      return { success: false, error: 'URL is required' };
    }

    await this.manager.navigate({
      url: input.url,
      waitUntil: input.waitUntil,
      timeout: input.timeout,
    });

    const title = await this.manager.getTitle();

    return { success: true, output: `Navigated to: ${input.url}\nTitle: ${title}` };
  }

  private async goBack(): Promise<ToolResult> {
    await this.manager.goBack();
    return { success: true, output: 'Navigated back' };
  }

  private async goForward(): Promise<ToolResult> {
    await this.manager.goForward();
    return { success: true, output: 'Navigated forward' };
  }

  private async reload(): Promise<ToolResult> {
    await this.manager.reload();
    return { success: true, output: 'Page reloaded' };
  }

  // ============================================================================
  // Interactions
  // ============================================================================

  private async click(input: BrowserToolInput): Promise<ToolResult> {
    if (input.ref === undefined) {
      return { success: false, error: 'Element ref is required' };
    }

    await this.manager.click(input.ref, {
      button: input.button,
      clickCount: input.clickCount,
    });

    const element = this.manager.getElement(input.ref);
    return { success: true, output: `Clicked [${input.ref}] ${element?.name || ''}` };
  }

  private async doubleClick(input: BrowserToolInput): Promise<ToolResult> {
    if (input.ref === undefined) {
      return { success: false, error: 'Element ref is required' };
    }

    await this.manager.click(input.ref, { clickCount: 2 });

    return { success: true, output: `Double-clicked [${input.ref}]` };
  }

  private async rightClick(input: BrowserToolInput): Promise<ToolResult> {
    if (input.ref === undefined) {
      return { success: false, error: 'Element ref is required' };
    }

    await this.manager.click(input.ref, { button: 'right' });

    return { success: true, output: `Right-clicked [${input.ref}]` };
  }

  private async type(input: BrowserToolInput): Promise<ToolResult> {
    if (input.ref === undefined) {
      return { success: false, error: 'Element ref is required' };
    }
    if (!input.text) {
      return { success: false, error: 'Text is required' };
    }

    await this.manager.type(input.ref, input.text, { clear: input.clear });

    return { success: true, output: `Typed "${input.text.slice(0, 30)}${input.text.length > 30 ? '...' : ''}" into [${input.ref}]` };
  }

  private async fill(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.fields) {
      return { success: false, error: 'Fields object is required' };
    }

    // Convert string keys to numbers
    const fields: Record<number, string> = {};
    for (const [key, value] of Object.entries(input.fields)) {
      fields[parseInt(key, 10)] = value;
    }

    await this.manager.fill({ fields, submit: input.submit });

    return { success: true, output: `Filled ${Object.keys(fields).length} fields` };
  }

  private async select(input: BrowserToolInput): Promise<ToolResult> {
    if (input.ref === undefined) {
      return { success: false, error: 'Element ref is required' };
    }

    await this.manager.select({
      ref: input.ref,
      value: input.value,
      label: input.label,
      index: input.index,
    });

    return { success: true, output: `Selected option in [${input.ref}]` };
  }

  private async press(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.key) {
      return { success: false, error: 'Key is required' };
    }

    await this.manager.press(input.key, input.modifiers);

    const modStr = input.modifiers?.join('+') || '';
    return { success: true, output: `Pressed ${modStr}${modStr ? '+' : ''}${input.key}` };
  }

  private async hover(input: BrowserToolInput): Promise<ToolResult> {
    if (input.ref === undefined) {
      return { success: false, error: 'Element ref is required' };
    }

    await this.manager.hover(input.ref);

    return { success: true, output: `Hovering over [${input.ref}]` };
  }

  private async scroll(input: BrowserToolInput): Promise<ToolResult> {
    await this.manager.scroll({
      direction: input.direction,
      amount: input.amount,
      toElement: input.toElement,
    });

    if (input.toElement !== undefined) {
      return { success: true, output: `Scrolled to element [${input.toElement}]` };
    }
    return { success: true, output: `Scrolled ${input.direction || 'down'} ${input.amount || 300}px` };
  }

  // ============================================================================
  // Media
  // ============================================================================

  private async screenshot(input: BrowserToolInput): Promise<ToolResult> {
    await fs.mkdir(this.screenshotDir, { recursive: true });

    const buffer = await this.manager.screenshot({
      fullPage: input.fullPage,
      element: input.element,
      format: input.format,
      quality: input.quality,
    });

    const filename = input.outputPath ||
      path.join(this.screenshotDir, `screenshot-${Date.now()}.${input.format || 'png'}`);

    await fs.writeFile(filename, buffer);

    return {
      success: true,
      output: `Screenshot saved: ${filename}`,
      data: { path: filename, size: buffer.length },
    };
  }

  private async pdf(input: BrowserToolInput): Promise<ToolResult> {
    await fs.mkdir(this.screenshotDir, { recursive: true });

    const buffer = await this.manager.pdf({});

    const filename = input.outputPath ||
      path.join(this.screenshotDir, `page-${Date.now()}.pdf`);

    await fs.writeFile(filename, buffer);

    return {
      success: true,
      output: `PDF saved: ${filename}`,
      data: { path: filename, size: buffer.length },
    };
  }

  // ============================================================================
  // Cookies
  // ============================================================================

  private async getCookies(): Promise<ToolResult> {
    const cookies = await this.manager.getCookies();

    const output = cookies
      .slice(0, 20)
      .map(c => `${c.name}: ${c.value.slice(0, 30)}${c.value.length > 30 ? '...' : ''}`)
      .join('\n');

    return {
      success: true,
      output: `${cookies.length} cookies:\n${output}`,
      data: { cookies },
    };
  }

  private async setCookie(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.cookieName || !input.cookieValue) {
      return { success: false, error: 'Cookie name and value are required' };
    }

    await this.manager.setCookies([{
      name: input.cookieName,
      value: input.cookieValue,
      domain: input.cookieDomain,
    }]);

    return { success: true, output: `Cookie set: ${input.cookieName}` };
  }

  private async clearCookies(): Promise<ToolResult> {
    await this.manager.clearCookies();
    return { success: true, output: 'Cookies cleared' };
  }

  // ============================================================================
  // Network
  // ============================================================================

  private async setHeaders(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.headers) {
      return { success: false, error: 'Headers object is required' };
    }

    await this.manager.setHeaders(input.headers);

    return { success: true, output: `Set ${Object.keys(input.headers).length} headers` };
  }

  private async setOffline(input: BrowserToolInput): Promise<ToolResult> {
    await this.manager.setOffline(input.offline ?? true);

    return { success: true, output: input.offline ? 'Offline mode enabled' : 'Online mode enabled' };
  }

  // ============================================================================
  // Device
  // ============================================================================

  private async emulateDevice(input: BrowserToolInput): Promise<ToolResult> {
    await this.manager.emulateDevice({
      name: input.device,
      viewport: input.viewport,
    });

    return { success: true, output: `Emulating device: ${input.device || `${input.viewport?.width}x${input.viewport?.height}`}` };
  }

  private async setGeolocation(input: BrowserToolInput): Promise<ToolResult> {
    if (input.latitude === undefined || input.longitude === undefined) {
      return { success: false, error: 'Latitude and longitude are required' };
    }

    await this.manager.setGeolocation({
      latitude: input.latitude,
      longitude: input.longitude,
    });

    return { success: true, output: `Geolocation set: ${input.latitude}, ${input.longitude}` };
  }

  // ============================================================================
  // JavaScript
  // ============================================================================

  private async evaluate(input: BrowserToolInput): Promise<ToolResult> {
    if (!input.expression) {
      return { success: false, error: 'JavaScript expression is required' };
    }

    const result = await this.manager.evaluate({
      expression: input.expression,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      output: `Result: ${JSON.stringify(result.value, null, 2)}`,
      data: { result: result.value },
    };
  }

  private async getContent(): Promise<ToolResult> {
    const content = await this.manager.getContent();

    // Truncate for display
    const truncated = content.length > 5000
      ? content.slice(0, 5000) + '\n... (truncated)'
      : content;

    return {
      success: true,
      output: truncated,
      data: { length: content.length },
    };
  }

  // ============================================================================
  // Info
  // ============================================================================

  private async getUrl(): Promise<ToolResult> {
    const url = this.manager.getUrl();
    return { success: true, output: url };
  }

  private async getTitle(): Promise<ToolResult> {
    const title = await this.manager.getTitle();
    return { success: true, output: title };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let browserToolInstance: BrowserTool | null = null;

export function getBrowserTool(): BrowserTool {
  if (!browserToolInstance) {
    browserToolInstance = new BrowserTool();
  }
  return browserToolInstance;
}

export function resetBrowserTool(): void {
  browserToolInstance = null;
}

export default BrowserTool;
