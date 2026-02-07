import React from 'react';
import { Box, Text } from 'ink';

interface ToolStreamOutputProps {
  /** Accumulated streaming output */
  output: string;
  /** Tool name being executed */
  toolName: string;
  /** Maximum number of lines to display */
  maxLines?: number;
  /** Whether the tool is still executing */
  isStreaming?: boolean;
}

/**
 * Displays real-time tool output in a terminal-style scrolling buffer.
 * Shows the last N lines of output with a header indicating the tool.
 */
export function ToolStreamOutput({
  output,
  toolName,
  maxLines = 15,
  isStreaming = false,
}: ToolStreamOutputProps) {
  const lines = output.split('\n');
  const displayLines = lines.slice(-maxLines);
  const hiddenCount = Math.max(0, lines.length - maxLines);

  return (
    <Box flexDirection="column" marginLeft={2}>
      {hiddenCount > 0 && (
        <Text dimColor color="gray">... {hiddenCount} lines hidden</Text>
      )}
      {displayLines.map((line, idx) => (
        <Text key={idx} color="gray">{line}</Text>
      ))}
      {isStreaming && (
        <Text dimColor color="cyan">
          {toolName} running...
        </Text>
      )}
    </Box>
  );
}
