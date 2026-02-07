import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ReasoningBlockProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Collapsible block that displays model reasoning/thinking content.
 * Shows a dimmed "Thinking..." header with the reasoning text below.
 * Can be toggled with 't' key when not in streaming mode.
 */
export function ReasoningBlock({ content, isStreaming = false }: ReasoningBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  useInput((input) => {
    if (input === 't' && !isStreaming) {
      setCollapsed(prev => !prev);
    }
  });

  const lines = content.split('\n');
  const previewLength = 2;
  const hasMore = lines.length > previewLength;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text dimColor color="gray">
          {collapsed ? '▶' : '▼'} Thinking{isStreaming ? '...' : ` (${lines.length} lines)`}
        </Text>
        {!isStreaming && hasMore && (
          <Text dimColor color="gray"> [t to {collapsed ? 'expand' : 'collapse'}]</Text>
        )}
      </Box>
      {!collapsed && (
        <Box paddingLeft={2} flexDirection="column">
          {(collapsed ? [] : lines).map((line, idx) => (
            <Text key={idx} dimColor color="gray">{line}</Text>
          ))}
          {isStreaming && <Text dimColor color="gray">█</Text>}
        </Box>
      )}
    </Box>
  );
}
