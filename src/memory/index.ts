/**
 * Memory System Exports
 *
 * Provides three memory subsystems:
 * - PersistentMemoryManager: Markdown-based project/user memories
 * - EnhancedMemory: SQLite-backed with embeddings and semantic search
 * - ProspectiveMemory: Task/goal management with triggers
 */

// Persistent Memory (markdown files)
export {
  PersistentMemoryManager,
  getMemoryManager,
  initializeMemory,
  type Memory,
  type MemoryCategory,
} from "./persistent-memory.js";

// Enhanced Memory (SQLite + embeddings)
export {
  EnhancedMemory,
  getEnhancedMemory,
  resetEnhancedMemory,
  type MemoryEntry,
  type MemoryType,
  type MemoryConfig,
  type ProjectMemory,
  type CodeConvention,
  type ConversationSummary,
  type UserProfile,
  type UserPreferences,
  type SkillLevel,
  type UserHistory,
  type MemorySearchOptions,
} from "./enhanced-memory.js";

// Prospective Memory (tasks, goals, reminders)
export {
  ProspectiveMemory,
  getProspectiveMemory,
  resetProspectiveMemory,
  initializeProspectiveMemory,
  type ProspectiveTask,
  type Goal,
  type Reminder,
  type TaskPriority,
  type TaskStatus,
  type TriggerType,
  type TaskTrigger,
  type TaskContext,
  type SubTask,
  type Milestone,
  type ProspectiveMemoryConfig,
} from "./prospective-memory.js";

// Auto-Capture (OpenClaw-inspired pattern detection)
export {
  AutoCaptureManager,
  getAutoCaptureManager,
  resetAutoCaptureManager,
  type CapturePattern,
  type CaptureResult,
  type AutoCaptureConfig,
  type MemoryRecallResult,
} from "./auto-capture.js";

// Memory Lifecycle Hooks (before/after execution)
export {
  MemoryLifecycleHooks,
  getMemoryLifecycleHooks,
  resetMemoryLifecycleHooks,
  type MemoryHookContext,
  type BeforeExecuteResult,
  type AfterResponseResult,
  type SessionEndResult,
  type MemoryLifecycleConfig,
} from "./memory-lifecycle-hooks.js";

// Semantic Memory Search
export {
  SemanticMemorySearch,
  getSemanticMemorySearch,
  resetSemanticMemorySearch,
  searchAndRetrieve,
  type SearchResult,
  type SearchOptions,
  type RetrievalOptions,
  type RetrievalResult,
  type MemorySearchConfig,
} from "./semantic-memory-search.js";
