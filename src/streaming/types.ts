import { CodeBuddyToolCall } from '../codebuddy/client.js';
import { ToolResult } from '../types/index.js';

export type StreamEventType =
  | 'content'
  | 'tool_call'
  | 'tool_result'
  | 'token_count'
  | 'error'
  | 'done';

/**
 * Delta content from a streaming chunk
 */
export interface StreamDelta {
  content?: string | null;
  tool_calls?: Array<{
    index: number;
    id?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

/**
 * Choice structure in streaming response
 */
export interface StreamChoice {
  delta?: StreamDelta;
  index?: number;
  finish_reason?: string | null;
}

/**
 * Streaming chunk from the API
 * Compatible with OpenAI ChatCompletionChunk format
 */
export interface StreamChunk {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: StreamChoice[];
}

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  toolCall?: CodeBuddyToolCall;
  toolCalls?: CodeBuddyToolCall[];
  toolResult?: ToolResult;
  tokenCount?: number;
  error?: string;
}

export interface StreamStats {
  chunkCount: number;
  contentLength: number;
  toolCallCount: number;
  startTime: number;
  duration?: number;
}

export interface ChunkProcessorOptions {
  /** Sanitize content to remove LLM control tokens */
  sanitize?: boolean;
  /** Automatically extract commentary-style tool calls */
  extractCommentaryTools?: boolean;
}
