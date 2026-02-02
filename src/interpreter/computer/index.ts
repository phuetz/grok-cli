/**
 * Computer Module
 *
 * Unified access to computer capabilities:
 * - browser: Silent web search and page fetching
 * - os: Operating system interactions (clipboard, processes, etc.)
 * - files: File system operations
 * - skills: Skills library for reusable automations
 *
 * Inspired by Open Interpreter's computer module.
 *
 * Usage:
 * ```typescript
 * import { computer } from './interpreter/computer';
 *
 * // Silent web search
 * const results = await computer.browser.search('TypeScript best practices');
 *
 * // Get selected text
 * const selected = await computer.os.getSelectedText();
 *
 * // File operations
 * const content = await computer.files.read('~/config.json');
 *
 * // Run a skill
 * await computer.skills.load();
 * const result = await computer.skills.run('web-search', { query: 'AI news' });
 * ```
 */

// Browser
export {
  ComputerBrowser,
  getComputerBrowser,
  resetComputerBrowser,
  DEFAULT_BROWSER_CONFIG,
} from './browser.js';

export type {
  SearchResult,
  SearchOptions,
  PageContent,
  FetchOptions,
  BrowserConfig,
} from './browser.js';

// OS
export {
  ComputerOS,
  getComputerOS,
  resetComputerOS,
} from './os.js';

export type {
  ClipboardContent,
  SystemInfo,
  ProcessInfo,
  DisplayInfo,
} from './os.js';

// Files
export {
  ComputerFiles,
  getComputerFiles,
  resetComputerFiles,
} from './files.js';

export type {
  FileInfo,
  SearchOptions as FileSearchOptions,
  CopyOptions,
  ReadOptions,
  WriteOptions,
  WatchCallback,
} from './files.js';

// Skills
export {
  ComputerSkills,
  getComputerSkills,
  resetComputerSkills,
  DEFAULT_SKILL_LIBRARY_CONFIG,
} from './skills.js';

export type {
  Skill,
  SkillParameter,
  SkillStep,
  SkillExample,
  SkillRunResult,
  StepResult,
  SkillSearchResult,
  SkillLibraryConfig,
} from './skills.js';

// ============================================================================
// Unified Computer Interface
// ============================================================================

import { getComputerBrowser, ComputerBrowser } from './browser.js';
import { getComputerOS, ComputerOS } from './os.js';
import { getComputerFiles, ComputerFiles } from './files.js';
import { getComputerSkills, ComputerSkills } from './skills.js';

/**
 * Unified computer interface
 */
export interface Computer {
  browser: ComputerBrowser;
  os: ComputerOS;
  files: ComputerFiles;
  skills: ComputerSkills;
}

/**
 * Get the unified computer interface
 */
export function getComputer(): Computer {
  return {
    browser: getComputerBrowser(),
    os: getComputerOS(),
    files: getComputerFiles(),
    skills: getComputerSkills(),
  };
}

/**
 * Default computer instance
 */
export const computer = getComputer();

export default computer;
