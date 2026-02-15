/**
 * VS Code Extension Scaffold
 *
 * Bridge between Code Buddy and VS Code, providing inline diffs,
 * @-mentions, plan review, session history, and remote sessions.
 */

import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import * as path from 'path';

export interface VSCodeExtensionConfig {
  enableInlineDiffs: boolean;
  enableAtMentions: boolean;
  enablePlanReview: boolean;
  enableSessionHistory: boolean;
  enableRemoteSessions: boolean;
  autoActivatePythonVenv: boolean;
  multilineInput: boolean;
}

export interface InlineDiff {
  file: string;
  originalContent: string;
  modifiedContent: string;
  hunks: Array<{
    startLine: number;
    endLine: number;
    type: 'add' | 'remove' | 'modify';
    content: string;
  }>;
}

export interface EditorContext {
  file: string;
  selection?: { startLine: number; endLine: number; text: string };
  diagnostics: Array<{ line: number; message: string; severity: string }>;
  language: string;
}

interface SessionEntry {
  id: string;
  timestamp: number;
  message: string;
  branch?: string;
}

interface PlanReview {
  id: string;
  steps: Array<{ description: string; files: string[]; approved: boolean }>;
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescriptreact',
  '.js': 'javascript', '.jsx': 'javascriptreact',
  '.py': 'python', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.c': 'c', '.cpp': 'cpp',
  '.cs': 'csharp', '.rb': 'ruby', '.php': 'php',
  '.html': 'html', '.css': 'css', '.json': 'json',
  '.md': 'markdown', '.yaml': 'yaml', '.yml': 'yaml',
};

const DEFAULT_CONFIG: VSCodeExtensionConfig = {
  enableInlineDiffs: true,
  enableAtMentions: true,
  enablePlanReview: true,
  enableSessionHistory: true,
  enableRemoteSessions: false,
  autoActivatePythonVenv: true,
  multilineInput: true,
};

export class VSCodeBridge {
  private config: VSCodeExtensionConfig;
  private activeDiffs: Map<string, InlineDiff>;
  private sessionHistory: SessionEntry[];
  private plans: Map<string, PlanReview>;
  private remoteSessions: Array<{ id: string; task: string; status: string }>;
  private tokensUsed: number;

  constructor(config?: Partial<VSCodeExtensionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeDiffs = new Map();
    this.sessionHistory = [];
    this.plans = new Map();
    this.remoteSessions = [];
    this.tokensUsed = 0;
    logger.debug('VSCodeBridge initialized');
  }

  createInlineDiff(file: string, original: string, modified: string): InlineDiff {
    if (!this.config.enableInlineDiffs) {
      throw new Error('Inline diffs are disabled');
    }

    const hunks = this.computeHunks(original, modified);
    const diff: InlineDiff = {
      file,
      originalContent: original,
      modifiedContent: modified,
      hunks,
    };

    this.activeDiffs.set(file, diff);
    logger.info('Inline diff created', { file, hunks: hunks.length });
    return { ...diff };
  }

  getActiveDiffs(): InlineDiff[] {
    return Array.from(this.activeDiffs.values()).map(d => ({ ...d }));
  }

  acceptDiff(file: string): boolean {
    if (!this.activeDiffs.has(file)) {
      return false;
    }
    this.activeDiffs.delete(file);
    logger.info('Diff accepted', { file });
    return true;
  }

  rejectDiff(file: string): boolean {
    if (!this.activeDiffs.has(file)) {
      return false;
    }
    this.activeDiffs.delete(file);
    logger.info('Diff rejected', { file });
    return true;
  }

  acceptAllDiffs(): number {
    const count = this.activeDiffs.size;
    this.activeDiffs.clear();
    logger.info('All diffs accepted', { count });
    return count;
  }

  getEditorContext(file: string, selection?: { start: number; end: number }): EditorContext {
    const ext = path.extname(file).toLowerCase();
    const language = EXTENSION_TO_LANGUAGE[ext] || 'plaintext';

    const context: EditorContext = {
      file,
      diagnostics: [],
      language,
    };

    if (selection) {
      context.selection = {
        startLine: selection.start,
        endLine: selection.end,
        text: `[selected lines ${selection.start}-${selection.end}]`,
      };
    }

    return context;
  }

