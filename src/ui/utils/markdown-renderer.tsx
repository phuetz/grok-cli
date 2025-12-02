import React from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked to use the terminal renderer with default settings
marked.setOptions({
  renderer: new (TerminalRenderer as any)()
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect table start (line starting with |)
    if (line.startsWith('|') && !inTable) {
      tableStartIndex = i;
      inTable = true;
      hasSeparator = false;
    }

    // Detect separator row (|---|---|)
    if (inTable && /^\|[\s\-:]+\|/.test(line) && line.includes('-')) {
      hasSeparator = true;
    }

    // Table ends when we hit an empty line or non-table line after separator
    if (inTable && hasSeparator && (line === '' || !line.startsWith('|'))) {
      // Table is complete, reset
      inTable = false;
      tableStartIndex = -1;
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
 */
function isTableComplete(tableContent: string): boolean {
  const lines = tableContent.trim().split('\n').filter(l => l.trim());

  if (lines.length < 3) return false;

  // Check for header (first line with |)
  const hasHeader = lines[0].trim().startsWith('|');

  // Check for separator (line with |---|)
  const hasSeparator = lines.some(line => /^\|[\s\-:]+\|/.test(line.trim()) && line.includes('-'));

  // Check for at least one data row after separator
  let foundSeparator = false;
  let hasDataRow = false;
  for (const line of lines) {
    if (/^\|[\s\-:]+\|/.test(line.trim()) && line.includes('-')) {
      foundSeparator = true;
    } else if (foundSeparator && line.trim().startsWith('|')) {
      hasDataRow = true;
      break;
    }
  }

  return hasHeader && hasSeparator && hasDataRow;
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