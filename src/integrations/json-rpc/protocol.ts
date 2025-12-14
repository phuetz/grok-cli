/**
 * JSON-RPC Protocol for code-buddy External Integration
 *
 * This protocol is designed for loose coupling - any client can use it.
 * No dependencies on FileCommander or any specific application.
 *
 * Transport: stdin/stdout (line-delimited JSON)
 * Protocol: JSON-RPC 2.0
 */

// ============================================
// JSON-RPC 2.0 Base Types
// ============================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// ============================================
// Error Codes (JSON-RPC 2.0 + Custom)
// ============================================

export const ErrorCodes = {
  // JSON-RPC 2.0 standard errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // Custom errors (application-specific: -32000 to -32099)
  NOT_INITIALIZED: -32001,
  OPERATION_CANCELLED: -32002,
  TIMEOUT: -32003,
  FILE_NOT_FOUND: -32004,
  PERMISSION_DENIED: -32005,
  AI_ERROR: -32006,
  TOOL_ERROR: -32007,
} as const;

// ============================================
// Server Capabilities
// ============================================

export interface ServerCapabilities {
  version: string;
  methods: string[];
  features: {
    ai: boolean;
    tools: boolean;
    fcs: boolean;
    streaming: boolean;
  };
}

// ============================================
// Method: initialize
// ============================================

export interface InitializeParams {
  clientName: string;
  clientVersion: string;
  capabilities?: {
    streaming?: boolean;
  };
}

export interface InitializeResult {
  serverName: string;
  serverVersion: string;
  capabilities: ServerCapabilities;
}

// ============================================
// Method: ai/complete
// ============================================

export interface AiCompleteParams {
  prompt: string;
  context?: {
    file?: string;
    language?: string;
    prefix?: string;
    suffix?: string;
  };
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  };
}

export interface AiCompleteResult {
  text: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Method: ai/chat
// ============================================

export interface AiChatParams {
  message: string;
  conversationId?: string;
  context?: string[];
}

export interface AiChatResult {
  response: string;
  conversationId: string;
  model: string;
}

// ============================================
// Method: tools/list
// ============================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
    required?: string[];
  };
}

export interface ToolsListResult {
  tools: ToolDefinition[];
}

// ============================================
// Method: tools/call
// ============================================

export interface ToolsCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolsCallResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// ============================================
// Method: fcs/execute
// ============================================

export interface FcsExecuteParams {
  script: string;
  config?: {
    workdir?: string;
    timeout?: number;
    dryRun?: boolean;
  };
}

export interface FcsExecuteResult {
  success: boolean;
  output: string[];
  returnValue?: unknown;
  error?: string;
  duration: number;
}

// ============================================
// Method: fcs/parse
// ============================================

export interface FcsParseParams {
  script: string;
}

export interface FcsParseResult {
  valid: boolean;
  ast?: unknown;
  errors?: Array<{
    line: number;
    column: number;
    message: string;
  }>;
}

// ============================================
// Method: context/add
// ============================================

export interface ContextAddParams {
  files: string[];
}

export interface ContextAddResult {
  added: string[];
  failed: Array<{
    file: string;
    reason: string;
  }>;
  totalSize: number;
}

// ============================================
// Method: context/list
// ============================================

export interface ContextListResult {
  files: Array<{
    path: string;
    size: number;
  }>;
  totalSize: number;
}

// ============================================
// Method: context/clear
// ============================================

export interface ContextClearResult {
  cleared: number;
}

// ============================================
// Notifications (Server -> Client)
// ============================================

export interface ProgressNotification {
  taskId: string;
  progress: number; // 0-100
  message?: string;
}

export interface OutputNotification {
  stream: 'stdout' | 'stderr';
  text: string;
}

export interface LogNotification {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

// ============================================
// All Methods Map
// ============================================

export type MethodMap = {
  'initialize': { params: InitializeParams; result: InitializeResult };
  'shutdown': { params: undefined; result: null };

  'ai/complete': { params: AiCompleteParams; result: AiCompleteResult };
  'ai/chat': { params: AiChatParams; result: AiChatResult };
  'ai/clearHistory': { params: { conversationId?: string }; result: { cleared: boolean } };

  'tools/list': { params: undefined; result: ToolsListResult };
  'tools/call': { params: ToolsCallParams; result: ToolsCallResult };

  'fcs/execute': { params: FcsExecuteParams; result: FcsExecuteResult };
  'fcs/parse': { params: FcsParseParams; result: FcsParseResult };

  'context/add': { params: ContextAddParams; result: ContextAddResult };
  'context/list': { params: undefined; result: ContextListResult };
  'context/clear': { params: undefined; result: ContextClearResult };

  'git/status': { params: undefined; result: { status: string; branch: string } };
  'git/diff': { params: { staged?: boolean }; result: { diff: string } };
};

// ============================================
// Helper Functions
// ============================================

export function createRequest<M extends keyof MethodMap>(
  id: string | number,
  method: M,
  params?: MethodMap[M]['params']
): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params: params as Record<string, unknown>,
  };
}

export function createResponse<T>(
  id: string | number,
  result: T
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

export function createErrorResponse(
  id: string | number,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  };
}

export function createNotification(
  method: string,
  params?: Record<string, unknown>
): JsonRpcNotification {
  return {
    jsonrpc: '2.0',
    method,
    params,
  };
}

export function isRequest(msg: unknown): msg is JsonRpcRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'jsonrpc' in msg &&
    (msg as JsonRpcRequest).jsonrpc === '2.0' &&
    'method' in msg &&
    'id' in msg
  );
}

export function isNotification(msg: unknown): msg is JsonRpcNotification {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'jsonrpc' in msg &&
    (msg as JsonRpcNotification).jsonrpc === '2.0' &&
    'method' in msg &&
    !('id' in msg)
  );
}
