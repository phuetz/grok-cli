/**
 * Dynamic Tool Filtering
 *
 * Research-based implementation of "Less-is-More" tool filtering.
 * Pre-filters tools to only the most relevant based on task context.
 *
 * Expected Impact:
 * - 70% reduction in execution time
 * - 40% reduction in power consumption
 * - Improved tool selection accuracy
 *
 * Reference: "Less is More: Optimizing Function Calling for LLM Execution" (arXiv 2024)
 */

import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

/**
 * Tool relevance score
 */
interface ToolScore {
  tool: ChatCompletionFunctionTool;
  relevance: number;
  matchReasons: string[];
}

/**
 * Task context for tool filtering
 */
export interface TaskContext {
  /** The user's message/request */
  userMessage: string;

  /** Current file being worked on */
  currentFile?: string;

  /** File extensions in context */
  fileExtensions?: string[];

  /** Keywords extracted from context */
  keywords?: string[];

  /** Task type classification */
  taskType?: TaskType;

  /** Files mentioned in the conversation */
  mentionedFiles?: string[];

  /** Whether the task involves file operations */
  involvesFileOps?: boolean;

  /** Whether the task involves code execution */
  involvesExecution?: boolean;

  /** Whether the task involves search */
  involvesSearch?: boolean;
}

/**
 * Task type classifications
 */
export type TaskType =
  | "file_read"
  | "file_write"
  | "file_search"
  | "code_execution"
  | "code_analysis"
  | "refactoring"
  | "debugging"
  | "documentation"
  | "git_operations"
  | "testing"
  | "general";

/**
 * Tool category mappings
 */
const TOOL_CATEGORIES: Record<string, string[]> = {
  file_read: ["Read", "Glob", "Grep", "View"],
  file_write: ["Write", "Edit", "MultiEdit", "Patch"],
  file_search: ["Glob", "Grep", "Find", "Search", "Ripgrep"],
  code_execution: ["Bash", "Execute", "Run", "Shell"],
  code_analysis: ["Grep", "AST", "Symbols", "Analyze", "Dependencies"],
  refactoring: ["Edit", "MultiEdit", "Rename", "Refactor"],
  debugging: ["Bash", "Read", "Grep", "Debug", "Trace"],
  documentation: ["Read", "Write", "Markdown"],
  git_operations: ["Bash", "Git"],
  testing: ["Bash", "Test", "Jest", "Pytest"],
};

/**
 * Keywords that indicate specific tool needs
 */
const KEYWORD_TOOL_HINTS: Record<string, string[]> = {
  // File operations
  read: ["Read", "View"],
  write: ["Write", "Edit"],
  edit: ["Edit", "MultiEdit", "Patch"],
  create: ["Write"],
  delete: ["Bash", "Remove"],
  rename: ["Bash", "Move"],
  move: ["Bash", "Move"],
  copy: ["Bash", "Copy"],

  // Search operations
  find: ["Glob", "Grep", "Find"],
  search: ["Grep", "Glob", "Search"],
  grep: ["Grep"],
  locate: ["Glob", "Find"],

  // Execution
  run: ["Bash", "Execute"],
  execute: ["Bash", "Execute"],
  test: ["Bash", "Test"],
  build: ["Bash"],
  install: ["Bash"],
  npm: ["Bash"],
  yarn: ["Bash"],
  pip: ["Bash"],

  // Git
  git: ["Bash"],
  commit: ["Bash"],
  push: ["Bash"],
  pull: ["Bash"],
  branch: ["Bash"],
  merge: ["Bash"],

  // Code analysis
  analyze: ["AST", "Analyze", "Grep"],
  refactor: ["Edit", "MultiEdit", "Refactor"],
  debug: ["Bash", "Read", "Grep"],
  trace: ["Bash", "Debug"],
};

/**
 * Calculate relevance score for a tool given task context
 */
