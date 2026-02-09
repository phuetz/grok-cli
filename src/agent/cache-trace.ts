/**
 * Cache Trace Debugging (OpenClaw-inspired)
 *
 * Logs every stage of prompt construction for debugging
 * cache hit/miss issues and context building.
 *
 * Enable via CACHE_TRACE=true environment variable.
 */

import { logger } from '../utils/logger.js';

export type TraceStage =
  | 'session_loaded'
  | 'session_sanitized'
  | 'history_truncated'
  | 'system_prompt_built'
  | 'tools_selected'
  | 'context_compressed'
  | 'images_processed'
  | 'stream_started'
  | 'stream_completed'
  | 'post_run'
  | 'cache_hit'
  | 'cache_miss'
  | 'compaction_triggered'
  | 'compaction_completed';

export interface TraceEntry {
  stage: TraceStage;
  timestamp: number;
  durationMs?: number;
  tokenCount?: number;
  messageCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cache trace debugger.
 * Records timing and token counts at each stage of prompt construction.
 */
export class CacheTrace {
  private enabled: boolean;
  private entries: TraceEntry[] = [];
  private stageStartTimes: Map<string, number> = new Map();
  private sessionId: string;

  constructor(sessionId: string = 'default') {
    this.enabled = process.env.CACHE_TRACE === 'true' || process.env.CACHE_TRACE === '1';
    this.sessionId = sessionId;
  }

  /**
   * Record a trace entry for a completed stage.
   */
  trace(
    stage: TraceStage,
    metadata?: Record<string, unknown> & { tokenCount?: number; messageCount?: number },
  ): void {
    if (!this.enabled) return;

    const entry: TraceEntry = {
      stage,
      timestamp: Date.now(),
      tokenCount: metadata?.tokenCount,
      messageCount: metadata?.messageCount,
      metadata,
    };

    const startTime = this.stageStartTimes.get(stage);
    if (startTime) {
      entry.durationMs = Date.now() - startTime;
      this.stageStartTimes.delete(stage);
    }

    this.entries.push(entry);

    logger.debug(`[CacheTrace:${this.sessionId}] ${stage}`, {
      ...metadata,
      durationMs: entry.durationMs,
    });
  }

  /**
   * Mark the start of a stage (for duration tracking).
   */
  start(stage: TraceStage): void {
    if (!this.enabled) return;
    this.stageStartTimes.set(stage, Date.now());
  }

  /**
   * End a stage and record the trace with duration.
   */
  end(
    stage: TraceStage,
    metadata?: Record<string, unknown> & { tokenCount?: number; messageCount?: number },
  ): void {
    this.trace(stage, metadata);
  }

  /**
   * Get all trace entries.
   */
  getEntries(): TraceEntry[] {
    return [...this.entries];
  }

  /**
   * Get a summary of the trace.
   */
  getSummary(): string {
    if (!this.enabled || this.entries.length === 0) {
      return 'Cache trace: disabled or no entries';
    }

    const lines: string[] = [];
    lines.push(`Cache Trace [${this.sessionId}] — ${this.entries.length} stages`);
    lines.push('');

    const firstTs = this.entries[0].timestamp;
    for (const entry of this.entries) {
      const relativeMs = entry.timestamp - firstTs;
      const duration = entry.durationMs ? ` (${entry.durationMs}ms)` : '';
      const tokens = entry.tokenCount ? ` [${entry.tokenCount} tokens]` : '';
      const msgs = entry.messageCount ? ` [${entry.messageCount} msgs]` : '';
      lines.push(`  +${relativeMs}ms  ${entry.stage}${duration}${tokens}${msgs}`);
    }

    const totalMs = this.entries[this.entries.length - 1].timestamp - firstTs;
    lines.push('');
    lines.push(`  Total: ${totalMs}ms`);

    return lines.join('\n');
  }

  clear(): void {
    this.entries = [];
    this.stageStartTimes.clear();
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
