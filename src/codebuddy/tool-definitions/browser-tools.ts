/**
 * Browser Tool Definitions
 *
 * OpenClaw-inspired browser automation for AI agents via CDP.
 */

import { CodeBuddyTool } from './types.js';

/**
 * Browser Tool
 *
 * Full browser automation with Smart Snapshot element references.
 */
export const BROWSER_TOOL: CodeBuddyTool = {
  type: 'function',
  function: {
    name: 'browser',
    description: `Control a web browser with full automation capabilities.

WORKFLOW:
1. 'launch' to start browser (or 'connect' to existing)
2. 'navigate' to a URL
3. 'snapshot' to detect page elements - elements get numeric refs [1], [2], etc.
4. Use refs in click/type/fill actions
5. 'screenshot' or 'pdf' to capture content

ACTIONS:
Lifecycle:
- launch: Start new browser instance
- connect: Connect to existing browser via CDP URL
- close: Close browser

Tabs:
- tabs: List all open tabs
- new_tab: Open new tab (optionally with URL)
- focus_tab: Focus tab by ID
- close_tab: Close tab by ID

Snapshot:
- snapshot: Take snapshot of page, returns elements with refs [1], [2], etc.
- get_element: Get details of element by ref
- find_elements: Search elements by role/name

Navigation:
- navigate: Go to URL
- go_back: Navigate back
- go_forward: Navigate forward
- reload: Reload page

Interaction:
- click: Click element by ref
- double_click: Double-click element
- right_click: Right-click element
- type: Type text into element
- fill: Fill multiple form fields at once
- select: Select option in dropdown
- press: Press keyboard key
- hover: Hover over element
- scroll: Scroll page or to element

Media:
- screenshot: Capture screenshot (full page or element)
- pdf: Generate PDF of page

Network:
- get_cookies: List all cookies
- set_cookie: Set a cookie
- clear_cookies: Clear all cookies
- set_headers: Set extra HTTP headers
- set_offline: Enable/disable offline mode

Device:
- emulate_device: Emulate device (iPhone, iPad, etc.)
- set_geolocation: Set GPS location

JavaScript:
- evaluate: Execute JavaScript in page context
- get_content: Get page HTML content
- get_url: Get current URL
- get_title: Get page title`,
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'launch', 'connect', 'close',
            'tabs', 'new_tab', 'focus_tab', 'close_tab',
            'snapshot', 'get_element', 'find_elements',
            'navigate', 'go_back', 'go_forward', 'reload',
            'click', 'double_click', 'right_click', 'type', 'fill', 'select', 'press', 'hover', 'scroll',
            'screenshot', 'pdf',
            'get_cookies', 'set_cookie', 'clear_cookies', 'set_headers', 'set_offline',
            'emulate_device', 'set_geolocation',
            'evaluate', 'get_content', 'get_url', 'get_title',
          ],
          description: 'The browser action to perform',
        },
        // Connection
        cdpUrl: {
          type: 'string',
          description: 'CDP WebSocket URL for connecting to existing browser',
        },
        headless: {
          type: 'boolean',
          description: 'Run browser in headless mode (default: true)',
        },
        // Tab
        tabId: {
          type: 'string',
          description: 'Tab ID for focus_tab/close_tab',
        },
        // Navigation
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
        waitUntil: {
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle'],
          description: 'When to consider navigation complete',
        },
        // Snapshot
        interactiveOnly: {
          type: 'boolean',
          description: 'Only include interactive elements in snapshot',
        },
        maxElements: {
          type: 'number',
          description: 'Maximum elements to include in snapshot',
        },
        // Element
        ref: {
          type: 'number',
          description: 'Element reference number from snapshot',
        },
        role: {
          type: 'string',
          description: 'Element role to search for (button, link, textbox, etc.)',
        },
        name: {
          type: 'string',
          description: 'Element name/text to search for',
        },
        // Interaction
        text: {
          type: 'string',
          description: 'Text to type',
        },
        key: {
          type: 'string',
          description: 'Key to press (Enter, Tab, Escape, etc.)',
        },
        modifiers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Modifier keys (Control, Alt, Shift, Meta)',
        },
        button: {
          type: 'string',
          enum: ['left', 'right', 'middle'],
          description: 'Mouse button',
        },
        clear: {
          type: 'boolean',
          description: 'Clear field before typing',
        },
        // Fill
        fields: {
          type: 'object',
          description: 'Fields to fill: { "refNumber": "value", ... }',
          additionalProperties: { type: 'string' },
        },
        submit: {
          type: 'boolean',
          description: 'Press Enter after filling fields',
        },
        // Select
        value: {
          type: 'string',
          description: 'Value to select in dropdown',
        },
        label: {
          type: 'string',
          description: 'Label to select in dropdown',
        },
        index: {
          type: 'number',
          description: 'Index to select in dropdown',
        },
        // Scroll
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Scroll direction',
        },
        amount: {
          type: 'number',
          description: 'Scroll amount in pixels',
        },
        toElement: {
          type: 'number',
          description: 'Element ref to scroll to',
        },
        // Screenshot
        fullPage: {
          type: 'boolean',
          description: 'Capture full page vs viewport only',
        },
        element: {
          type: 'number',
          description: 'Element ref to capture',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp'],
          description: 'Image format',
        },
        quality: {
          type: 'number',
          description: 'Image quality (0-100)',
        },
        // Cookies
        cookieName: {
          type: 'string',
          description: 'Cookie name',
        },
        cookieValue: {
          type: 'string',
          description: 'Cookie value',
        },
        cookieDomain: {
          type: 'string',
          description: 'Cookie domain',
        },
        // Headers
        headers: {
          type: 'object',
          description: 'HTTP headers to set',
          additionalProperties: { type: 'string' },
        },
        offline: {
          type: 'boolean',
          description: 'Enable offline mode',
        },
        // Device
        device: {
          type: 'string',
          description: 'Device name to emulate (iPhone 14, iPad Pro, Pixel 5, etc.)',
        },
        viewport: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            height: { type: 'number' },
          },
          description: 'Custom viewport size',
        },
        // Geolocation
        latitude: {
          type: 'number',
          description: 'Latitude for geolocation',
        },
        longitude: {
          type: 'number',
          description: 'Longitude for geolocation',
        },
        // JavaScript
        expression: {
          type: 'string',
          description: 'JavaScript code to evaluate in page',
        },
        // Timeout
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
        },
      },
      required: ['action'],
    },
  },
};

/**
 * All browser tools
 */
export const BROWSER_TOOLS: CodeBuddyTool[] = [
  BROWSER_TOOL,
];

export default BROWSER_TOOLS;
