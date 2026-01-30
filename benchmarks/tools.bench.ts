#!/usr/bin/env npx tsx
/**
 * Tools Benchmark
 *
 * Measures and reports tool execution performance.
 * Run with: npx tsx benchmarks/tools.bench.ts
 *
 * Environment variables:
 * - BENCHMARK_RUNS: Number of runs per tool (default: 10)
 * - VERBOSE: Show detailed output (default: false)
 * - TOOLS: Comma-separated list of tools to benchmark (default: all)
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFile, readFile, mkdir, rm, stat } from 'fs/promises';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// ============================================================================
// Types
// ============================================================================

interface ToolResult {
  tool: string;
  runs: number;
  successful: number;
  times: number[];
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  cacheable: boolean;
  parallelizable: boolean;
}

interface BenchmarkResults {
  timestamp: Date;
  totalTools: number;
  results: ToolResult[];
  summary: {
    fastTools: string[];      // < 100ms
    mediumTools: string[];    // 100-500ms
    slowTools: string[];      // > 500ms
    cacheableCount: number;
    parallelizableCount: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const BENCHMARK_RUNS = parseInt(process.env.BENCHMARK_RUNS || '10', 10);
const VERBOSE = process.env.VERBOSE === 'true';
const TOOLS_FILTER = process.env.TOOLS?.split(',').map((t) => t.trim());

// Test directory for file operations
const TEST_DIR = join(ROOT_DIR, '.benchmark-test');

// ============================================================================
// Tool Definitions for Benchmarking
// ============================================================================

interface ToolBenchmark {
  name: string;
  execute: () => Promise<void>;
  cacheable: boolean;
  parallelizable: boolean;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

const TOOL_BENCHMARKS: ToolBenchmark[] = [
  // File read operations (fast, cacheable, parallelizable)
  {
    name: 'view_file',
    cacheable: true,
    parallelizable: true,
    async setup() {
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(
        join(TEST_DIR, 'test.txt'),
        'Test content\n'.repeat(100)
      );
    },
    async execute() {
      await readFile(join(TEST_DIR, 'test.txt'), 'utf-8');
    },
    async teardown() {
      await rm(TEST_DIR, { recursive: true, force: true });
    },
  },

  // File stat operation
  {
    name: 'file_stat',
    cacheable: true,
    parallelizable: true,
    async setup() {
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(join(TEST_DIR, 'stat-test.txt'), 'Content');
    },
    async execute() {
      await stat(join(TEST_DIR, 'stat-test.txt'));
    },
    async teardown() {
      await rm(TEST_DIR, { recursive: true, force: true });
    },
  },

  // File write operation (not cacheable, not parallelizable)
  {
    name: 'create_file',
    cacheable: false,
    parallelizable: false,
    async setup() {
      await mkdir(TEST_DIR, { recursive: true });
    },
    async execute() {
      const filename = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
      await writeFile(join(TEST_DIR, filename), 'Test content');
    },
    async teardown() {
      await rm(TEST_DIR, { recursive: true, force: true });
    },
  },

  // Directory listing
  {
    name: 'list_directory',
    cacheable: true,
    parallelizable: true,
    async execute() {
      const { readdir } = await import('fs/promises');
      await readdir(ROOT_DIR);
    },
  },

  // Git status (cacheable, parallelizable)
  {
    name: 'git_status',
    cacheable: true,
    parallelizable: true,
    async execute() {
      execSync('git status --porcelain', {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    },
  },

  // Git log
  {
    name: 'git_log',
    cacheable: true,
    parallelizable: true,
    async execute() {
      execSync('git log --oneline -10', {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    },
  },

  // Glob search
  {
    name: 'glob_search',
    cacheable: true,
    parallelizable: true,
    async execute() {
      const { glob } = await import('glob');
      await glob('**/*.ts', {
        cwd: join(ROOT_DIR, 'src'),
        ignore: ['node_modules/**'],
      });
    },
  },

  // Token counting
  {
    name: 'token_count',
    cacheable: true,
    parallelizable: true,
    async execute() {
      const { countTokens } = await import('../src/utils/token-counter.js');
      const text = 'Hello world! '.repeat(1000);
      countTokens(text);
    },
  },

  // JSON parsing (simulates tool args parsing)
  {
    name: 'json_parse',
    cacheable: false,
    parallelizable: true,
    async execute() {
      const data = JSON.stringify({
        path: '/some/file/path.ts',
        content: 'File content here\n'.repeat(100),
        options: {
          flag1: true,
          flag2: false,
          nested: { a: 1, b: 2, c: 3 },
        },
      });
      JSON.parse(data);
    },
  },

  // Bash command execution (simple)
  {
    name: 'bash_simple',
    cacheable: false,
    parallelizable: false,
    async execute() {
      execSync('echo "test"', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    },
  },

  // Bash command execution (with output)
  {
    name: 'bash_with_output',
    cacheable: false,
    parallelizable: false,
    async execute() {
      execSync('ls -la', {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    },
  },

  // String replace (simulates str_replace_editor)
  {
    name: 'string_replace',
    cacheable: false,
    parallelizable: false,
    async setup() {
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(
        join(TEST_DIR, 'replace-test.txt'),
        'const foo = 1;\nconst bar = 2;\nconst baz = 3;\n'.repeat(100)
      );
    },
    async execute() {
      const content = await readFile(join(TEST_DIR, 'replace-test.txt'), 'utf-8');
      const newContent = content.replace(/const foo = 1;/g, 'const foo = 42;');
      await writeFile(join(TEST_DIR, 'replace-test.txt'), newContent);
    },
    async teardown() {
      await rm(TEST_DIR, { recursive: true, force: true });
    },
  },
];

// ============================================================================
// Benchmark Functions
// ============================================================================

/**
 * Calculate percentile
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Run benchmark for a single tool
 */
async function benchmarkTool(tool: ToolBenchmark): Promise<ToolResult> {
  const times: number[] = [];
  let successful = 0;

  // Setup
  if (tool.setup) {
    await tool.setup();
  }

  // Warmup run
  try {
    await tool.execute();
  } catch {
    // Ignore warmup errors
  }

  // Benchmark runs
  for (let i = 0; i < BENCHMARK_RUNS; i++) {
    const startTime = process.hrtime.bigint();
    try {
      await tool.execute();
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms
      times.push(duration);
      successful++;
    } catch (error) {
      if (VERBOSE) {
        console.log(`    Run ${i + 1} failed: ${error}`);
      }
    }
  }

  // Teardown
  if (tool.teardown) {
    await tool.teardown();
  }

  // Calculate stats
  const sortedTimes = [...times].sort((a, b) => a - b);
  const avgTime = times.length > 0
    ? times.reduce((a, b) => a + b, 0) / times.length
    : 0;

  return {
    tool: tool.name,
    runs: BENCHMARK_RUNS,
    successful,
    times,
    avgTime,
    minTime: sortedTimes[0] || 0,
    maxTime: sortedTimes[sortedTimes.length - 1] || 0,
    p50: percentile(sortedTimes, 50),
    p95: percentile(sortedTimes, 95),
    cacheable: tool.cacheable,
    parallelizable: tool.parallelizable,
  };
}

/**
 * Test parallel execution performance
 */
async function benchmarkParallelExecution(): Promise<{
  sequential: number;
  parallel: number;
  speedup: number;
}> {
  const parallelTools = TOOL_BENCHMARKS.filter((t) => t.parallelizable);
  const testCount = Math.min(5, parallelTools.length);

  // Setup all tools
  for (const tool of parallelTools.slice(0, testCount)) {
    if (tool.setup) await tool.setup();
  }

  // Sequential execution
  const seqStart = Date.now();
  for (const tool of parallelTools.slice(0, testCount)) {
    await tool.execute();
  }
  const seqTime = Date.now() - seqStart;

  // Parallel execution
  const parStart = Date.now();
  await Promise.all(parallelTools.slice(0, testCount).map((t) => t.execute()));
  const parTime = Date.now() - parStart;

  // Teardown all tools
  for (const tool of parallelTools.slice(0, testCount)) {
    if (tool.teardown) await tool.teardown();
  }

  return {
    sequential: seqTime,
    parallel: parTime,
    speedup: seqTime / parTime,
  };
}

/**
 * Format results for display
 */
function formatResults(results: BenchmarkResults): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('================================================================');
  lines.push('  CODE BUDDY TOOLS BENCHMARK');
  lines.push('================================================================');
  lines.push('');
  lines.push(`  Tools Tested: ${results.totalTools}`);
  lines.push(`  Runs per Tool: ${BENCHMARK_RUNS}`);
  lines.push(`  Cacheable: ${results.summary.cacheableCount}`);
  lines.push(`  Parallelizable: ${results.summary.parallelizableCount}`);
  lines.push('');

  // Results table
  lines.push('  Tool Performance:');
  lines.push('  ' + '-'.repeat(70));
  lines.push('  ' + 'Tool'.padEnd(20) + 'Avg(ms)'.padStart(10) + 'p50(ms)'.padStart(10) +
             'p95(ms)'.padStart(10) + 'Cache'.padStart(8) + 'Parallel'.padStart(10));
  lines.push('  ' + '-'.repeat(70));

  // Sort by avg time
  const sorted = [...results.results].sort((a, b) => a.avgTime - b.avgTime);

  for (const result of sorted) {
    const cacheIcon = result.cacheable ? 'Yes' : '-';
    const parallelIcon = result.parallelizable ? 'Yes' : '-';

    lines.push(
      '  ' +
      result.tool.padEnd(20) +
      result.avgTime.toFixed(2).padStart(10) +
      result.p50.toFixed(2).padStart(10) +
      result.p95.toFixed(2).padStart(10) +
      cacheIcon.padStart(8) +
      parallelIcon.padStart(10)
    );
  }

  lines.push('  ' + '-'.repeat(70));
  lines.push('');

  // Performance categories
  if (results.summary.fastTools.length > 0) {
    lines.push(`  [FAST] (<100ms): ${results.summary.fastTools.join(', ')}`);
  }
  if (results.summary.mediumTools.length > 0) {
    lines.push(`  [MEDIUM] (100-500ms): ${results.summary.mediumTools.join(', ')}`);
  }
  if (results.summary.slowTools.length > 0) {
    lines.push(`  [SLOW] (>500ms): ${results.summary.slowTools.join(', ')}`);
  }

  lines.push('');
  lines.push('================================================================');

  return lines.join('\n');
}

// ============================================================================
// Main Benchmark
// ============================================================================

async function runBenchmark(): Promise<void> {
  console.log('');
  console.log('Code Buddy Tools Benchmark');
  console.log('==========================');
  console.log('');
  console.log(`Benchmark runs per tool: ${BENCHMARK_RUNS}`);
  console.log('');

  // Filter tools if specified
  let toolsToRun = TOOL_BENCHMARKS;
  if (TOOLS_FILTER && TOOLS_FILTER.length > 0) {
    toolsToRun = TOOL_BENCHMARKS.filter((t) =>
      TOOLS_FILTER.some((f) => t.name.includes(f))
    );
    console.log(`Running subset: ${toolsToRun.map((t) => t.name).join(', ')}`);
    console.log('');
  }

  // Run benchmarks
  const results: ToolResult[] = [];

  for (const tool of toolsToRun) {
    if (VERBOSE) {
      console.log(`Benchmarking ${tool.name}...`);
    } else {
      process.stdout.write(`  ${tool.name}... `);
    }

    try {
      const result = await benchmarkTool(tool);
      results.push(result);

      if (VERBOSE) {
        console.log(`  Avg: ${result.avgTime.toFixed(2)}ms, p50: ${result.p50.toFixed(2)}ms`);
      } else {
        console.log(`${result.avgTime.toFixed(2)}ms`);
      }
    } catch (error) {
      console.log(`FAILED: ${error}`);
      results.push({
        tool: tool.name,
        runs: BENCHMARK_RUNS,
        successful: 0,
        times: [],
        avgTime: 0,
        minTime: 0,
        maxTime: 0,
        p50: 0,
        p95: 0,
        cacheable: tool.cacheable,
        parallelizable: tool.parallelizable,
      });
    }
  }

  // Calculate summary
  const fastTools = results.filter((r) => r.avgTime < 100).map((r) => r.tool);
  const mediumTools = results.filter((r) => r.avgTime >= 100 && r.avgTime < 500).map((r) => r.tool);
  const slowTools = results.filter((r) => r.avgTime >= 500).map((r) => r.tool);

  const benchmarkResults: BenchmarkResults = {
    timestamp: new Date(),
    totalTools: results.length,
    results,
    summary: {
      fastTools,
      mediumTools,
      slowTools,
      cacheableCount: results.filter((r) => r.cacheable).length,
      parallelizableCount: results.filter((r) => r.parallelizable).length,
    },
  };

  // Display results
  console.log(formatResults(benchmarkResults));

  // Test parallel execution
  console.log('');
  console.log('Parallel Execution Test:');
  console.log('------------------------');

  const parallelResults = await benchmarkParallelExecution();
  console.log(`  Sequential: ${parallelResults.sequential}ms`);
  console.log(`  Parallel: ${parallelResults.parallel}ms`);
  console.log(`  Speedup: ${parallelResults.speedup.toFixed(2)}x`);
  console.log('');

  // Optimization recommendations
  console.log('Optimization Recommendations:');
  console.log('-----------------------------');

  if (slowTools.length > 0) {
    console.log(`  - Slow tools detected: ${slowTools.join(', ')}`);
    console.log('    Consider adding caching or optimizing these operations.');
  }

  const uncachedSlowTools = results.filter(
    (r) => r.avgTime >= 100 && !r.cacheable
  );
  if (uncachedSlowTools.length > 0) {
    console.log(`  - Uncached tools: ${uncachedSlowTools.map((r) => r.tool).join(', ')}`);
    console.log('    Consider if these could benefit from caching.');
  }

  if (parallelResults.speedup < 1.5) {
    console.log('  - Parallel execution speedup is low.');
    console.log('    Verify that parallelizable tools are being run concurrently.');
  }

  console.log('');

  // Save results to file
  const resultsPath = join(ROOT_DIR, '.benchmark-results.json');
  await writeFile(resultsPath, JSON.stringify(benchmarkResults, null, 2));
  console.log(`Results saved to: ${resultsPath}`);
}

// Run benchmark
runBenchmark().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
