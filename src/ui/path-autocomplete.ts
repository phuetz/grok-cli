/**
 * File Path Autocomplete
 *
 * Provides intelligent file path autocomplete:
 * - Directory traversal
 * - Fuzzy matching
 * - Recent files priority
 * - Gitignore awareness
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';

export interface PathSuggestion {
  path: string;
  displayName: string;
  type: 'file' | 'directory';
  score: number;
  isHidden: boolean;
  extension?: string;
  size?: number;
  modifiedAt?: Date;
}

export interface AutocompleteOptions {
  /** Maximum number of suggestions */
  maxSuggestions?: number;
  /** Include hidden files (starting with .) */
  showHidden?: boolean;
  /** Only show directories */
  directoriesOnly?: boolean;
  /** Only show files */
  filesOnly?: boolean;
  /** Filter by extensions (e.g., ['.ts', '.js']) */
  extensions?: string[];
  /** Prioritize recently modified files */
  prioritizeRecent?: boolean;
  /** Fuzzy matching */
  fuzzyMatch?: boolean;
  /** Respect gitignore */
  respectGitignore?: boolean;
  /** Working directory */
  cwd?: string;
}

const DEFAULT_OPTIONS: Required<AutocompleteOptions> = {
  maxSuggestions: 20,
  showHidden: false,
  directoriesOnly: false,
  filesOnly: false,
  extensions: [],
  prioritizeRecent: true,
  fuzzyMatch: true,
  respectGitignore: true,
  cwd: process.cwd(),
};

/**
 * Common gitignore patterns
 */
const GITIGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  '*.pyc',
  '.DS_Store',
];

/**
 * Recent files cache
 */
const recentFilesCache: Map<string, Date> = new Map();

/**
 * Get path autocomplete suggestions
 */
export async function getPathSuggestions(
  input: string,
  options: AutocompleteOptions = {}
): Promise<PathSuggestion[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Parse input path
  const { directory, prefix } = parseInputPath(input, opts.cwd);

  // Check if directory exists
  if (!await fs.pathExists(directory)) {
    return [];
  }

  // Read directory contents
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch {
    return [];
  }

  // Load gitignore patterns if needed
  let ignorePatterns: string[] = [];
  if (opts.respectGitignore) {
    ignorePatterns = await loadGitignorePatterns(directory);
  }

  // Build suggestions
  const suggestions: PathSuggestion[] = [];

  for (const entry of entries) {
    // Skip hidden files if not requested
    const isHidden = entry.startsWith('.');
    if (isHidden && !opts.showHidden) {
      continue;
    }

    // Check gitignore
    if (shouldIgnore(entry, ignorePatterns)) {
      continue;
    }

    // Check if matches prefix
    const matchScore = calculateMatchScore(entry, prefix, opts.fuzzyMatch);
    if (matchScore === 0 && prefix.length > 0) {
      continue;
    }

    // Get file stats
    const fullPath = path.join(directory, entry);
    let stats: fs.Stats;
    try {
      stats = await fs.stat(fullPath);
    } catch {
      continue;
    }

    const isDirectory = stats.isDirectory();

    // Apply type filters
    if (opts.directoriesOnly && !isDirectory) continue;
    if (opts.filesOnly && isDirectory) continue;

    // Apply extension filter
    const ext = path.extname(entry).toLowerCase();
    if (opts.extensions.length > 0 && !isDirectory) {
      if (!opts.extensions.includes(ext)) continue;
    }

    // Calculate final score
    let score = matchScore;

    // Boost directories
    if (isDirectory) score += 10;

    // Boost recently accessed
    if (opts.prioritizeRecent) {
      const recentScore = getRecentScore(fullPath);
      score += recentScore;
    }

    // Penalize hidden
    if (isHidden) score -= 5;

    suggestions.push({
      path: fullPath,
      displayName: isDirectory ? `${entry}/` : entry,
      type: isDirectory ? 'directory' : 'file',
      score,
      isHidden,
      extension: ext || undefined,
      size: stats.size,
      modifiedAt: stats.mtime,
    });
  }

  // Sort by score (descending)
  suggestions.sort((a, b) => b.score - a.score);

  // Limit results
  return suggestions.slice(0, opts.maxSuggestions);
}

