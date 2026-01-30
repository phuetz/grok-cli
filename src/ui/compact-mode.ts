/**
 * Compact Mode
 *
 * Optimized display for small screens:
 * - Reduced margins and padding
 * - Abbreviated output
 * - Collapsible sections
 * - Responsive layout
 */

import * as _os from 'os';

export interface TerminalSize {
  columns: number;
  rows: number;
}

export type DisplayMode = 'full' | 'compact' | 'minimal';

export interface CompactModeConfig {
  /** Force a specific mode */
  forceMode?: DisplayMode;
  /** Minimum width for full mode */
  fullModeMinWidth: number;
  /** Minimum width for compact mode */
  compactModeMinWidth: number;
  /** Maximum lines for tool output */
  maxToolOutputLines: number;
  /** Show timestamps */
  showTimestamps: boolean;
  /** Show icons */
  showIcons: boolean;
  /** Truncate long lines */
  truncateLongLines: boolean;
  /** Maximum message preview length */
  maxPreviewLength: number;
}

const DEFAULT_CONFIG: CompactModeConfig = {
  forceMode: undefined,
  fullModeMinWidth: 100,
  compactModeMinWidth: 60,
  maxToolOutputLines: 20,
  showTimestamps: true,
  showIcons: true,
  truncateLongLines: true,
  maxPreviewLength: 100,
};

/**
 * Compact Mode Manager
 */
export class CompactModeManager {
  private config: CompactModeConfig;
  private currentMode: DisplayMode;
  private terminalSize: TerminalSize;

  constructor(config?: Partial<CompactModeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.terminalSize = this.getTerminalSize();
    this.currentMode = this.determineMode();

    // Listen for terminal resize
    if (process.stdout.isTTY) {
      process.stdout.on('resize', () => {
        this.terminalSize = this.getTerminalSize();
        this.currentMode = this.determineMode();
      });
    }
  }

  /**
   * Get current display mode
   */
  getMode(): DisplayMode {
    return this.currentMode;
  }

  /**
   * Set display mode
   */
  setMode(mode: DisplayMode): void {
    this.config.forceMode = mode;
    this.currentMode = mode;
  }

  /**
   * Auto-detect mode based on terminal size
   */
  autoDetectMode(): void {
    this.config.forceMode = undefined;
    this.currentMode = this.determineMode();
  }

  /**
   * Get terminal size
   */
  getTerminalSize(): TerminalSize {
    return {
      columns: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
    };
  }

  /**
   * Check if in compact mode
   */
  isCompact(): boolean {
    return this.currentMode === 'compact' || this.currentMode === 'minimal';
  }

  /**
   * Check if in minimal mode
   */
  isMinimal(): boolean {
    return this.currentMode === 'minimal';
  }

  /**
   * Get effective width
   */
  getWidth(): number {
    return this.terminalSize.columns;
  }

  /**
   * Get content width (with margins)
   */
  getContentWidth(): number {
    switch (this.currentMode) {
      case 'minimal':
        return this.terminalSize.columns;
      case 'compact':
        return Math.max(40, this.terminalSize.columns - 4);
      default:
        return Math.max(60, this.terminalSize.columns - 8);
    }
  }

  /**
   * Truncate text to fit width
   */
  truncate(text: string, maxWidth?: number): string {
    const width = maxWidth || this.getContentWidth();
    if (text.length <= width) return text;
    return text.slice(0, width - 3) + '...';
  }

