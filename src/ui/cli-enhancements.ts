/**
 * CLI Enhancements
 *
 * Features:
 * 8. Debug Command - session/model/hooks/plugins/mcp/performance info
 * 9. Company Announcements - priority-based announcement system
 * 10. Attribution Customization - commit/PR footer branding
 * 11. PR Status Indicator - prompt indicator for PR status
 * 12. Max Turns Flag - configurable turn limits
 * 13. No Session Persistence Flag - ephemeral session mode
 * 14. History Bash Autocomplete - command history and prefix completion
 * 15. Strict MCP Config Flag - restrict MCP servers
 * 16. Prompt Stash (Ctrl+S) - save/restore prompt drafts
 */

import { logger } from '../utils/logger.js';

// ============================================================================
// 8. Debug Command
// ============================================================================

export interface DebugInfo {
  session: { id: string; messageCount: number; tokenUsage: number };
  model: { name: string; provider: string; contextWindow: number };
  hooks: { registered: number; fired: number; errors: number };
  plugins: { loaded: number; active: number };
  mcp: { servers: number; connected: number };
  performance: { avgResponseMs: number; totalCost: number };
}

export class DebugCommand {
  constructor() {}

  getDebugInfo(): DebugInfo {
    return {
      session: { id: 'none', messageCount: 0, tokenUsage: 0 },
      model: { name: 'unknown', provider: 'unknown', contextWindow: 0 },
      hooks: { registered: 0, fired: 0, errors: 0 },
      plugins: { loaded: 0, active: 0 },
      mcp: { servers: 0, connected: 0 },
      performance: { avgResponseMs: 0, totalCost: 0 },
    };
  }

  formatDebugOutput(info: DebugInfo): string {
    const lines: string[] = [
      '=== Debug Info ===',
      '',
      '[Session]',
      `  ID: ${info.session.id}`,
      `  Messages: ${info.session.messageCount}`,
      `  Token Usage: ${info.session.tokenUsage}`,
      '',
      '[Model]',
      `  Name: ${info.model.name}`,
      `  Provider: ${info.model.provider}`,
      `  Context Window: ${info.model.contextWindow}`,
      '',
      '[Hooks]',
      `  Registered: ${info.hooks.registered}`,
      `  Fired: ${info.hooks.fired}`,
      `  Errors: ${info.hooks.errors}`,
      '',
      '[Plugins]',
      `  Loaded: ${info.plugins.loaded}`,
      `  Active: ${info.plugins.active}`,
      '',
      '[MCP]',
      `  Servers: ${info.mcp.servers}`,
      `  Connected: ${info.mcp.connected}`,
      '',
      '[Performance]',
      `  Avg Response: ${info.performance.avgResponseMs}ms`,
      `  Total Cost: $${info.performance.totalCost.toFixed(4)}`,
    ];
    return lines.join('\n');
  }

  parseFilter(filter: string): { include: string[]; exclude: string[] } {
    const parts = filter.split(',').map(s => s.trim()).filter(Boolean);
    const include: string[] = [];
    const exclude: string[] = [];

    for (const part of parts) {
      if (part.startsWith('!')) {
        exclude.push(part.slice(1));
      } else {
        include.push(part);
      }
    }

    return { include, exclude };
  }

  filterCategories(info: DebugInfo, filter: string): Partial<DebugInfo> {
    const { include, exclude } = this.parseFilter(filter);
    const allKeys = Object.keys(info) as (keyof DebugInfo)[];
    const result: Partial<DebugInfo> = {};

    for (const key of allKeys) {
      if (exclude.includes(key)) continue;
      if (include.length > 0 && !include.includes(key)) continue;
      (result as any)[key] = info[key];
    }

    return result;
  }
}

// ============================================================================
// 9. Company Announcements
// ============================================================================

export interface Announcement {
  id: string;
  message: string;
  priority: 'info' | 'warning' | 'critical';
  expiresAt?: number;
  dismissible: boolean;
}

export class AnnouncementManager {
  private announcements: Announcement[] = [];
  private dismissed: Set<string> = new Set();

  constructor() {}

