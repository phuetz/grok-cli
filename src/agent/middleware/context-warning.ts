/**
 * Context Warning Middleware
 *
 * Replaces inline `contextManager.shouldWarn()` checks in the agent executor.
 *
 * @module agent/middleware
 */

import { ConversationMiddleware, MiddlewareContext, MiddlewareResult } from './types.js';
import { ContextManagerV2 } from '../../context/context-manager-v2.js';

export class ContextWarningMiddleware implements ConversationMiddleware {
  readonly name = 'context-warning';
  readonly priority = 30;

  constructor(private contextManager: ContextManagerV2) {}

  beforeTurn(context: MiddlewareContext): MiddlewareResult {
    const warning = this.contextManager.shouldWarn(context.messages);

    if (warning.warn) {
      return {
        action: 'warn',
        message: warning.message,
      };
    }

    return { action: 'continue' };
  }
}
