/**
 * Turn Limit Middleware
 *
 * Replaces inline `toolRounds >= maxToolRounds` checks in the agent executor.
 *
 * @module agent/middleware
 */

import { ConversationMiddleware, MiddlewareContext, MiddlewareResult } from './types.js';

export class TurnLimitMiddleware implements ConversationMiddleware {
  readonly name = 'turn-limit';
  readonly priority = 10;

  beforeTurn(context: MiddlewareContext): MiddlewareResult {
    if (context.toolRound >= context.maxToolRounds) {
      return {
        action: 'stop',
        message: 'Maximum tool execution rounds reached. Stopping to prevent infinite loops.',
      };
    }

    // Warn at 80% of limit
    const threshold = Math.floor(context.maxToolRounds * 0.8);
    if (context.toolRound === threshold) {
      return {
        action: 'warn',
        message: `Approaching tool round limit (${context.toolRound}/${context.maxToolRounds}).`,
      };
    }

    return { action: 'continue' };
  }
}