function scoreToolRelevance(
  tool: ChatCompletionFunctionTool,
  context: TaskContext
): ToolScore {
  const toolName = tool.function.name;
  const toolDescription = tool.function.description || "";
  const userMessage = context.userMessage.toLowerCase();

  let relevance = 0;
  const matchReasons: string[] = [];

  // 1. Direct tool name match in user message (highest weight)
  if (userMessage.includes(toolName.toLowerCase())) {
    relevance += 50;
    matchReasons.push("direct_name_match");
  }

  // 2. Task type matching
  if (context.taskType) {
    const categoryTools = TOOL_CATEGORIES[context.taskType] || [];
    if (categoryTools.some((t) => toolName.toLowerCase().includes(t.toLowerCase()))) {
      relevance += 30;
      matchReasons.push(`task_type:${context.taskType}`);
    }
  }

  // 3. Keyword matching
  for (const [keyword, hintedTools] of Object.entries(KEYWORD_TOOL_HINTS)) {
    if (userMessage.includes(keyword)) {
      if (hintedTools.some((t) => toolName.toLowerCase().includes(t.toLowerCase()))) {
        relevance += 20;
        matchReasons.push(`keyword:${keyword}`);
      }
    }
  }

  // 4. File extension matching for file-related tools
  if (context.fileExtensions && context.fileExtensions.length > 0) {
    const fileTools = ["Read", "Write", "Edit", "Glob", "Grep"];
    if (fileTools.some((t) => toolName.toLowerCase().includes(t.toLowerCase()))) {
      relevance += 15;
      matchReasons.push("file_context");
    }
  }

  // 5. Context-based boosts
  if (context.involvesFileOps) {
    const fileTools = ["Read", "Write", "Edit", "Glob", "MultiEdit"];
    if (fileTools.some((t) => toolName.toLowerCase().includes(t.toLowerCase()))) {
      relevance += 10;
      matchReasons.push("involves_file_ops");
    }
  }

  if (context.involvesExecution) {
    if (toolName.toLowerCase().includes("bash") || toolName.toLowerCase().includes("execute")) {
      relevance += 10;
      matchReasons.push("involves_execution");
    }
  }

  if (context.involvesSearch) {
    const searchTools = ["Grep", "Glob", "Find", "Search"];
    if (searchTools.some((t) => toolName.toLowerCase().includes(t.toLowerCase()))) {
      relevance += 10;
      matchReasons.push("involves_search");
    }
  }

  // 6. Description keyword matching
  const descriptionWords = toolDescription.toLowerCase().split(/\s+/);
  const messageWords = userMessage.split(/\s+/);
  const commonWords = messageWords.filter(
    (w) => descriptionWords.includes(w) && w.length > 3
  );
  if (commonWords.length > 0) {
    relevance += Math.min(commonWords.length * 5, 15);
    matchReasons.push(`description_match:${commonWords.length}`);
  }

  // 7. Essential tools always get a base score (never filter these completely)
  const essentialTools = ["Read", "Write", "Edit", "Bash", "Grep", "Glob"];
  if (essentialTools.some((t) => toolName.toLowerCase().includes(t.toLowerCase()))) {
    relevance = Math.max(relevance, 5);
    if (relevance === 5) {
      matchReasons.push("essential_tool");
    }
  }

  return { tool, relevance, matchReasons };
}

/**
 * Classify task type from context
 */
export function classifyTaskType(context: TaskContext): TaskType {
  const message = context.userMessage.toLowerCase();

  // Check for specific patterns
  if (/\b(read|show|display|view|cat)\b/.test(message)) {
    return "file_read";
  }
  if (/\b(write|create|save|add)\b/.test(message)) {
    return "file_write";
  }
  if (/\b(find|search|grep|locate)\b/.test(message)) {
    return "file_search";
  }
  if (/\b(run|execute|test|build|install)\b/.test(message)) {
    return "code_execution";
  }
  if (/\b(analyze|understand|explain)\b/.test(message)) {
    return "code_analysis";
  }
  if (/\b(refactor|rename|move|reorganize)\b/.test(message)) {
    return "refactoring";
  }
  if (/\b(debug|fix|error|bug)\b/.test(message)) {
    return "debugging";
  }
  if (/\b(document|readme|comment)\b/.test(message)) {
    return "documentation";
  }
  if (/\b(git|commit|push|pull|branch|merge)\b/.test(message)) {
    return "git_operations";
  }
  if (/\b(test|spec|jest|pytest|mocha)\b/.test(message)) {
    return "testing";
  }

  return "general";
}