/**
 * Parse input path into directory and prefix
 */
function parseInputPath(input: string, cwd: string): { directory: string; prefix: string } {
  if (!input) {
    return { directory: cwd, prefix: '' };
  }

  // Handle home directory
  let normalizedInput = input;
  if (input.startsWith('~')) {
    const home = process.env.HOME || homedir();
    normalizedInput = path.join(home, input.slice(1));
  }

  // Resolve relative paths
  if (!path.isAbsolute(normalizedInput)) {
    normalizedInput = path.join(cwd, normalizedInput);
  }

  // If input ends with separator, it's a directory
  if (input.endsWith(path.sep) || input.endsWith('/')) {
    return { directory: normalizedInput, prefix: '' };
  }

  // Otherwise, split into directory and prefix
  const directory = path.dirname(normalizedInput);
  const prefix = path.basename(normalizedInput);

  return { directory, prefix };
}

/**
 * Calculate match score for entry against prefix
 */
function calculateMatchScore(entry: string, prefix: string, fuzzy: boolean): number {
  if (!prefix) return 50; // Base score if no prefix

  const entryLower = entry.toLowerCase();
  const prefixLower = prefix.toLowerCase();

  // Exact match
  if (entryLower === prefixLower) {
    return 100;
  }

  // Starts with prefix
  if (entryLower.startsWith(prefixLower)) {
    return 90 - (entry.length - prefix.length);
  }

  // Contains prefix
  if (entryLower.includes(prefixLower)) {
    const index = entryLower.indexOf(prefixLower);
    return 70 - index;
  }

  // Fuzzy match
  if (fuzzy) {
    const fuzzyScore = fuzzyMatchScore(entryLower, prefixLower);
    if (fuzzyScore > 0) {
      return fuzzyScore;
    }
  }

  return 0;
}

/**
 * Calculate fuzzy match score
 */
function fuzzyMatchScore(text: string, pattern: string): number {
  let patternIdx = 0;
  let score = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -1;

  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      score += 10;

      // Bonus for consecutive matches
      if (lastMatchIdx === i - 1) {
        consecutiveBonus += 5;
      } else {
        consecutiveBonus = 0;
      }
      score += consecutiveBonus;

      // Bonus for word boundaries
      if (i === 0 || text[i - 1] === '-' || text[i - 1] === '_' || text[i - 1] === '.') {
        score += 10;
      }

      lastMatchIdx = i;
      patternIdx++;
    }
  }

  // All pattern chars must match
  if (patternIdx < pattern.length) {
    return 0;
  }

  return Math.min(60, score);
}

/**
 * Load gitignore patterns
 */
async function loadGitignorePatterns(directory: string): Promise<string[]> {
  const patterns = [...GITIGNORE_PATTERNS];

  // Find git root
  let current = directory;
  while (current !== path.dirname(current)) {
    const gitignorePath = path.join(current, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      try {
        const content = await fs.readFile(gitignorePath, 'utf-8');
        const lines = content.split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#'));
        patterns.push(...lines);
      } catch {
        // Ignore read errors
      }
      break;
    }
    current = path.dirname(current);
  }

  return patterns;
}

/**
 * Check if entry should be ignored
 */
function shouldIgnore(entry: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Exact match
    if (pattern === entry) return true;

    // Glob-style matching (simple)
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      if (entry.endsWith(suffix)) return true;
    }

    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (entry.startsWith(prefix)) return true;
    }
  }

  return false;
}

/**
 * Get score boost for recently accessed files
 */