  buildAtMention(context: EditorContext): string {
    if (!this.config.enableAtMentions) {
      return '';
    }

    let mention = `@${path.basename(context.file)}`;
    if (context.selection) {
      mention += `:${context.selection.startLine}-${context.selection.endLine}`;
    }
    if (context.diagnostics.length > 0) {
      mention += ` (${context.diagnostics.length} diagnostic(s))`;
    }
    return mention;
  }

  addSession(id: string, message: string, branch?: string): void {
    if (!this.config.enableSessionHistory) {
      return;
    }
    this.sessionHistory.push({
      id,
      timestamp: Date.now(),
      message,
      branch,
    });
    logger.debug('Session added to history', { id });
  }

  getSessionHistory(): SessionEntry[] {
    return [...this.sessionHistory];
  }

  createPlanReview(steps: Array<{ description: string; files: string[] }>): PlanReview {
    if (!this.config.enablePlanReview) {
      throw new Error('Plan review is disabled');
    }

    const plan: PlanReview = {
      id: randomUUID(),
      steps: steps.map(s => ({ ...s, approved: false })),
    };

    this.plans.set(plan.id, plan);
    logger.info('Plan review created', { id: plan.id, steps: steps.length });
    return { ...plan, steps: plan.steps.map(s => ({ ...s })) };
  }

  approvePlanStep(planId: string, stepIndex: number): boolean {
    const plan = this.plans.get(planId);
    if (!plan) {
      return false;
    }
    if (stepIndex < 0 || stepIndex >= plan.steps.length) {
      return false;
    }
    plan.steps[stepIndex].approved = true;
    logger.debug('Plan step approved', { planId, stepIndex });
    return true;
  }

  listRemoteSessions(): Array<{ id: string; task: string; status: string }> {
    if (!this.config.enableRemoteSessions) {
      return [];
    }
    return [...this.remoteSessions];
  }

  resumeRemoteSession(id: string): boolean {
    if (!this.config.enableRemoteSessions) {
      return false;
    }
    const session = this.remoteSessions.find(s => s.id === id);
    if (!session) {
      return false;
    }
    session.status = 'active';
    logger.info('Remote session resumed', { id });
    return true;
  }

  generatePackageJson(): Record<string, unknown> {
    return {
      name: 'codebuddy-vscode',
      displayName: 'Code Buddy',
      description: 'AI coding agent for VS Code',
      version: '0.1.0',
      publisher: 'codebuddy',
      engines: { vscode: '^1.85.0' },
      categories: ['Programming Languages', 'Machine Learning', 'Other'],
      activationEvents: ['onStartupFinished'],
      main: './dist/extension.js',
      contributes: {
        commands: [
          { command: 'codebuddy.start', title: 'Code Buddy: Start Session' },
          { command: 'codebuddy.acceptDiff', title: 'Code Buddy: Accept Diff' },
          { command: 'codebuddy.rejectDiff', title: 'Code Buddy: Reject Diff' },
          { command: 'codebuddy.planReview', title: 'Code Buddy: Review Plan' },
        ],
        configuration: {
          title: 'Code Buddy',
          properties: {
            'codebuddy.enableInlineDiffs': { type: 'boolean', default: true },
            'codebuddy.enableAtMentions': { type: 'boolean', default: true },
            'codebuddy.enablePlanReview': { type: 'boolean', default: true },
            'codebuddy.multilineInput': { type: 'boolean', default: true },
          },
        },
      },
    };
  }

  getUsageInfo(): { tokensUsed: number; costEstimate: number; plan: string } {
    return {
      tokensUsed: this.tokensUsed,
      costEstimate: this.tokensUsed * 0.000003,
      plan: 'free',
    };
  }

  private computeHunks(original: string, modified: string): InlineDiff['hunks'] {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const hunks: InlineDiff['hunks'] = [];

    const maxLen = Math.max(origLines.length, modLines.length);
    for (let i = 0; i < maxLen; i++) {
      const origLine = origLines[i];
      const modLine = modLines[i];

      if (origLine === undefined && modLine !== undefined) {
        hunks.push({ startLine: i + 1, endLine: i + 1, type: 'add', content: modLine });
      } else if (origLine !== undefined && modLine === undefined) {
        hunks.push({ startLine: i + 1, endLine: i + 1, type: 'remove', content: origLine });
      } else if (origLine !== modLine) {
        hunks.push({ startLine: i + 1, endLine: i + 1, type: 'modify', content: modLine! });
      }
    }

    return hunks;
  }
}
