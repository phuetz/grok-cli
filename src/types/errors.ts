/**
 * Structured Error Types for Grok CLI
 *
 * @deprecated This module is deprecated. Use src/errors/index.ts instead.
 * This re-export exists only for backward compatibility and will be removed in a future version.
 */

// Log deprecation warning (only once per process)
const warned = new Set<string>();
if (!warned.has('types/errors')) {
  warned.add('types/errors');
  console.warn(
    '[DEPRECATED] Importing from "types/errors" is deprecated. ' +
    'Please update your imports to use "errors/index.js" instead.'
  );
}

export * from '../errors/index.js';