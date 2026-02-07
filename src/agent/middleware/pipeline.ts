/**
 * Middleware Pipeline
 *
 * Executes a sequence of ConversationMiddleware instances in priority order.
 * Short-circuits on 'stop' or 'compact' actions.
 *
 * @module agent/middleware
 */

import {
  ConversationMiddleware,
  MiddlewareContext,
  MiddlewareResult,
  MiddlewareAction,
} from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Manages and executes a pipeline of conversation middlewares.
 */
export class MiddlewarePipeline {
  private middlewares: ConversationMiddleware[] = [];

  /**
   * Register a middleware in the pipeline.
   * Middlewares are kept sorted by priority (lower first).
   */
  use(middleware: ConversationMiddleware): this {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    return this;
  }

  /**
   * Remove a middleware by name.
   */
  remove(name: string): boolean {
    const idx = this.middlewares.findIndex(m => m.name === name);
    if (idx !== -1) {
      this.middlewares.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Run all before_turn middlewares in priority order.
   * Short-circuits on 'stop' or 'compact'.
   */
  async runBeforeTurn(context: MiddlewareContext): Promise<MiddlewareResult> {
    return this.runPhase('beforeTurn', context);
  }

  /**
   * Run all after_turn middlewares in priority order.
   * Short-circuits on 'stop' or 'compact'.
   */
  async runAfterTurn(context: MiddlewareContext): Promise<MiddlewareResult> {
    return this.runPhase('afterTurn', context);
  }

  /**
   * Get list of registered middleware names.
   */
  getMiddlewareNames(): string[] {
    return this.middlewares.map(m => m.name);
  }

  private async runPhase(
    phase: 'beforeTurn' | 'afterTurn',
    context: MiddlewareContext
  ): Promise<MiddlewareResult> {
    const warnings: string[] = [];

    for (const middleware of this.middlewares) {
      const handler = middleware[phase];
      if (!handler) continue;

      try {
        const result = await handler.call(middleware, context);

        if (result.action === 'stop' || result.action === 'compact') {
          logger.debug(`Middleware "${middleware.name}" returned ${result.action} in ${phase}`);
          return result;
        }

        if (result.action === 'warn' && result.message) {
          warnings.push(result.message);
        }
      } catch (error) {
        logger.error(`Middleware "${middleware.name}" threw in ${phase}`, error as Error);
        // Don't let a failing middleware break the loop
      }
    }

    // If we collected warnings, return the last one as a warn action
    if (warnings.length > 0) {
      return { action: 'warn', message: warnings.join('\n') };
    }

    return { action: 'continue' };
  }
}
