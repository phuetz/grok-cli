/**
 * Workflow Guard Middleware
 *
 * Detects tasks that require planning before acting (priority 45).
 * When the first user message contains 3+ distinct action verbs AND
 * there is no existing PLAN.md, emits a `steer` hint suggesting
 * the agent create a plan before diving into implementation.
 *
 * This resolves the plan-first vs bug-fix tension:
 * - Single-file fixes with 1-2 verbs: proceed directly
 * - Multi-verb, multi-file tasks: steer toward plan init
 *
 * Priority 45 — runs after cost-limit (10) and turn-limit (10),
 * but before most business logic middlewares (100+).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ConversationMiddleware, MiddlewareContext, MiddlewareResult } from './types.js';

// Action verbs that indicate non-trivial scope
const ACTION_VERBS = new Set([
  'create', 'add', 'implement', 'build', 'write',
  'fix', 'repair', 'resolve', 'debug', 'patch',
  'update', 'change', 'modify', 'edit', 'refactor',
  'test', 'verify', 'validate', 'check',
  'deploy', 'release', 'publish', 'push',
  'remove', 'delete', 'drop', 'clean',
  'migrate', 'upgrade', 'downgrade',
  'integrate', 'connect', 'setup', 'configure',
  'optimise', 'optimize', 'improve', 'enhance',
  'document', 'explain', 'analyse', 'analyze',
]);

function countDistinctActionVerbs(text: string): number {
  const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  const found = new Set<string>();
  for (const word of words) {
    // Check base form and common conjugations
    if (ACTION_VERBS.has(word)) found.add(word);
    // Strip trailing 's' for 3rd person singular (creates → create)
    else if (word.endsWith('s') && ACTION_VERBS.has(word.slice(0, -1))) found.add(word.slice(0, -1));
    // Strip 'ing' (creating → create)
    else if (word.endsWith('ing') && ACTION_VERBS.has(word.slice(0, -3))) found.add(word.slice(0, -3));
    // Strip 'ed' (created → create)
    else if (word.endsWith('ed') && ACTION_VERBS.has(word.slice(0, -2))) found.add(word.slice(0, -2));
  }
  return found.size;
}

function hasPlanFile(cwd: string): boolean {
  return (
    fs.existsSync(path.join(cwd, 'PLAN.md')) ||
    fs.existsSync(path.join(cwd, '.codebuddy', 'PLAN.md'))
  );
}

export class WorkflowGuardMiddleware implements ConversationMiddleware {
  readonly name = 'workflow-guard';
  readonly priority = 45;

  beforeTurn(context: MiddlewareContext): MiddlewareResult {
    // Only trigger on the very first turn (round 0) of a session
    if (context.toolRound !== 0) {
      return { action: 'continue' };
    }

    // Extract last user message
    const lastUser = [...context.messages]
      .reverse()
      .find(m => m.role === 'user');
    if (!lastUser) return { action: 'continue' };

    const text = typeof lastUser.content === 'string'
      ? lastUser.content
      : Array.isArray(lastUser.content)
        ? lastUser.content.map((c: unknown) => {
            if (typeof c === 'object' && c !== null && 'text' in c) {
              return (c as { text: string }).text;
            }
            return '';
          }).join(' ')
        : '';

    const verbCount = countDistinctActionVerbs(text);

    // Trigger if 3+ distinct action verbs and no plan file exists
    if (verbCount >= 3 && !hasPlanFile(process.cwd())) {
      return {
        action: 'warn',
        message: [
          `[workflow-guard] This task involves ${verbCount} distinct actions.`,
          'Consider initialising a plan first: call the `plan` tool with action="init"',
          'or create PLAN.md to break the work into verifiable steps before acting.',
          'Proceeding without a plan — but be mindful of the Verification Contract.',
        ].join(' '),
      };
    }

    return { action: 'continue' };
  }
}
