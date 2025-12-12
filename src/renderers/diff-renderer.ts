/**
 * DiffRenderer - Render git diffs with syntax highlighting
 *
 * Displays diffs in a clear format with:
 * - Line numbers
 * - + for additions (green background)
 * - - for deletions (red background)
 * - Context lines (dimmed)
 * - Syntax highlighting for supported languages
 */

import {
  Renderer,
  RenderContext,
  DiffData,
  DiffLine,
  isDiffData,
} from './types.js';
import { highlight } from 'cli-highlight';

// ============================================================================
// Renderer Implementation
// ============================================================================

export const diffRenderer: Renderer<DiffData> = {
  id: 'diff',
  name: 'Diff Renderer',
  priority: 10,

  canRender(data: unknown): data is DiffData {
    return isDiffData(data);
  },

  render(data: DiffData, ctx: RenderContext): string {
    if (ctx.mode === 'plain') {
      return renderPlain(data);
    }
    return renderFancy(data, ctx);
  },
};

// ============================================================================
// Plain Mode Rendering
// ============================================================================

function renderPlain(data: DiffData): string {
  const lines: string[] = [];
  const { filePath, stats, hunks } = data;

  // Header
  lines.push(`Diff: ${filePath}`);
  if (stats) {
    lines.push(`+${stats.additions} -${stats.deletions}`);
  }
  lines.push('='.repeat(60));

  // Render hunks
  if (hunks && hunks.length > 0) {
    for (const hunk of hunks) {
      lines.push('');
      lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);

      for (const line of hunk.lines) {
        const prefix = line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' ';
        const lineNum = line.type === 'add'
          ? (line.newLineNumber ?? '').toString().padStart(4)
          : (line.oldLineNumber ?? '').toString().padStart(4);
        lines.push(`${lineNum} ${prefix} ${line.content}`);
      }
    }
  } else if (data.oldContent !== undefined && data.newContent !== undefined) {
    // Fallback: show old/new content
    lines.push('');
    lines.push('--- Old');
    lines.push(data.oldContent || '(empty)');
    lines.push('');
    lines.push('+++ New');
    lines.push(data.newContent || '(empty)');
  }

  return lines.join('\n');
}

// ============================================================================
// Fancy Mode Rendering
// ============================================================================

