/**
 * JetBrains Plugin Scaffold
 *
 * Bridge between Code Buddy and JetBrains IDEs (IntelliJ IDEA, PyCharm,
 * WebStorm, GoLand, etc). Provides diff viewing, selection sharing,
 * diagnostic sharing, and quick launch integration.
 */

import { logger } from '../utils/logger.js';

export interface JetBrainsConfig {
  enableDiffViewer: boolean;
  enableSelectionSharing: boolean;
  enableDiagnosticSharing: boolean;
  quickLaunchShortcut: string;
  supportedIDEs: string[];
}

export interface JetBrainsDiff {
  file: string;
  before: string;
  after: string;
  changeType: 'created' | 'modified' | 'deleted';
}

interface SharedSelection {
  file: string;
  text: string;
  timestamp: number;
}

interface SharedDiagnostic {
  file: string;
  line: number;
  message: string;
  type: string;
}

const DEFAULT_CONFIG: JetBrainsConfig = {
  enableDiffViewer: true,
  enableSelectionSharing: true,
  enableDiagnosticSharing: true,
  quickLaunchShortcut: 'Ctrl+Shift+B',
  supportedIDEs: [
    'IntelliJ IDEA',
    'PyCharm',
    'WebStorm',
    'GoLand',
    'PhpStorm',
    'Rider',
    'CLion',
    'RubyMine',
    'DataGrip',
    'Android Studio',
  ],
};

export class JetBrainsBridge {
  private config: JetBrainsConfig;
  private diffs: Map<string, JetBrainsDiff>;
  private sharedSelections: SharedSelection[];
  private diagnostics: SharedDiagnostic[];

  constructor(config?: Partial<JetBrainsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.diffs = new Map();
    this.sharedSelections = [];
    this.diagnostics = [];
    logger.debug('JetBrainsBridge initialized', { shortcut: this.config.quickLaunchShortcut });
  }

  createDiff(file: string, before: string, after: string): JetBrainsDiff {
    if (!this.config.enableDiffViewer) {
      throw new Error('Diff viewer is disabled');
    }

    let changeType: JetBrainsDiff['changeType'];
    if (before.length === 0 && after.length > 0) {
      changeType = 'created';
    } else if (before.length > 0 && after.length === 0) {
      changeType = 'deleted';
    } else {
      changeType = 'modified';
    }

    const diff: JetBrainsDiff = { file, before, after, changeType };
    this.diffs.set(file, diff);
    logger.info('Diff created', { file, changeType });
    return { ...diff };
  }

  getDiffs(): JetBrainsDiff[] {
    return Array.from(this.diffs.values()).map(d => ({ ...d }));
  }

  acceptDiff(file: string): boolean {
    if (!this.diffs.has(file)) {
      return false;
    }
    this.diffs.delete(file);
    logger.info('Diff accepted', { file });
    return true;
  }

  rejectDiff(file: string): boolean {
    if (!this.diffs.has(file)) {
      return false;
    }
    this.diffs.delete(file);
    logger.info('Diff rejected', { file });
    return true;
  }

  clearDiffs(): void {
    this.diffs.clear();
    logger.info('All diffs cleared');
  }

  shareSelection(file: string, text: string): void {
    if (!this.config.enableSelectionSharing) {
      return;
    }
    this.sharedSelections.push({
      file,
      text,
      timestamp: Date.now(),
    });
    logger.debug('Selection shared', { file, length: text.length });
  }

  getSharedSelections(): SharedSelection[] {
    return [...this.sharedSelections];
  }

  shareDiagnostic(file: string, line: number, message: string, type: string): void {
    if (!this.config.enableDiagnosticSharing) {
      return;
    }
    this.diagnostics.push({ file, line, message, type });
    logger.debug('Diagnostic shared', { file, line, type });
  }

  getDiagnostics(): SharedDiagnostic[] {
    return [...this.diagnostics];
  }

  clearDiagnostics(): void {
    this.diagnostics = [];
    logger.info('Diagnostics cleared');
  }

  getQuickLaunchShortcut(): string {
    return this.config.quickLaunchShortcut;
  }

  setQuickLaunchShortcut(shortcut: string): void {
    if (!shortcut || shortcut.trim().length === 0) {
      throw new Error('Shortcut cannot be empty');
    }
    this.config.quickLaunchShortcut = shortcut.trim();
    logger.info('Quick launch shortcut updated', { shortcut: this.config.quickLaunchShortcut });
  }

  getSupportedIDEs(): string[] {
    return [...this.config.supportedIDEs];
  }

  isIDESupported(ide: string): boolean {
    return this.config.supportedIDEs.some(
      supported => supported.toLowerCase() === ide.toLowerCase()
    );
  }

  generatePluginXml(): string {
    return `<idea-plugin>
  <id>com.codebuddy.jetbrains</id>
  <name>Code Buddy</name>
  <version>0.1.0</version>
  <vendor email="support@codebuddy.dev" url="https://codebuddy.dev">Code Buddy</vendor>
  <description><![CDATA[
    AI coding agent for JetBrains IDEs. Provides inline diffs, selection sharing,
    diagnostic context, and quick launch integration.
  ]]></description>
  <depends>com.intellij.modules.platform</depends>
  <extensions defaultExtensionNs="com.intellij">
    <toolWindow id="Code Buddy" anchor="right" factoryClass="com.codebuddy.ToolWindowFactory"/>
    <notificationGroup id="Code Buddy" displayType="BALLOON"/>
  </extensions>
  <actions>
    <action id="CodeBuddy.QuickLaunch" class="com.codebuddy.QuickLaunchAction"
            text="Code Buddy: Quick Launch" description="Open Code Buddy panel">
      <keyboard-shortcut keymap="\\$default" first-keystroke="${this.config.quickLaunchShortcut}"/>
    </action>
    <action id="CodeBuddy.ShareSelection" class="com.codebuddy.ShareSelectionAction"
            text="Share Selection with Code Buddy" description="Share selected code with Code Buddy">
      <add-to-group group-id="EditorPopupMenu" anchor="last"/>
    </action>
  </actions>
</idea-plugin>`;
  }

  getDiffCount(): number {
    return this.diffs.size;
  }
}
