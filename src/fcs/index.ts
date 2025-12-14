/**
 * FileCommander Script (FCS) Module
 *
 * 100% compatible scripting language for FileCommander integration
 */

// Types
export * from './types.js';

// Lexer
export { FCSLexer, tokenize } from './lexer.js';

// Parser
export { FCSParser, parse } from './parser.js';

// Runtime
export { FCSRuntime, createRuntime } from './runtime.js';

// Builtins
export { createFCSBuiltins } from './builtins.js';

// Grok-CLI Bindings
export { createGrokBindings, setGrokClient, setMCPManager } from './grok-bindings.js';

// Convenience function to run FCS code
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { FCSRuntime } from './runtime.js';
import { FCSConfig, FCSResult } from './types.js';

/**
 * Execute FCS source code
 */
export async function executeFCS(
  source: string,
  config: Partial<FCSConfig> = {}
): Promise<FCSResult> {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  const runtime = new FCSRuntime(config);
  return runtime.execute(ast);
}

/**
 * Execute FCS file
 */
export async function executeFCSFile(
  filePath: string,
  config: Partial<FCSConfig> = {}
): Promise<FCSResult> {
  const fs = await import('fs');
  const source = fs.readFileSync(filePath, 'utf-8');
  return executeFCS(source, {
    workdir: config.workdir || (await import('path')).dirname(filePath),
    ...config,
  });
}

/**
 * Parse FCS source and return AST (for debugging/analysis)
 */
export function parseFCS(source: string) {
  const tokens = tokenize(source);
  return {
    tokens,
    ast: parse(tokens),
  };
}