  /**
   * Wrap text to fit width
   */
  wrap(text: string, maxWidth?: number): string[] {
    const width = maxWidth || this.getContentWidth();
    const lines: string[] = [];
    let currentLine = '';

    for (const word of text.split(/\s+/)) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Format a header
   */
  formatHeader(title: string): string {
    switch (this.currentMode) {
      case 'minimal':
        return `-- ${title} --`;
      case 'compact':
        return `═ ${title} ${'═'.repeat(Math.max(0, this.getContentWidth() - title.length - 4))}`;
      default:
        const padding = Math.max(0, (this.getContentWidth() - title.length - 4) / 2);
        return [
          '═'.repeat(this.getContentWidth()),
          ' '.repeat(Math.floor(padding)) + title,
          '═'.repeat(this.getContentWidth()),
        ].join('\n');
    }
  }

  /**
   * Format a separator
   */
  formatSeparator(): string {
    switch (this.currentMode) {
      case 'minimal':
        return '─'.repeat(Math.min(20, this.getContentWidth()));
      case 'compact':
        return '─'.repeat(this.getContentWidth());
      default:
        return '─'.repeat(this.getContentWidth());
    }
  }

  /**
   * Format a message preview
   */
  formatMessagePreview(role: string, content: string): string {
    const maxLen = this.config.maxPreviewLength;
    const preview = content.length > maxLen
      ? content.slice(0, maxLen - 3) + '...'
      : content;

    const singleLine = preview.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    switch (this.currentMode) {
      case 'minimal':
        return `${role[0].toUpperCase()}: ${this.truncate(singleLine, this.getContentWidth() - 3)}`;
      case 'compact':
        return `[${role}] ${this.truncate(singleLine)}`;
      default:
        return `[${role.toUpperCase()}]\n${content}`;
    }
  }

  /**
   * Format tool output
   */
  formatToolOutput(toolName: string, output: string): string {
    const lines = output.split('\n');
    const maxLines = this.config.maxToolOutputLines;

    let displayLines: string[];
    let truncated = false;

    if (lines.length > maxLines) {
      displayLines = lines.slice(0, maxLines);
      truncated = true;
    } else {
      displayLines = lines;
    }

    // Truncate individual lines if needed
    if (this.config.truncateLongLines) {
      displayLines = displayLines.map(line => this.truncate(line));
    }

    let result: string;

    switch (this.currentMode) {
      case 'minimal':
        result = displayLines.join('\n');
        if (truncated) {
          result += `\n... (${lines.length - maxLines} more lines)`;
        }
        break;
      case 'compact':
        result = `[${toolName}]\n${displayLines.join('\n')}`;
        if (truncated) {
          result += `\n... (${lines.length - maxLines} more lines)`;
        }
        break;
      default:
        result = `Tool: ${toolName}\n${'─'.repeat(40)}\n${displayLines.join('\n')}`;
        if (truncated) {
          result += `\n${'─'.repeat(40)}\n(${lines.length - maxLines} more lines hidden)`;
        }
        break;
    }

    return result;
  }

  /**
   * Format a status line
   */
  formatStatusLine(items: Array<{ label: string; value: string }>): string {
    switch (this.currentMode) {
      case 'minimal':
        return items.map(i => `${i.label[0]}:${i.value}`).join(' ');
      case 'compact':
        return items.map(i => `${i.label}: ${i.value}`).join(' | ');
      default:
        return items.map(i => `${i.label}: ${i.value}`).join('  •  ');
    }
  }

  /**
   * Format timestamp
   */
  formatTimestamp(date: Date): string {
    if (!this.config.showTimestamps) return '';

    switch (this.currentMode) {
      case 'minimal':
        return '';
      case 'compact':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      default:
        return date.toLocaleTimeString();
    }
  }

  /**
   * Get icon for type
   */
  getIcon(type: string): string {
    if (!this.config.showIcons) return '';
    if (this.currentMode === 'minimal') return '';

    const icons: Record<string, string> = {
      success: '✓',
      error: '✗',
      warning: '!',
      info: 'i',
      user: '→',
      assistant: '←',
      tool: '⚙',
      file: '📄',
      folder: '📁',
      loading: '⋯',
    };

    return icons[type] || '';
  }

  /**
   * Format a list
   */
  formatList(items: string[], numbered: boolean = false): string {
    switch (this.currentMode) {
      case 'minimal':
        if (numbered) {
          return items.map((item, i) => `${i + 1}. ${this.truncate(item)}`).join('\n');
        }
        return items.map(item => `- ${this.truncate(item)}`).join('\n');
      case 'compact':
        if (numbered) {
          return items.map((item, i) => `  ${i + 1}. ${this.truncate(item)}`).join('\n');
        }
        return items.map(item => `  • ${this.truncate(item)}`).join('\n');
      default:
        if (numbered) {
          return items.map((item, i) => `    ${(i + 1).toString().padStart(2)}. ${item}`).join('\n');
        }
        return items.map(item => `    • ${item}`).join('\n');
    }
  }

  /**
   * Format a table
   */
  formatTable(headers: string[], rows: string[][]): string {
    if (this.currentMode === 'minimal') {
      // Just key-value pairs
      return rows.map(row =>
        row.map((cell, i) => `${headers[i]}: ${cell}`).join(', ')
      ).join('\n');
    }

    // Calculate column widths
    const colWidths = headers.map((h, i) => {
      const maxCellWidth = Math.max(
        h.length,
        ...rows.map(row => (row[i] || '').length)
      );
      return Math.min(maxCellWidth, Math.floor(this.getContentWidth() / headers.length));
    });

    // Format header
    const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
    const separatorLine = colWidths.map(w => '─'.repeat(w)).join('─┼─');

    // Format rows
    const dataLines = rows.map(row =>
      row.map((cell, i) => {
        const width = colWidths[i];
        return cell.length > width
          ? cell.slice(0, width - 2) + '..'
          : cell.padEnd(width);
      }).join(' | ')
    );

    return [headerLine, separatorLine, ...dataLines].join('\n');
  }

  /**
   * Get mode-specific padding
   */
  getPadding(): { left: number; right: number; top: number; bottom: number } {
    switch (this.currentMode) {
      case 'minimal':
        return { left: 0, right: 0, top: 0, bottom: 0 };
      case 'compact':
        return { left: 1, right: 1, top: 0, bottom: 1 };
      default:
        return { left: 2, right: 2, top: 1, bottom: 1 };
    }
  }

  /**
   * Determine mode based on terminal size
   */
  private determineMode(): DisplayMode {
    if (this.config.forceMode) {
      return this.config.forceMode;
    }

    const width = this.terminalSize.columns;

    if (width >= this.config.fullModeMinWidth) {
      return 'full';
    }

    if (width >= this.config.compactModeMinWidth) {
      return 'compact';
    }

    return 'minimal';
  }
}

// Singleton instance
let compactModeManager: CompactModeManager | null = null;

/**
 * Get or create compact mode manager
 */
export function getCompactModeManager(): CompactModeManager {
  if (!compactModeManager) {
    compactModeManager = new CompactModeManager();
  }
  return compactModeManager;
}

/**
 * Check if in compact mode
 */
export function isCompactMode(): boolean {
  return getCompactModeManager().isCompact();
}

/**
 * Get current display mode
 */
export function getDisplayMode(): DisplayMode {
  return getCompactModeManager().getMode();
}

/**
 * Set display mode
 */
export function setDisplayMode(mode: DisplayMode): void {
  getCompactModeManager().setMode(mode);
}

export default CompactModeManager;
