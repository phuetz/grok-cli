/**
 * UI Components Index
 *
 * Central export for all UI components.
 */

// Core components
export { default as ChatInterface } from "./chat-interface.js";
export { ChatInput } from "./chat-input.js";
export { ChatHistory } from "./chat-history.js";
export { default as ConfirmationDialog } from "./confirmation-dialog.js";
export { LoadingSpinner } from "./loading-spinner.js";
export { DiffRenderer } from "./diff-renderer.js";
export { default as ApiKeyInput } from "./api-key-input.js";
export { ModelSelection } from "./model-selection.js";
export { CommandSuggestions } from "./command-suggestions.js";

// Enhanced components
export {
  MultiStepProgress,
  useStepProgress,
  type ProgressStep,
  type StepStatus,
} from "./multi-step-progress.js";

export {
  FuzzyPicker,
  MultiSelectPicker,
  type PickerItem,
} from "./fuzzy-picker.js";

export {
  EnhancedConfirmationDialog,
  type OperationType,
} from "./enhanced-confirmation-dialog.js";

export {
  EnhancedChatInput,
  useInputHistory,
} from "./enhanced-chat-input.js";

export {
  HelpSystem,
  DEFAULT_HELP_CONFIG,
  type HelpConfig,
  type CommandCategory,
  type CommandHelp,
  type KeyboardShortcut,
} from "./help-system.js";

// Accessibility components
export {
  SectionHeader,
  StatusWithText,
  AccessibleProgress,
  KeyboardShortcut as KeyboardShortcutDisplay,
  HelpPanel,
  AccessibleList,
  DefinitionList,
  Announcement,
  AccessibleError,
  AccessibleSuccess,
  AccessibleTable,
  AccessibleCodeBlock,
  Divider,
} from "./accessible-output.js";

// Progress and spinners
export {
  EnhancedSpinner,
  ProgressBar,
  StepProgress,
  StatusIndicator,
  CountdownTimer,
  TaskList,
  InfoPanel,
  DataTable,
  Badge,
  Divider as DividerLine,
  type SpinnerStyle,
} from "./enhanced-spinners.js";

// Error handling
export { ErrorBoundary, StreamingErrorBoundary } from "./error-boundary.js";

// Markdown rendering
export { MarkdownRenderer } from "../utils/markdown-renderer.js";