/**
 * Extract keywords from user message
 */
export function extractKeywords(message: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "must", "shall",
    "can", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "as", "into", "through", "during", "before", "after",
    "above", "below", "between", "under", "again", "further",
    "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "just", "and", "but", "if", "or",
    "because", "until", "while", "this", "that", "these", "those",
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves",
    "you", "your", "yours", "yourself", "yourselves", "he", "him",
    "his", "himself", "she", "her", "hers", "herself", "it", "its",
    "itself", "they", "them", "their", "theirs", "themselves",
    "what", "which", "who", "whom", "please", "help", "want",
  ]);

  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Detect file operations in message
 */
export function detectFileOps(message: string): boolean {
  return /\b(file|read|write|edit|create|delete|modify|update|save|open)\b/i.test(message);
}

/**
 * Detect execution needs in message
 */
export function detectExecution(message: string): boolean {
  return /\b(run|execute|test|build|install|compile|npm|yarn|pip|make|bash|shell|command)\b/i.test(message);
}

/**
 * Detect search needs in message
 */
export function detectSearch(message: string): boolean {
  return /\b(find|search|grep|look|locate|where|which)\b/i.test(message);
}

/**
 * Build task context from user message
 */
export function buildTaskContext(
  userMessage: string,
  currentFile?: string,
  mentionedFiles?: string[]
): TaskContext {
  const context: TaskContext = {
    userMessage,
    currentFile,
    mentionedFiles,
    keywords: extractKeywords(userMessage),
    involvesFileOps: detectFileOps(userMessage),
    involvesExecution: detectExecution(userMessage),
    involvesSearch: detectSearch(userMessage),
  };

  // Extract file extensions from mentioned files
  if (mentionedFiles && mentionedFiles.length > 0) {
    context.fileExtensions = mentionedFiles
      .map((f) => f.split(".").pop()?.toLowerCase())
      .filter((ext): ext is string => !!ext);
  }

  // Classify task type
  context.taskType = classifyTaskType(context);

  return context;
}

/**
 * Filter tools based on task context
 *
 * Returns only the most relevant tools (default: top 10)
 */
export function filterTools(
  allTools: ChatCompletionFunctionTool[],
  context: TaskContext,
  maxTools: number = 10,
  minRelevance: number = 0
): ChatCompletionFunctionTool[] {
  // Score all tools
  const scoredTools = allTools.map((tool) => scoreToolRelevance(tool, context));

  // Sort by relevance
  scoredTools.sort((a, b) => b.relevance - a.relevance);

  // Filter by minimum relevance and take top N
  const filtered = scoredTools
    .filter((t) => t.relevance >= minRelevance)
    .slice(0, maxTools)
    .map((t) => t.tool);

  // If we filtered too aggressively, return essential tools
  if (filtered.length < 3) {
    const essentialTools = allTools.filter((t) => {
      const name = t.function.name.toLowerCase();
      return ["read", "write", "edit", "bash", "grep", "glob"].some((e) =>
        name.includes(e)
      );
    });
    return essentialTools.slice(0, maxTools);
  }

  return filtered;
}

/**
 * Get filtering statistics for debugging
 */
export function getFilteringStats(
  allTools: ChatCompletionFunctionTool[],
  context: TaskContext
): {
  totalTools: number;
  filteredCount: number;
  taskType: TaskType;
  topTools: Array<{ name: string; relevance: number; reasons: string[] }>;
} {
  const scoredTools = allTools
    .map((tool) => scoreToolRelevance(tool, context))
    .sort((a, b) => b.relevance - a.relevance);

  return {
    totalTools: allTools.length,
    filteredCount: scoredTools.filter((t) => t.relevance > 0).length,
    taskType: context.taskType || "general",
    topTools: scoredTools.slice(0, 10).map((t) => ({
      name: t.tool.function.name,
      relevance: t.relevance,
      reasons: t.matchReasons,
    })),
  };
}

export default {
  filterTools,
  buildTaskContext,
  classifyTaskType,
  extractKeywords,
  getFilteringStats,
};
