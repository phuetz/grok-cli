import React, { useMemo } from "react";
import { Box, Text, Static } from "ink";
import { ChatEntry } from "../../agent/grok-agent.js";
import { DiffRenderer } from "./diff-renderer.js";
import { MarkdownRenderer } from "../utils/markdown-renderer.js";
import { useTheme } from "../context/theme-context.js";
import { ThemeColors, AvatarConfig } from "../../themes/theme.js";
import { getRenderManager, isTestResultsData, isWeatherData, isCodeStructureData } from "../../renderers/index.js";

interface ChatHistoryProps {
  entries: ChatEntry[];
  isConfirmationActive?: boolean;
}

interface MemoizedChatEntryProps {
  entry: ChatEntry;
  index: number;
  colors: ThemeColors;
  avatars: AvatarConfig;
}

// ============================================================================
// Structured Data Detection & Rendering
// ============================================================================

/**
 * Try to parse content as structured data and render it appropriately
 * Returns null if content is not recognized structured data
 */
function tryRenderStructuredData(content: string): string | null {
  try {
    const parsed = JSON.parse(content);
    const manager = getRenderManager();

    // Check if it's a known structured data type
    if (isTestResultsData(parsed) || isWeatherData(parsed) || isCodeStructureData(parsed)) {
      return manager.render(parsed);
    }

    // Check if manager can render it (generic check)
    if (manager.canRender(parsed)) {
      return manager.render(parsed);
    }
  } catch {
    // Not JSON, not structured data
  }
  return null;
}

/**
 * Component to render structured output with proper line handling
 */
function StructuredContent({ content, color }: { content: string; color?: string }) {
  const lines = content.split('\n');
  return (
    <Box flexDirection="column">
      {lines.map((line, idx) => (
        <Text key={idx} color={color}>{line}</Text>
      ))}
    </Box>
  );
}

// Memoized ChatEntry component to prevent unnecessary re-renders
const MemoizedChatEntry = React.memo(
  ({ entry, index, colors, avatars }: MemoizedChatEntryProps) => {
    const renderDiff = (diffContent: string, filename?: string) => {
      return (
        <DiffRenderer
          diffContent={diffContent}
          filename={filename}
          terminalWidth={80}
        />
      );
    };

    const renderFileContent = (content: string) => {
      const lines = content.split("\n");

      // Calculate minimum indentation like DiffRenderer does
      let baseIndentation = Infinity;
      for (const line of lines) {
        if (line.trim() === "") continue;
        const firstCharIndex = line.search(/\S/);
        const currentIndent = firstCharIndex === -1 ? 0 : firstCharIndex;
        baseIndentation = Math.min(baseIndentation, currentIndent);
      }
      if (!isFinite(baseIndentation)) {
        baseIndentation = 0;
      }

      return lines.map((line, index) => {
        const displayContent = line.substring(baseIndentation);
        return (
          <Text key={index} color="gray">
            {displayContent}
          </Text>
        );
      });
    };

    switch (entry.type) {
      case "user":
        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box>
              <Text color={colors.userMessage}>
                {avatars.user} {entry.content}
              </Text>
            </Box>
          </Box>
        );

      case "assistant":
        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box flexDirection="row" alignItems="flex-start">
              <Text color={colors.assistantMessage}>{avatars.assistant} </Text>
              <Box flexDirection="column" flexGrow={1}>
                {entry.toolCalls ? (
                  // If there are tool calls, just show plain text
                  <Text color={colors.assistantMessage}>{entry.content.trim()}</Text>
                ) : (
                  // If no tool calls, render as markdown
                  // Pass isStreaming to handle incomplete tables properly
                  <MarkdownRenderer content={entry.content.trim()} isStreaming={entry.isStreaming} />
                )}
                {entry.isStreaming && <Text color={colors.info}>█</Text>}
              </Box>
            </Box>
          </Box>
        );

      case "tool_call":
      case "tool_result":
        const getToolActionName = (toolName: string) => {
          // Handle MCP tools with mcp__servername__toolname format
          if (toolName.startsWith("mcp__")) {
            const parts = toolName.split("__");
            if (parts.length >= 3) {
              const serverName = parts[1];
              const actualToolName = parts.slice(2).join("__");
              return `${serverName.charAt(0).toUpperCase() + serverName.slice(1)}(${actualToolName.replace(/_/g, " ")})`;
            }
          }

          switch (toolName) {
            case "view_file":
              return "Read";
            case "str_replace_editor":
              return "Update";
            case "create_file":
              return "Create";
            case "bash":
              return "Bash";
            case "search":
              return "Search";
            case "create_todo_list":
              return "Created Todo";
            case "update_todo_list":
              return "Updated Todo";
            default:
              return "Tool";
          }
        };

        const toolName = entry.toolCall?.function?.name || "unknown";
        const actionName = getToolActionName(toolName);

        const getFilePath = (toolCall: any) => {
          if (toolCall?.function?.arguments) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              if (toolCall.function.name === "search") {
                return args.query;
              }
              return args.path || args.file_path || args.command || "";
            } catch {
              return "";
            }
          }
          return "";
        };

        const filePath = getFilePath(entry.toolCall);
        const isExecuting = entry.type === "tool_call" || !entry.toolResult;
        
        // Format JSON content for better readability
        const formatToolContent = (content: string, toolName: string): { text: string; isStructured: boolean } => {
          // First, try to render as structured data
          const structuredOutput = tryRenderStructuredData(content);
          if (structuredOutput) {
            return { text: structuredOutput, isStructured: true };
          }

          if (toolName.startsWith("mcp__")) {
            try {
              // Try to parse as JSON and format it
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed)) {
                // For arrays, show a summary instead of full JSON
                return { text: `Found ${parsed.length} items`, isStructured: false };
              } else if (typeof parsed === 'object') {
                // For objects, show a formatted version
                return { text: JSON.stringify(parsed, null, 2), isStructured: false };
              }
            } catch {
              // If not JSON, return as is
              return { text: content, isStructured: false };
            }
          }
          return { text: content, isStructured: false };
        };
        const shouldShowDiff =
          entry.toolCall?.function?.name === "str_replace_editor" &&
          entry.toolResult?.success &&
          entry.content.includes("Updated") &&
          entry.content.includes("---") &&
          entry.content.includes("+++");

        const shouldShowFileContent =
          (entry.toolCall?.function?.name === "view_file" ||
            entry.toolCall?.function?.name === "create_file") &&
          entry.toolResult?.success &&
          !shouldShowDiff;

        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box>
              <Text color={colors.toolCall}>{avatars.tool}</Text>
              <Text color={colors.text}>
                {" "}
                {filePath ? `${actionName}(${filePath})` : actionName}
              </Text>
            </Box>
            <Box marginLeft={2} flexDirection="column">
              {isExecuting ? (
                <Text color={colors.info}>⎿ Executing...</Text>
              ) : shouldShowFileContent ? (
                <Box flexDirection="column">
                  <Text color={colors.toolResult}>⎿ File contents:</Text>
                  <Box marginLeft={2} flexDirection="column">
                    {renderFileContent(entry.content)}
                  </Box>
                </Box>
              ) : shouldShowDiff ? (
                // For diff results, show only the summary line, not the raw content
                <Text color={colors.toolResult}>⎿ {entry.content.split("\n")[0]}</Text>
              ) : (() => {
                const formatted = formatToolContent(entry.content, toolName);
                if (formatted.isStructured) {
                  return (
                    <Box flexDirection="column">
                      <Text color={colors.toolResult}>⎿ Structured output:</Text>
                      <Box marginLeft={2}>
                        <StructuredContent content={formatted.text} />
                      </Box>
                    </Box>
                  );
                }
                return <Text color={colors.toolResult}>⎿ {formatted.text}</Text>;
              })()}
            </Box>
            {shouldShowDiff && !isExecuting && (
              <Box marginLeft={4} flexDirection="column">
                {renderDiff(entry.content, filePath)}
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  }
);

