/**
 * Streaming Module
 *
 * Comprehensive streaming utilities for handling async data streams
 * with support for transformations, backpressure, and error recovery.
 *
 * Key features:
 * - Per-chunk timeout handling for latency control
 * - Adaptive render throttling for smooth UI updates
 * - Detailed latency metrics with percentiles (p50/p95/p99)
 * - Flow hints for consumer feedback
 * - Native Node.js stream integration
 * - Backpressure handling for flow control
 */

export { StreamProcessor, StreamProcessorOptions } from './stream-processor.js';
export * from './types.js';
export {
  ChunkProcessor,
  ChunkTimeoutError,
  StreamingMetrics,
  OptimizedChunkProcessorOptions,
  FlowHint,
} from './chunk-processor.js';
export {
  StreamHandler,
  StreamHandlerOptions,
  ExtendedStreamStats,
} from './stream-handler.js';
export { ChunkHandler } from './chunk-handler.js';
export { StreamTransformer, TransformFunction } from './stream-transformer.js';
export { BackpressureController, BackpressureOptions } from './backpressure.js';

// Tool Phases
export type {
  ToolPhase,
  ToolPhaseEvent,
  ToolPhaseResult,
  ToolPhaseEvents,
} from './tool-phases.js';

export {
  ToolPhaseEmitter,
  ToolPhaseManager,
  getToolPhaseManager,
  resetToolPhaseManager,
} from './tool-phases.js';

// Tool Throttle
export type { ThrottleConfig } from './tool-throttle.js';

export {
  DEFAULT_THROTTLE_CONFIG,
  throttle,
  ToolPhaseThrottler,
  getToolPhaseThrottler,
  resetToolPhaseThrottler,
} from './tool-throttle.js';

// Progress Tracker
export type {
  ProgressStage,
  ProgressUpdate,
  ProgressTrackerConfig,
} from './progress-tracker.js';

export {
  ProgressTracker,
  createSimpleTracker,
  calculateIterationProgress,
} from './progress-tracker.js';

// Markdown Chunker
export type {
  BlockState,
  ChunkResult,
  MarkdownChunkerConfig,
} from './markdown-chunker.js';

export {
  DEFAULT_CHUNKER_CONFIG,
  createBlockState,
  detectFence,
  updateBlockState,
  MarkdownChunker,
  chunkMarkdown,
  hasUnclosedCodeBlock,
  countCodeBlocks,
  fixUnclosedCodeBlocks,
  createStreamingChunker,
} from './markdown-chunker.js';

// Retry Policy
export type {
  RetryConfig,
  RetryAttempt,
  RetryResult,
  CircuitBreakerConfig,
  CircuitState,
  CircuitBreakerStats,
  CircuitBreakerEvents,
  RetryManagerConfig,
} from './retry-policy.js';

export {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RETRY_MANAGER_CONFIG,
  calculateDelay,
  isRetryable,
  sleep,
  withTimeout,
  retry,
  retryOrThrow,
  CircuitBreaker,
  CircuitOpenError,
  RetryManager,
  getRetryManager,
  resetRetryManager,
  withRetry,
  withCircuitBreaker,
  withRetryAndCircuitBreaker,
} from './retry-policy.js';

// ============================================================================
// Tool Streaming Convenience Functions
// ============================================================================

import { getToolPhaseManager, ToolPhaseEmitter } from './tool-phases.js';
import { getToolPhaseThrottler } from './tool-throttle.js';
import type { ToolPhaseEvent } from './tool-phases.js';

/**
 * Create a streaming tool execution helper
 */
export function createToolStream(
  toolCallId: string,
  toolName: string,
  onPhase?: (event: ToolPhaseEvent) => void
): {
  emitter: ToolPhaseEmitter;
  start: (message?: string) => void;
  update: (progress: number, message?: string) => void;
  success: (output?: string, metadata?: Record<string, unknown>) => void;
  fail: (error: string, metadata?: Record<string, unknown>) => void;
  cleanup: () => void;
} {
  const manager = getToolPhaseManager();
  const throttler = getToolPhaseThrottler();
  const emitter = manager.createEmitter(toolCallId, toolName);

  // Set up throttled listener if callback provided
  if (onPhase) {
    throttler.setCallback(onPhase);
  }

  // Forward emitter events to throttler
  emitter.on('phase', (event: ToolPhaseEvent) => {
    throttler.push(event);
  });

  return {
    emitter,
    start(message?: string) {
      emitter.start(message);
    },
    update(progress: number, message?: string) {
      emitter.update(progress, message);
    },
    success(output?: string, metadata?: Record<string, unknown>) {
      emitter.result({
        success: true,
        output,
        metadata,
      });
    },
    fail(error: string, metadata?: Record<string, unknown>) {
      emitter.result({
        success: false,
        error,
        metadata,
      });
    },
    cleanup() {
      throttler.flushAll();
      manager.removeEmitter(toolCallId);
    },
  };
}

/**
 * Wrap an async operation with progress streaming
 */
export async function streamedOperation<T>(
  toolCallId: string,
  toolName: string,
  operation: (
    updateProgress: (progress: number, message?: string) => void
  ) => Promise<T>,
  onPhase?: (event: ToolPhaseEvent) => void
): Promise<T> {
  const stream = createToolStream(toolCallId, toolName, onPhase);

  stream.start();

  try {
    const result = await operation((progress, message) => {
      stream.update(progress, message);
    });

    stream.success(typeof result === 'string' ? result : JSON.stringify(result));
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stream.fail(errorMessage);
    throw error;
  } finally {
    stream.cleanup();
  }
}

/**
 * Stream progress for an array operation
 */
export async function streamedIteration<T, R>(
  toolCallId: string,
  toolName: string,
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  onPhase?: (event: ToolPhaseEvent) => void
): Promise<R[]> {
  const stream = createToolStream(toolCallId, toolName, onPhase);

  stream.start(`Processing ${items.length} items...`);

  const results: R[] = [];

  try {
    for (let i = 0; i < items.length; i++) {
      const progress = Math.round(((i + 1) / items.length) * 100);
      stream.update(progress, `Processing item ${i + 1}/${items.length}...`);

      const result = await processor(items[i], i);
      results.push(result);
    }

    stream.success(`Processed ${items.length} items`);
    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stream.fail(errorMessage);
    throw error;
  } finally {
    stream.cleanup();
  }
}