function renderFancy(data: DiffData, ctx: RenderContext): string {
  const lines: string[] = [];
  const { filePath, stats, hunks } = data;
  const W = Math.min(ctx.width, 120);

  // Colors
  const colors = {
    green: ctx.color ? '\x1b[32m' : '',
    red: ctx.color ? '\x1b[31m' : '',
    gray: ctx.color ? '\x1b[90m' : '',
    cyan: ctx.color ? '\x1b[36m' : '',
    bgGreen: ctx.color ? '\x1b[42m\x1b[30m' : '',  // Green bg, black text
    bgRed: ctx.color ? '\x1b[41m\x1b[30m' : '',    // Red bg, black text
    reset: ctx.color ? '\x1b[0m' : '',
    dim: ctx.color ? '\x1b[2m' : '',
    bold: ctx.color ? '\x1b[1m' : '',
  };

  // Header box
  lines.push('┌' + '─'.repeat(W - 2) + '┐');
  const title = ctx.emoji ? '📝 DIFF' : 'DIFF';
  const titleLine = `${title}: ${filePath}`;
  lines.push('│ ' + titleLine + ' '.repeat(Math.max(0, W - titleLine.length - 4)) + ' │');

  // Stats line
  if (stats) {
    const statsLine = `${colors.green}+${stats.additions}${colors.reset} ${colors.red}-${stats.deletions}${colors.reset}`;
    const statsLineClean = `+${stats.additions} -${stats.deletions}`;
    lines.push('│ ' + statsLine + ' '.repeat(Math.max(0, W - statsLineClean.length - 4)) + ' │');
  }

  lines.push('├' + '─'.repeat(W - 2) + '┤');

  // Render hunks
  if (hunks && hunks.length > 0) {
    for (let hunkIdx = 0; hunkIdx < hunks.length; hunkIdx++) {
      const hunk = hunks[hunkIdx];

      // Hunk header
      if (hunkIdx > 0) {
        lines.push('│' + ' '.repeat(W - 2) + '│');
      }

      const hunkHeader = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
      lines.push('│ ' + colors.cyan + hunkHeader + colors.reset + ' '.repeat(Math.max(0, W - hunkHeader.length - 4)) + ' │');

      // Render lines
      for (const line of hunk.lines) {
        const renderedLine = renderDiffLine(line, filePath, ctx, colors, W);
        lines.push(renderedLine);
      }
    }
  } else if (data.oldContent !== undefined && data.newContent !== undefined) {
    // Fallback: show simplified diff
    lines.push('│ ' + colors.red + '--- Old' + colors.reset + ' '.repeat(W - 10) + ' │');
    const oldLines = (data.oldContent || '(empty)').split('\n').slice(0, 5);
    for (const oldLine of oldLines) {
      const truncated = oldLine.length > W - 6 ? oldLine.substring(0, W - 9) + '...' : oldLine;
      lines.push('│ ' + colors.dim + truncated + colors.reset + ' '.repeat(Math.max(0, W - truncated.length - 4)) + ' │');
    }

    lines.push('│ ' + ' '.repeat(W - 2) + '│');
    lines.push('│ ' + colors.green + '+++ New' + colors.reset + ' '.repeat(W - 10) + ' │');
    const newLines = (data.newContent || '(empty)').split('\n').slice(0, 5);
    for (const newLine of newLines) {
      const truncated = newLine.length > W - 6 ? newLine.substring(0, W - 9) + '...' : newLine;
      lines.push('│ ' + colors.dim + truncated + colors.reset + ' '.repeat(Math.max(0, W - truncated.length - 4)) + ' │');
    }
  } else {
    lines.push('│ ' + colors.gray + 'No detailed diff available' + colors.reset + ' '.repeat(W - 30) + ' │');
  }

  lines.push('└' + '─'.repeat(W - 2) + '┘');

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

function renderDiffLine(
  line: DiffLine,
  filePath: string,
  ctx: RenderContext,
  colors: Record<string, string>,
  width: number
): string {
  const maxContentWidth = width - 12; // Account for border, line number, prefix

  let prefix = ' ';
  let colorCode = '';
  let lineNum = '';

  switch (line.type) {
    case 'add':
      prefix = '+';
      colorCode = colors.bgGreen;
      lineNum = (line.newLineNumber ?? '').toString().padStart(4);
      break;
    case 'delete':
      prefix = '-';
      colorCode = colors.bgRed;
      lineNum = (line.oldLineNumber ?? '').toString().padStart(4);
      break;
    case 'context':
      prefix = ' ';
      colorCode = colors.dim;
      lineNum = (line.newLineNumber ?? '').toString().padStart(4);
      break;
  }

  // Truncate content if too long
  let content = line.content || '';

  // Apply syntax highlighting for context lines
  if (line.type === 'context' && ctx.color) {
    const language = getLanguageFromFilename(filePath);
    if (language) {
      try {
        content = highlight(content, { language, ignoreIllegals: true });
      } catch {
        // Fallback to original if highlighting fails
      }
    }
  }

  if (content.length > maxContentWidth) {
    content = content.substring(0, maxContentWidth - 3) + '...';
  }

  // Clean ANSI codes for length calculation
  const cleanContent = content.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = ' '.repeat(Math.max(0, width - cleanContent.length - 10));

  return `│ ${colors.gray}${lineNum}${colors.reset} ${colorCode}${prefix}${colors.reset} ${colorCode}${content}${colors.reset}${padding} │`;
}

function getLanguageFromFilename(filename: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    json: 'json',
    css: 'css',
    html: 'html',
    sh: 'bash',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    sql: 'sql',
  };

  return languageMap[extension] || null;
}
