/**
 * Smart Hook System
 *
 * Extends the hook system with prompt-based and agent-based hooks.
 * Supports three hook types:
 * - command: runs shell commands and parses output
 * - prompt: evaluates LLM prompts with template rendering
 * - agent: spawns sub-agent with restricted tool access
 *
 * Also supports async hook execution with result tracking.
 */

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type SmartHookType = 'command' | 'prompt' | 'agent';

export interface SmartHookConfig {
  /** Hook type */
  type: SmartHookType;
  /** Event name this hook responds to */
  event: string;

  /** For type: 'command' - shell command to run */
  command?: string;

  /** For type: 'prompt' - LLM prompt template with {{input}} placeholders */
  prompt?: string;
  /** For type: 'prompt' - model to use for evaluation */
  model?: string;

  /** For type: 'agent' - agent system prompt */
  agentPrompt?: string;
  /** For type: 'agent' - tools available to the agent */
  agentTools?: string[];
  /** For type: 'agent' - maximum agent turns (default: 5) */
  maxTurns?: number;

  /** Run in background */
  async?: boolean;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
}

export interface SmartHookResult {
  /** Whether the hook succeeded */
  ok: boolean;
  /** Reason for failure */
  reason?: string;
  /** Hook output */
  output?: string;
  /** Execution duration in ms */
  duration?: number;
}

// ============================================================================
// SmartHookRunner
// ============================================================================

export class SmartHookRunner {
  private pendingResults: Map<string, SmartHookResult> = new Map();
  private pendingCount = 0;

  constructor() {
    logger.debug('SmartHookRunner initialized', { source: 'SmartHookRunner' });
  }

  /**
   * Run a hook synchronously and return result
   */
  async runHook(hook: SmartHookConfig, input: Record<string, any>): Promise<SmartHookResult> {
    const startTime = Date.now();

    try {
      let result: SmartHookResult;

      switch (hook.type) {
        case 'command':
          result = await this.runCommandHook(hook, input);
          break;
        case 'prompt':
          result = await this.runPromptHook(hook, input);
          break;
        case 'agent':
          result = await this.runAgentHook(hook, input);
          break;
        default:
          result = {
            ok: false,
            reason: `Unknown hook type: ${hook.type}`,
          };
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Run a command-type hook
   */
  private async runCommandHook(hook: SmartHookConfig, input: Record<string, any>): Promise<SmartHookResult> {
    if (!hook.command) {
      return { ok: false, reason: 'No command specified for command hook' };
    }

    const renderedCommand = this.renderTemplate(hook.command, input);
    const timeout = hook.timeout ?? 30000;

    return new Promise<SmartHookResult>((resolve) => {
      let timedOut = false;

      const child = spawn('/bin/sh', ['-c', renderedCommand], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HOOK_EVENT: hook.event,
          HOOK_INPUT: JSON.stringify(input),
        },
      });

      let stdout = '';
      let stderr = '';

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeout);

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);

        if (timedOut) {
          resolve({ ok: false, reason: 'Command hook timed out' });
          return;
        }

        if (code !== 0) {
          resolve({
            ok: false,
            reason: `Command exited with code ${code}: ${stderr.trim()}`,
            output: stdout.trim(),
          });
          return;
        }

        resolve({
          ok: true,
          output: stdout.trim(),
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({ ok: false, reason: error.message });
      });
    });
  }

  /**
   * Run a prompt-type hook (evaluates an LLM prompt template)
   */
  private async runPromptHook(hook: SmartHookConfig, input: Record<string, any>): Promise<SmartHookResult> {
    if (!hook.prompt) {
      return { ok: false, reason: 'No prompt specified for prompt hook' };
    }

    const renderedPrompt = this.renderTemplate(hook.prompt, input);

    // Stub implementation: in production this would call the LLM
    // For now, return the rendered prompt as output
    logger.debug(`Prompt hook evaluated: ${renderedPrompt.substring(0, 100)}`, { source: 'SmartHookRunner' });

    return {
      ok: true,
      output: renderedPrompt,
    };
  }

  /**
   * Run an agent-type hook (spawns a sub-agent)
   */
  private async runAgentHook(hook: SmartHookConfig, input: Record<string, any>): Promise<SmartHookResult> {
    if (!hook.agentPrompt) {
      return { ok: false, reason: 'No agent prompt specified for agent hook' };
    }

    const renderedPrompt = this.renderTemplate(hook.agentPrompt, input);
    const maxTurns = hook.maxTurns ?? 5;
    const tools = hook.agentTools ?? [];

    // Stub implementation: in production this would spawn a sub-agent
    logger.debug(`Agent hook evaluated with ${tools.length} tools, max ${maxTurns} turns`, { source: 'SmartHookRunner' });

    return {
      ok: true,
      output: `Agent evaluated: ${renderedPrompt.substring(0, 200)}`,
    };
  }

  /**
   * Render a template string by replacing {{key}} placeholders with input values
   */
  renderTemplate(template: string, input: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in input) {
        const value = input[key];
        return typeof value === 'string' ? value : JSON.stringify(value);
      }
      return match;
    });
  }

  /**
   * Run a hook asynchronously in the background
   */
  async runAsync(hook: SmartHookConfig, input: Record<string, any>): Promise<string> {
    const hookId = randomUUID();
    this.pendingCount++;

    // Fire and forget
    this.runHook(hook, input)
      .then((result) => {
        this.pendingResults.set(hookId, result);
        this.pendingCount--;
      })
      .catch((error) => {
        this.pendingResults.set(hookId, {
          ok: false,
          reason: error instanceof Error ? error.message : String(error),
        });
        this.pendingCount--;
      });

    return hookId;
  }

  /**
   * Get the result of an async hook by ID
   */
  getAsyncResult(hookId: string): SmartHookResult | null {
    return this.pendingResults.get(hookId) ?? null;
  }

  /**
   * Check if there are any pending async hooks
   */
  hasPendingHooks(): boolean {
    return this.pendingCount > 0;
  }

  /**
   * Get the number of pending async hooks
   */
  getPendingCount(): number {
    return this.pendingCount;
  }
}
