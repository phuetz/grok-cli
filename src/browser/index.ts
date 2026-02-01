/**
 * Browser Module
 *
 * Browser automation via Chrome DevTools Protocol.
 */

// Types
export type {
  BrowserLaunchOptions,
  ViewportOptions,
  NavigationOptions,
  ScreenshotOptions,
  PDFOptions,
  SelectorOptions,
  ClickOptions,
  TypeOptions,
  Cookie,
  PageMetrics,
  ConsoleMessage,
  NetworkRequest,
  NetworkResponse,
  BrowserEvents,
} from './types.js';

export {
  DEFAULT_BROWSER_OPTIONS,
  DEFAULT_NAVIGATION_OPTIONS,
} from './types.js';

// Controller
export {
  CDPConnection,
  PageController,
  BrowserController,
  getBrowser,
  closeBrowser,
} from './controller.js';