  addAnnouncement(
    message: string,
    priority: Announcement['priority'] = 'info',
    options?: Partial<Announcement>
  ): Announcement {
    const announcement: Announcement = {
      id: options?.id ?? `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      priority,
      expiresAt: options?.expiresAt,
      dismissible: options?.dismissible ?? true,
    };
    this.announcements.push(announcement);
    logger.info(`Announcement added: ${announcement.id}`);
    return announcement;
  }

  getActiveAnnouncements(): Announcement[] {
    const now = Date.now();
    return this.announcements.filter(a => {
      if (this.dismissed.has(a.id)) return false;
      if (a.expiresAt && a.expiresAt < now) return false;
      return true;
    });
  }

  dismiss(id: string): boolean {
    const ann = this.announcements.find(a => a.id === id);
    if (!ann) return false;
    if (!ann.dismissible) return false;
    this.dismissed.add(id);
    return true;
  }

  clearExpired(): number {
    const now = Date.now();
    const before = this.announcements.length;
    this.announcements = this.announcements.filter(a => !a.expiresAt || a.expiresAt >= now);
    return before - this.announcements.length;
  }

  formatAnnouncements(): string {
    const active = this.getActiveAnnouncements();
    if (active.length === 0) return '';

    const priorityOrder = { critical: 0, warning: 1, info: 2 };
    const sorted = [...active].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return sorted.map(a => {
      const prefix = a.priority === 'critical' ? '[!]' : a.priority === 'warning' ? '[*]' : '[i]';
      return `${prefix} ${a.message}`;
    }).join('\n');
  }

  getCount(): number {
    return this.getActiveAnnouncements().length;
  }
}

// ============================================================================
// 10. Attribution Customization
// ============================================================================

export interface AttributionConfig {
  commitFooter: string;
  prFooter: string;
  enabled: boolean;
  orgBranding?: string;
}

const DEFAULT_ATTRIBUTION: AttributionConfig = {
  commitFooter: 'Co-Authored-By: Code Buddy <noreply@codebuddy.dev>',
  prFooter: 'Generated with Code Buddy',
  enabled: true,
};

export class AttributionManager {
  private config: AttributionConfig;

  constructor(config?: Partial<AttributionConfig>) {
    this.config = { ...DEFAULT_ATTRIBUTION, ...config };
  }

  getCommitFooter(): string {
    if (!this.config.enabled) return '';
    return this.config.commitFooter;
  }

  getPRFooter(): string {
    if (!this.config.enabled) return '';
    return this.config.prFooter;
  }

  setCommitFooter(footer: string): void {
    this.config.commitFooter = footer;
  }

  setPRFooter(footer: string): void {
    this.config.prFooter = footer;
  }

  formatCommitMessage(message: string): string {
    if (!this.config.enabled) return message;
    const footer = this.getCommitFooter();
    if (!footer) return message;
    return `${message}\n\n${footer}`;
  }

  formatPRBody(body: string): string {
    if (!this.config.enabled) return body;
    const footer = this.getPRFooter();
    if (!footer) return body;
    return `${body}\n\n${footer}`;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  getConfig(): AttributionConfig {
    return { ...this.config };
  }
}

// ============================================================================
// 11. PR Status Indicator
// ============================================================================

export type PRStatus = 'draft' | 'pending' | 'approved' | 'changes-requested' | 'merged' | 'closed';

export interface PRStatusInfo {
  number: number;
  status: PRStatus;
  title: string;
  reviewers: string[];
  checks: { passed: number; failed: number; pending: number };
}

const STATUS_ICONS: Record<PRStatus, string> = {
  draft: 'o',
  pending: '?',
  approved: '+',
  'changes-requested': '!',
  merged: 'M',
  closed: 'X',
};

const STATUS_COLORS: Record<PRStatus, string> = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  'changes-requested': 'red',
  merged: 'purple',
  closed: 'red',
};

export class PRStatusIndicator {
  private currentPR: PRStatusInfo | null = null;

  constructor() {}

  setPR(info: PRStatusInfo): void {
    this.currentPR = info;
  }

  getPR(): PRStatusInfo | null {
    return this.currentPR;
  }

  getStatusIcon(status: PRStatus): string {
    return STATUS_ICONS[status] ?? '?';
  }

  getStatusColor(status: PRStatus): string {
    return STATUS_COLORS[status] ?? 'white';
  }

  formatPromptIndicator(): string {
    if (!this.currentPR) return '';
    const icon = this.getStatusIcon(this.currentPR.status);
    const { passed, failed, pending } = this.currentPR.checks;
    return `[${icon} PR#${this.currentPR.number} ${passed}/${passed + failed + pending}]`;
  }

  clearPR(): void {
    this.currentPR = null;
  }

  hasPR(): boolean {
    return this.currentPR !== null;
  }
}

// ============================================================================
// 12. Max Turns Flag
// ============================================================================

export class MaxTurnsManager {
  private maxTurns: number | null;
  private currentTurn: number = 0;

  constructor(maxTurns?: number) {
    this.maxTurns = maxTurns ?? null;
  }

  increment(): void {
    this.currentTurn++;
  }

  hasReachedLimit(): boolean {
    if (this.maxTurns === null) return false;
    return this.currentTurn >= this.maxTurns;
  }

  getRemainingTurns(): number | null {
    if (this.maxTurns === null) return null;
    return Math.max(0, this.maxTurns - this.currentTurn);
  }

  getCurrentTurn(): number {
    return this.currentTurn;
  }

  getMaxTurns(): number | null {
    return this.maxTurns;
  }

  setMaxTurns(max: number | null): void {
    this.maxTurns = max;
  }

  reset(): void {
    this.currentTurn = 0;
  }

  formatStatus(): string {
    if (this.maxTurns === null) {
      return `Turn ${this.currentTurn} (unlimited)`;
    }
    return `Turn ${this.currentTurn}/${this.maxTurns}`;
  }
}

// ============================================================================
// 13. No Session Persistence Flag
// ============================================================================

export class SessionPersistenceConfig {
  private persistenceEnabled: boolean;

  constructor(enabled?: boolean) {
    this.persistenceEnabled = enabled ?? true;
  }

  isEnabled(): boolean {
    return this.persistenceEnabled;
  }

  setEnabled(enabled: boolean): void {
    this.persistenceEnabled = enabled;
  }

  shouldSave(): boolean {
    return this.persistenceEnabled;
  }

  shouldLoad(): boolean {
    return this.persistenceEnabled;
  }

  getMode(): 'persistent' | 'ephemeral' {
    return this.persistenceEnabled ? 'persistent' : 'ephemeral';
  }
}

// ============================================================================
// 14. History Bash Autocomplete
// ============================================================================

export class BashHistoryAutocomplete {
  private history: string[] = [];
  private maxHistory: number;

  constructor(maxHistory?: number) {
    this.maxHistory = maxHistory ?? 1000;
  }

  addCommand(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;

    // Remove duplicate if it exists
    const existingIndex = this.history.indexOf(trimmed);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }

    this.history.push(trimmed);

    // Enforce max history
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  getCompletions(prefix: string): string[] {
    if (!prefix) return [];
    return this.history.filter(cmd => cmd.startsWith(prefix));
  }

  loadFromFile(historyFilePath: string): number {
    // Simulated load - returns 0 for non-existent files
    logger.info(`Loading history from: ${historyFilePath}`);
    return 0;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  getHistorySize(): number {
    return this.history.length;
  }
}

// ============================================================================
// 15. Strict MCP Config Flag
// ============================================================================

export class StrictMCPConfig {
  private strict: boolean;
  private configPath: string | null;
  private allowedServers: Set<string> = new Set();

  constructor(strict?: boolean, configPath?: string) {
    this.strict = strict ?? false;
    this.configPath = configPath ?? null;
  }

  isStrict(): boolean {
    return this.strict;
  }

  setStrict(strict: boolean): void {
    this.strict = strict;
    logger.info(`Strict MCP mode: ${strict ? 'enabled' : 'disabled'}`);
  }

  setConfigPath(path: string): void {
    this.configPath = path;
  }

  addAllowedServer(serverName: string): void {
    this.allowedServers.add(serverName);
  }

  isServerAllowed(serverName: string): boolean {
    if (!this.strict) return true;
    return this.allowedServers.has(serverName);
  }

  getAllowedServers(): string[] {
    return [...this.allowedServers];
  }

  getConfigPath(): string | null {
    return this.configPath;
  }
}

// ============================================================================
// 16. Prompt Stash (Ctrl+S)
// ============================================================================

export interface StashedPrompt {
  id: string;
  content: string;
  cursorPosition: number;
  timestamp: number;
}

export class PromptStash {
  private stash: StashedPrompt[] = [];
  private maxStash: number;

  constructor(maxStash?: number) {
    this.maxStash = maxStash ?? 20;
  }

  push(content: string, cursorPosition?: number): StashedPrompt {
    const prompt: StashedPrompt = {
      id: `stash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      cursorPosition: cursorPosition ?? content.length,
      timestamp: Date.now(),
    };

    this.stash.push(prompt);

    // Enforce max stash size - remove oldest
    if (this.stash.length > this.maxStash) {
      this.stash = this.stash.slice(-this.maxStash);
    }

    logger.debug(`Prompt stashed: ${prompt.id}`);
    return prompt;
  }

  pop(): StashedPrompt | null {
    return this.stash.pop() ?? null;
  }

  peek(): StashedPrompt | null {
    return this.stash.length > 0 ? this.stash[this.stash.length - 1] : null;
  }

  getAll(): StashedPrompt[] {
    return [...this.stash];
  }

  clear(): void {
    this.stash = [];
  }

  getSize(): number {
    return this.stash.length;
  }

  isEmpty(): boolean {
    return this.stash.length === 0;
  }

  getMaxStash(): number {
    return this.maxStash;
  }
}
