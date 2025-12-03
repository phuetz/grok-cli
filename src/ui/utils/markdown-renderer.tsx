import React from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { highlight } from 'cli-highlight';

// Configure marked to use the terminal renderer with syntax highlighting
marked.setOptions({
  renderer: new (TerminalRenderer as any)({
    // Enable syntax highlighting for code blocks
    code: (code: string, lang?: string) => {
      try {
        if (lang) {
          return highlight(code, { language: lang, ignoreIllegals: true });
        }
        // Auto-detect language if not specified
        return highlight(code, { ignoreIllegals: true });
      } catch {
        // Fallback to plain code if highlighting fails
        return code;
      }
    },
    // Style inline code
    codespan: (text: string) => `\x1b[36m${text}\x1b[0m`, // Cyan for inline code
    // Better heading styles
    heading: (text: string, level: number) => {
      const colors = ['\x1b[1;35m', '\x1b[1;34m', '\x1b[1;33m', '\x1b[34m', '\x1b[33m', '\x1b[37m'];
      const color = colors[Math.min(level - 1, colors.length - 1)];
      return `\n${color}${'#'.repeat(level)} ${text}\x1b[0m\n`;
    },
    // Bold and italic
    strong: (text: string) => `\x1b[1m${text}\x1b[0m`,
    em: (text: string) => `\x1b[3m${text}\x1b[0m`,
  })
});

/**
 * Check if content contains an incomplete markdown table
 * A complete table has: header row, separator row (|---|), and ends with newline or EOF
 */
function hasIncompleteTable(content: string): { hasTable: boolean; safeContent: string; tableContent: string } {
  const lines = content.split('\n');
  let tableStartIndex = -1;
  let hasSeparator = false;
  let inTable = false;
  let lastTableEndIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect table start (line starting with | and containing at least one more |)
    if (line.startsWith('|') && line.lastIndexOf('|') > 0 && !inTable) {
      tableStartIndex = i;
      inTable = true;
      hasSeparator = false;
    }

    // Detect separator row (|---|---|) - more flexible pattern
    if (inTable && /^\|[\s\-:|]+\|$/.test(line) && line.includes('-')) {
      hasSeparator = true;
    }

    // Table ends when we hit an empty line or non-table line after separator
    if (inTable && (line === '' || (!line.startsWith('|') && !line.endsWith('|')))) {
      if (hasSeparator) {
        // Table was complete
        lastTableEndIndex = i;
      }
      inTable = false;
      tableStartIndex = -1;
      hasSeparator = false;
    }
  }

  // If we're still in a table at the end, it's incomplete
  if (inTable && tableStartIndex !== -1) {
    const safeContent = lines.slice(0, tableStartIndex).join('\n');
    const tableContent = lines.slice(tableStartIndex).join('\n');
    return { hasTable: true, safeContent, tableContent };
  }

  return { hasTable: false, safeContent: content, tableContent: '' };
}

/**
 * Check if a table is complete enough to render
 * Requires: header row, separator row, at least one data row
 * Also checks that each row has complete pipes
 */
function isTableComplete(tableContent: string): boolean {
  const lines = tableContent.trim().split('\n').filter(l => l.trim());

  if (lines.length < 3) return false;

  // Check for header (first line with | at start and end)
  const firstLine = lines[0].trim();
  const hasHeader = firstLine.startsWith('|') && firstLine.endsWith('|');

  if (!hasHeader) return false;

  // Count columns in header
  const headerCols = (firstLine.match(/\|/g) || []).length - 1;

  // Check for separator (line with |---|) - must have same column count
  let separatorIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^\|[\s\-:|]+\|$/.test(line) && line.includes('-')) {
      const sepCols = (line.match(/\|/g) || []).length - 1;
      if (sepCols === headerCols) {
        separatorIndex = i;
        break;
      }
    }
  }

  if (separatorIndex === -1) return false;

  // Check for at least one complete data row after separator
  for (let i = separatorIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      // Check if the row is complete (ends with | and has content)
      const rowCols = (line.match(/\|/g) || []).length - 1;
      if (rowCols === headerCols) {
        return true;
      }
    }
  }

  return false;
}

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, isStreaming = false }: MarkdownRendererProps) {
  try {
    // During streaming, check for incomplete tables
    if (isStreaming) {
      const { hasTable, safeContent, tableContent } = hasIncompleteTable(content);

      if (hasTable) {
        // Check if the table is complete enough to render
        if (isTableComplete(tableContent)) {
          // Table is complete, render everything
          const result = marked.parse(content);
          const rendered = typeof result === 'string' ? result : content;
          return <Text>{rendered}</Text>;
        } else {
          // Table is incomplete - render safe content and show table as raw text
          const safePart = safeContent ? marked.parse(safeContent) : '';
          const safeRendered = typeof safePart === 'string' ? safePart : safeContent;

          // Show raw table content while streaming (will be re-rendered when complete)
          return (
            <>
              {safeRendered && <Text>{safeRendered}</Text>}
              <Text dimColor>{tableContent}</Text>
            </>
          );
        }
      }
    }

    // Use marked.parse for synchronous parsing
    const result = marked.parse(content);
    // Handle both sync and async results
    const rendered = typeof result === 'string' ? result : content;
    return <Text>{rendered}</Text>;
  } catch (error) {
    // Fallback to plain text if markdown parsing fails
    console.error('Markdown rendering error:', error);
    return <Text>{content}</Text>;
  }
}