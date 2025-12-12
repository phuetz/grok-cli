/**
 * TableRenderer - Render tabular data
 *
 * Displays data in a formatted table with:
 * - Headers (bold)
 * - Aligned columns (left/center/right)
 * - Box-drawing borders
 * - Auto-sizing based on content
 */

import stringWidth from 'string-width';
import {
  Renderer,
  RenderContext,
  TableData,
  isTableData,
} from './types.js';

// ============================================================================
// Renderer Implementation
// ============================================================================

export const tableRenderer: Renderer<TableData> = {
  id: 'table',
  name: 'Table Renderer',
  priority: 10,

  canRender(data: unknown): data is TableData {
    return isTableData(data);
  },

  render(data: TableData, ctx: RenderContext): string {
    if (ctx.mode === 'plain') {
      return renderPlain(data);
    }
    return renderFancy(data, ctx);
  },
};

// ============================================================================
// Plain Mode Rendering
// ============================================================================

function renderPlain(data: TableData): string {
  const lines: string[] = [];
  const { headers, rows, title } = data;

  if (title) {
    lines.push(title);
    lines.push('='.repeat(title.length));
    lines.push('');
  }

  // Calculate column widths
  const colWidths = calculateColumnWidths(headers, rows);

  // Headers
  const headerRow = headers
    .map((h, i) => h.padEnd(colWidths[i]))
    .join(' | ');
  lines.push(headerRow);
  lines.push('-'.repeat(headerRow.length));

  // Rows
  for (const row of rows) {
    const rowStr = row
      .map((cell, i) => formatCell(cell).padEnd(colWidths[i]))
      .join(' | ');
    lines.push(rowStr);
  }

  return lines.join('\n');
}

// ============================================================================
// Fancy Mode Rendering
// ============================================================================

function renderFancy(data: TableData, ctx: RenderContext): string {
  const lines: string[] = [];
  const { headers, rows, title, alignment = [] } = data;

  // Colors
  const colors = {
    border: ctx.color ? '\x1b[90m' : '', // Gray
    header: ctx.color ? '\x1b[1m' : '',  // Bold
    reset: ctx.color ? '\x1b[0m' : '',
  };

  // Calculate column widths
  const colWidths = calculateColumnWidths(headers, rows);

  // Calculate total table width
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + (colWidths.length - 1) * 3 + 4;

  // Title
  if (title) {
    lines.push('┌' + '─'.repeat(totalWidth - 2) + '┐');
    lines.push('│' + centerText(title, totalWidth - 2) + '│');
    lines.push('├' + '─'.repeat(totalWidth - 2) + '┤');
  } else {
    lines.push('┌' + '─'.repeat(totalWidth - 2) + '┐');
  }

  // Header row
  const headerCells = headers.map((h, i) => {
    const align = alignment[i] || 'left';
    return alignText(h, colWidths[i], align);
  });

  lines.push(
    '│ ' +
    colors.header +
    headerCells.join(' │ ') +
    colors.reset +
    ' │'
  );
  lines.push('├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤');

  // Data rows
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowCells = row.map((cell, i) => {
      const align = alignment[i] || 'left';
      const cellStr = formatCell(cell);
      return alignText(cellStr, colWidths[i], align);
    });

    lines.push('│ ' + rowCells.join(' │ ') + ' │');
  }

  // Bottom border
  lines.push('└' + '─'.repeat(totalWidth - 2) + '┘');

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate optimal column widths based on content
 */
function calculateColumnWidths(
  headers: string[],
  rows: (string | number | boolean | null)[][]
): number[] {
  const widths: number[] = headers.map(h => stringWidth(h));

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cellStr = formatCell(row[i]);
      widths[i] = Math.max(widths[i] || 0, stringWidth(cellStr));
    }
  }

  // Cap maximum width to 40 chars per column
  return widths.map(w => Math.min(w, 40));
}

/**
 * Format cell value to string
 */
function formatCell(value: string | number | boolean | null): string {
  if (value === null) return '';
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    // Format numbers with commas for readability
    return value.toLocaleString();
  }
  const str = String(value);
  // Truncate if too long
  if (str.length > 40) {
    return str.substring(0, 37) + '...';
  }
  return str;
}

/**
 * Align text within a field
 */
function alignText(text: string, width: number, align: 'left' | 'center' | 'right'): string {
  const textWidth = stringWidth(text);
  const padding = width - textWidth;

  if (padding <= 0) return text;

  switch (align) {
    case 'left':
      return text + ' '.repeat(padding);
    case 'right':
      return ' '.repeat(padding) + text;
    case 'center': {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    }
    default:
      return text + ' '.repeat(padding);
  }
}

/**
 * Center text within a field
 */
function centerText(text: string, width: number): string {
  const textWidth = stringWidth(text);
  if (textWidth >= width) return text.substring(0, width);

  const padding = width - textWidth;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}
