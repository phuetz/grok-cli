#!/usr/bin/env tsx
/**
 * Circular Dependency Detection Script
 *
 * Runs madge on the TypeScript source to find circular imports.
 * Used as part of `npm run validate` to prevent circular dependencies.
 *
 * Exit codes:
 *   0 - No circular dependencies found
 *   1 - Circular dependencies detected
 */

import madge from 'madge';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

// Known circular dependencies that are intentional or too costly to fix right now.
// Each entry is a sorted, JSON-stringified cycle array for stable comparison.
const KNOWN_CYCLES: string[] = [
  // Agent profiles ↔ operating modes (mutual type dependency)
  JSON.stringify(['agent/operating-modes.ts', 'agent/profiles/index.ts', 'agent/profiles/profile-loader.ts']),
  // Channel clients import from barrel which re-exports them
  JSON.stringify(['channels/discord/client.ts', 'channels/discord/index.ts', 'channels/index.ts']),
  JSON.stringify(['channels/index.ts', 'channels/slack/client.ts', 'channels/slack/index.ts']),
  JSON.stringify(['channels/index.ts', 'channels/telegram/client.ts', 'channels/telegram/index.ts']),
  JSON.stringify(['channels/index.ts', 'channels/webhook-server.ts']),
];

async function main() {
  const result = await madge(SRC, {
    fileExtensions: ['ts', 'tsx'],
    tsConfig: path.join(ROOT, 'tsconfig.json'),
    detectiveOptions: {
      ts: { skipTypeImports: true },
    },
  });

  const cycles = result.circular();

  if (cycles.length === 0) {
    console.log('✓ No circular dependencies found.');
    process.exit(0);
  }

  // Filter out known/accepted cycles
  const newCycles = cycles.filter(cycle => {
    const key = JSON.stringify([...cycle].sort());
    return !KNOWN_CYCLES.includes(key);
  });

  if (newCycles.length === 0) {
    console.log(`✓ ${cycles.length} known circular dependencies (all accepted).`);
    process.exit(0);
  }

  console.error(`✗ Found ${newCycles.length} circular dependencies:\n`);
  for (const cycle of newCycles) {
    console.error(`  ${cycle.join(' → ')} → ${cycle[0]}`);
  }

  console.error(`\nTo accept a cycle, add it to KNOWN_CYCLES in scripts/check-circular-deps.ts`);
  process.exit(1);
}

main().catch(err => {
  console.error('Failed to run circular dependency check:', err);
  process.exit(1);
});