MemoizedChatEntry.displayName = "MemoizedChatEntry";

export function ChatHistory({
  entries,
  isConfirmationActive = false,
}: ChatHistoryProps) {
  const { colors, avatars } = useTheme();

  // Filter out tool_call entries with "Executing..." when confirmation is active
  const filteredEntries = useMemo(() => {
    const filtered = isConfirmationActive
      ? entries.filter(
          (entry) =>
            !(entry.type === "tool_call" && entry.content === "Executing...")
        )
      : entries;
    return filtered.slice(-20);
  }, [entries, isConfirmationActive]);

  // Separate completed (static) entries from streaming (dynamic) entries
  // Static entries use Ink's Static component - they render once and never re-render
  // This dramatically reduces flickering during streaming
  const { staticEntries, dynamicEntries } = useMemo(() => {
    const staticList: Array<ChatEntry & { uniqueKey: string }> = [];
    const dynamicList: Array<ChatEntry & { uniqueKey: string }> = [];

    filteredEntries.forEach((entry, index) => {
      // Create a stable unique key based on timestamp and content hash
      const uniqueKey = `${entry.timestamp.getTime()}-${index}`;
      const entryWithKey = { ...entry, uniqueKey };

      // Entry is dynamic if it's streaming or is a tool_call being executed
      const isDynamic = entry.isStreaming ||
        (entry.type === "tool_call" && entry.content === "Executing...");

      if (isDynamic) {
        dynamicList.push(entryWithKey);
      } else {
        staticList.push(entryWithKey);
      }
    });

    return { staticEntries: staticList, dynamicEntries: dynamicList };
  }, [filteredEntries]);

  return (
    <Box flexDirection="column">
      {/* Static component renders items once and never re-renders them */}
      {/* This prevents flickering for completed messages */}
      <Static items={staticEntries}>
        {(entry) => (
          <MemoizedChatEntry
            key={entry.uniqueKey}
            entry={entry}
            index={0}
            colors={colors}
            avatars={avatars}
          />
        )}
      </Static>

      {/* Dynamic entries (streaming) are rendered normally and can update */}
      {dynamicEntries.map((entry, index) => (
        <MemoizedChatEntry
          key={entry.uniqueKey}
          entry={entry}
          index={index}
          colors={colors}
          avatars={avatars}
        />
      ))}
    </Box>
  );
}