function getRecentScore(filePath: string): number {
  const lastAccess = recentFilesCache.get(filePath);
  if (!lastAccess) return 0;

  const age = Date.now() - lastAccess.getTime();
  const hours = age / (1000 * 60 * 60);

  // Recent files get a boost
  if (hours < 1) return 20;
  if (hours < 24) return 15;
  if (hours < 72) return 10;
  if (hours < 168) return 5; // 1 week

  return 0;
}

/**
 * Record file access for recent files tracking
 */
export function recordFileAccess(filePath: string): void {
  recentFilesCache.set(filePath, new Date());

  // Limit cache size
  if (recentFilesCache.size > 1000) {
    const oldest = [...recentFilesCache.entries()]
      .sort(([, a], [, b]) => a.getTime() - b.getTime())
      .slice(0, 500);

    recentFilesCache.clear();
    for (const [path, date] of oldest) {
      recentFilesCache.set(path, date);
    }
  }
}

/**
 * Format suggestions for display
 */
export function formatSuggestions(
  suggestions: PathSuggestion[],
  highlightIndex: number = -1
): string {
  if (suggestions.length === 0) {
    return 'No matches found';
  }

  const lines: string[] = [];

  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    const icon = s.type === 'directory' ? '[D]' : '[F]';
    const prefix = i === highlightIndex ? '> ' : '  ';
    const hidden = s.isHidden ? ' (hidden)' : '';

    let info = '';
    if (s.type === 'file' && s.size !== undefined) {
      info = ` (${formatSize(s.size)})`;
    }

    lines.push(`${prefix}${icon} ${s.displayName}${hidden}${info}`);
  }

  return lines.join('\n');
}

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

/**
 * Complete path (get the completed path string)
 */
export function completePath(input: string, suggestion: PathSuggestion): string {
  if (input.startsWith('~')) {
    const home = process.env.HOME || homedir();
    const relativePath = suggestion.path.replace(home, '~');
    return relativePath;
  }

  return suggestion.path;
}

/**
 * Get common prefix from suggestions (for tab completion)
 */
export function getCommonPrefix(suggestions: PathSuggestion[]): string {
  if (suggestions.length === 0) return '';
  if (suggestions.length === 1) return suggestions[0].path;

  const names = suggestions.map(s => s.displayName.replace('/', ''));
  let prefix = names[0];

  for (let i = 1; i < names.length; i++) {
    while (!names[i].toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }

  return prefix;
}

/**
 * PathAutocomplete class for interactive use
 */
export class PathAutocomplete {
  private options: Required<AutocompleteOptions>;
  private currentInput: string = '';
  private suggestions: PathSuggestion[] = [];
  private selectedIndex: number = -1;

  constructor(options: AutocompleteOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Update input and refresh suggestions
   */
  async update(input: string): Promise<PathSuggestion[]> {
    this.currentInput = input;
    this.suggestions = await getPathSuggestions(input, this.options);
    this.selectedIndex = this.suggestions.length > 0 ? 0 : -1;
    return this.suggestions;
  }

  /**
   * Move selection up
   */
  selectPrevious(): void {
    if (this.suggestions.length === 0) return;
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
  }

  /**
   * Move selection down
   */
  selectNext(): void {
    if (this.suggestions.length === 0) return;
    this.selectedIndex = Math.min(this.suggestions.length - 1, this.selectedIndex + 1);
  }

  /**
   * Get current selection
   */
  getSelection(): PathSuggestion | undefined {
    if (this.selectedIndex < 0) return undefined;
    return this.suggestions[this.selectedIndex];
  }

  /**
   * Accept current selection
   */
  accept(): string | undefined {
    const selection = this.getSelection();
    if (!selection) return undefined;

    recordFileAccess(selection.path);
    return completePath(this.currentInput, selection);
  }

  /**
   * Get current suggestions
   */
  getSuggestions(): PathSuggestion[] {
    return this.suggestions;
  }

  /**
   * Get selected index
   */
  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  /**
   * Format current state for display
   */
  format(): string {
    return formatSuggestions(this.suggestions, this.selectedIndex);
  }
}

export default PathAutocomplete;
