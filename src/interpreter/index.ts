/**
 * Interpreter Module
 *
 * Open Interpreter-inspired features for Code Buddy:
 * - Profile system (fast, vision, safe, local, coding)
 * - Safe mode (off, ask, auto)
 * - Auto-run mode
 * - Budget/token tracking
 * - Computer capabilities (browser, os, files, skills)
 *
 * Usage:
 * ```typescript
 * import { interpreter, computer } from './interpreter';
 *
 * // Load a profile
 * interpreter.loadProfile('fast');      // Quick responses
 * interpreter.loadProfile('vision');    // Screen control
 * interpreter.loadProfile('safe');      // Maximum security
 * interpreter.loadProfile('local');     // LM Studio local
 * interpreter.loadProfile('coding');    // Code generation
 *
 * // Configure
 * interpreter.autoRun = true;           // Auto-execute
 * interpreter.safeMode = 'ask';         // off | ask | auto
 * interpreter.maxBudget = 1.00;         // $1.00 limit
 * interpreter.customInstructions = '...';
 *
 * // Execute
 * const result = await interpreter.chat('Open Chrome');
 * await interpreter.continue();         // Loop mode
 * interpreter.reset();                  // New conversation
 *
 * // Stats
 * console.log(interpreter.tokenUsage);  // {input, output, total}
 * console.log(interpreter.totalCost);   // $0.0012
 *
 * // Computer capabilities
 * const results = await computer.browser.search('TypeScript');
 * const selected = await computer.os.getSelectedText();
 * const content = await computer.files.read('~/config.json');
 * await computer.skills.run('web-search', { query: 'AI news' });
 * ```
 */

// Types
export * from './types.js';

// Profiles
export {
  DEFAULT_PROFILE,
  FAST_PROFILE,
  VISION_PROFILE,
  SAFE_PROFILE,
  LOCAL_PROFILE,
  CODING_PROFILE,
  RESEARCH_PROFILE,
  BUILTIN_PROFILES,
  BUILTIN_PROFILE_MAP,
  getBuiltinProfile,
  listBuiltinProfiles,
  mergeProfile,
  validateProfile,
} from './profiles.js';

// Interpreter Service
export {
  InterpreterService,
  getInterpreter,
  resetInterpreter,
  interpreter,
} from './interpreter-service.js';

// Computer Module
export {
  // Browser
  ComputerBrowser,
  getComputerBrowser,
  resetComputerBrowser,
  DEFAULT_BROWSER_CONFIG,
  // OS
  ComputerOS,
  getComputerOS,
  resetComputerOS,
  // Files
  ComputerFiles,
  getComputerFiles,
  resetComputerFiles,
  // Skills
  ComputerSkills,
  getComputerSkills,
  resetComputerSkills,
  DEFAULT_SKILL_LIBRARY_CONFIG,
  // Unified
  getComputer,
  computer,
} from './computer/index.js';

export type {
  // Browser types
  SearchResult,
  SearchOptions,
  PageContent,
  FetchOptions,
  BrowserConfig,
  // OS types
  ClipboardContent,
  SystemInfo,
  ProcessInfo,
  DisplayInfo,
  // Files types
  FileInfo,
  FileSearchOptions,
  CopyOptions,
  ReadOptions,
  WriteOptions,
  WatchCallback,
  // Skills types
  Skill,
  SkillParameter,
  SkillStep,
  SkillExample,
  SkillRunResult,
  StepResult,
  SkillSearchResult,
  SkillLibraryConfig,
  // Computer interface
  Computer,
} from './computer/index.js';

// Re-import for default export
import { getInterpreter as _getInterpreter } from './interpreter-service.js';
import { getComputer as _getComputer } from './computer/index.js';

// Default exports
export default {
  interpreter: _getInterpreter(),
  computer: _getComputer(),
};
