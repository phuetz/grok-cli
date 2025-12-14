/**
 * Integrations module - External service integrations (GitHub, IDE, JSON-RPC, MCP)
 *
 * Provides interfaces for external applications to integrate with code-buddy:
 * - GitHub: GitHub Actions workflow management
 * - IDE: IDE extensions (VS Code, Neovim, JetBrains)
 * - JSON-RPC: Standard JSON-RPC 2.0 over stdin/stdout
 * - MCP: Model Context Protocol for AI tool sharing
 */

export * from "./github-integration.js";
export * from "./github-actions.js";

// JSON-RPC Integration (for external process communication)
export * from "./json-rpc/index.js";

// MCP Integration (Model Context Protocol)
export * from "./mcp/index.js";

// Server runner (unified entry point for server modes)
export { runServer, parseServerArgs, isServerMode, printServerHelp, ServerMode, ServerRunnerOptions } from "./server-runner.js";

// IDE Protocol exports (primary definitions)
export {
  JSONRPCMessage,
  JSONRPCError,
  IDECapabilities,
  IDEState,
  Selection,
  Diagnostic as ProtocolDiagnostic,
  CodeAction as ProtocolCodeAction,
  CompletionItem as ProtocolCompletionItem,
  CompletionItemKind,
  TextEdit,
  WorkspaceEdit,
  Command,
  HoverInfo,
  MarkupContent,
  ErrorCodes,
  IDEProtocolServer,
  IDEProtocolClient,
  createIDEServer,
  createIDEClient,
} from "./ide-protocol.js";

// IDE Extensions exports (with renamed conflicting types)
export {
  IDEType,
  IDEConnection,
  IDERequest,
  IDEResponse,
  CompletionRequest,
  CompletionItem as ExtensionCompletionItem,
  DiagnosticRequest,
  Diagnostic as ExtensionDiagnostic,
  HoverRequest,
  HoverResult,
  CodeActionRequest,
  CodeAction as ExtensionCodeAction,
  IDEExtensionsConfig,
  IDEExtensionsServer,
  getIDEExtensionsServer,
  resetIDEExtensionsServer,
} from "./ide-extensions.js";
