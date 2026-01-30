#!/usr/bin/env npx tsx
/**
 * Startup Benchmark
 *
 * Measures and reports startup performance metrics for Code Buddy.
 * Run with: npx tsx benchmarks/startup.bench.ts
 *
 * Environment variables:
 * - WARMUP_RUNS: Number of warmup runs (default: 2)
 * - BENCHMARK_RUNS: Number of benchmark runs (default: 5)
 * - VERBOSE: Show detailed output (default: false)
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// ============================================================================
// Types
// ============================================================================

interface StartupResult {
  totalTime: number;
  initTime: number;
  helpTime: number;
  success: boolean;
  error?: string;
}

interface BenchmarkSummary {
  runs: number;
  successful: number;
  failed: number;
  totalTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    stdDev: number;
  };
  helpTime: {
    min: number;
    max: number;
    avg: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const WARMUP_RUNS = parseInt(process.env.WARMUP_RUNS || '2', 10);
const BENCHMARK_RUNS = parseInt(process.env.BENCHMARK_RUNS || '5', 10);
const VERBOSE = process.env.VERBOSE === 'true';
const CLI_PATH = join(ROOT_DIR, 'dist', 'index.js');

// ============================================================================
// Benchmark Functions
// ============================================================================

/**
 * Measure startup time by running --help
 */
async function measureStartup(): Promise<StartupResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const proc = spawn('node', [CLI_PATH, '--help'], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        GROK_API_KEY: 'benchmark-test-key', // Fake key to avoid prompts
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      resolve({
        totalTime: Date.now() - startTime,
        initTime: 0,
        helpTime: 0,
        success: false,
        error: error.message,
      });
    });

    proc.on('close', (code) => {
      const totalTime = Date.now() - startTime;
      const success = code === 0 && stdout.includes('codebuddy');

      resolve({
        totalTime,
        initTime: totalTime, // Simplified - init is most of startup
        helpTime: totalTime,
        success,
        error: success ? undefined : stderr || `Exit code: ${code}`,
      });
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      proc.kill();
      resolve({
        totalTime: 30000,
        initTime: 0,
        helpTime: 0,
        success: false,
        error: 'Timeout',
      });
    }, 30000);
  });
}

/**
 * Measure time to first output (version check)
 */
async function measureVersionCheck(): Promise<number> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const proc = spawn('node', [CLI_PATH, '--version'], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let gotOutput = false;

    proc.stdout.on('data', () => {
      if (!gotOutput) {
        gotOutput = true;
        const elapsed = Date.now() - startTime;
        proc.kill();
        resolve(elapsed);
      }
    });

    proc.on('close', () => {
      if (!gotOutput) {
        resolve(Date.now() - startTime);
      }
    });

    setTimeout(() => {
      proc.kill();
      resolve(30000);
    }, 30000);
  });
}

/**
 * Measure module import time
 */
async function measureModuleImports(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  // Modules to test
  const modules = [
    'commander',
    'openai',
    'react',
    'ink',
  ];

  for (const mod of modules) {
    const startTime = Date.now();
    try {
      await import(mod);
      results[mod] = Date.now() - startTime;
    } catch {
      results[mod] = -1; // Module not available
    }
  }

  return results;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[], avg: number): number {
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate summary statistics
 */
function calculateSummary(results: StartupResult[]): BenchmarkSummary {
  const successful = results.filter((r) => r.success);
  const times = successful.map((r) => r.totalTime).sort((a, b) => a - b);
  const helpTimes = successful.map((r) => r.helpTime).sort((a, b) => a - b);

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const helpAvg = helpTimes.reduce((a, b) => a + b, 0) / helpTimes.length;

  return {
    runs: results.length,
    successful: successful.length,
    failed: results.length - successful.length,
    totalTime: {
      min: times[0] || 0,
      max: times[times.length - 1] || 0,
      avg,
      p50: percentile(times, 50),
      p95: percentile(times, 95),
      stdDev: standardDeviation(times, avg),
    },
    helpTime: {
      min: helpTimes[0] || 0,
      max: helpTimes[helpTimes.length - 1] || 0,
      avg: helpAvg,
    },
  };
}

/**
 * Format summary for display
 */
function formatSummary(summary: BenchmarkSummary): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('================================================================');
  lines.push('  CODE BUDDY STARTUP BENCHMARK');
  lines.push('================================================================');
  lines.push('');
  lines.push(`  Runs: ${summary.successful}/${summary.runs} successful`);
  lines.push('');
  lines.push('  Startup Time (--help):');
  lines.push(`    Min:     ${summary.totalTime.min}ms`);
  lines.push(`    Max:     ${summary.totalTime.max}ms`);
  lines.push(`    Avg:     ${summary.totalTime.avg.toFixed(1)}ms`);
  lines.push(`    p50:     ${summary.totalTime.p50.toFixed(1)}ms`);
  lines.push(`    p95:     ${summary.totalTime.p95.toFixed(1)}ms`);
  lines.push(`    StdDev:  ${summary.totalTime.stdDev.toFixed(1)}ms`);
  lines.push('');

  // Performance rating
  const rating = getPerformanceRating(summary.totalTime.p50);
  lines.push(`  Performance: ${rating.emoji} ${rating.label}`);
  lines.push(`    ${rating.message}`);
  lines.push('');
  lines.push('================================================================');

  return lines.join('\n');
}

interface PerformanceRating {
  emoji: string;
  label: string;
  message: string;
}

function getPerformanceRating(p50: number): PerformanceRating {
  if (p50 < 200) {
    return {
      emoji: '[EXCELLENT]',
      label: 'Excellent',
      message: 'Startup time is excellent! Under 200ms.',
    };
  } else if (p50 < 500) {
    return {
      emoji: '[GOOD]',
      label: 'Good',
      message: 'Startup time is good. Under 500ms.',
    };
  } else if (p50 < 1000) {
    return {
      emoji: '[FAIR]',
      label: 'Fair',
      message: 'Startup time is acceptable but could be improved.',
    };
  } else if (p50 < 2000) {
    return {
      emoji: '[SLOW]',
      label: 'Slow',
      message: 'Startup time is slow. Consider optimizing imports.',
    };
  } else {
    return {
      emoji: '[CRITICAL]',
      label: 'Critical',
      message: 'Startup time is critically slow. Immediate optimization needed.',
    };
  }
}

// ============================================================================
// Main Benchmark
// ============================================================================

async function runBenchmark(): Promise<void> {
  console.log('');
  console.log('Code Buddy Startup Benchmark');
  console.log('============================');
  console.log('');
  console.log(`Warmup runs: ${WARMUP_RUNS}`);
  console.log(`Benchmark runs: ${BENCHMARK_RUNS}`);
  console.log('');

  // Check if CLI is built
  try {
    const { stat } = await import('fs/promises');
    await stat(CLI_PATH);
  } catch {
    console.error('Error: CLI not built. Run "npm run build" first.');
    process.exit(1);
  }

  // Warmup runs
  console.log('Running warmup...');
  for (let i = 0; i < WARMUP_RUNS; i++) {
    const result = await measureStartup();
    if (VERBOSE) {
      console.log(`  Warmup ${i + 1}: ${result.totalTime}ms`);
    }
  }

  // Benchmark runs
  console.log('Running benchmark...');
  const results: StartupResult[] = [];

  for (let i = 0; i < BENCHMARK_RUNS; i++) {
    const result = await measureStartup();
    results.push(result);

    if (VERBOSE) {
      const status = result.success ? 'OK' : 'FAIL';
      console.log(`  Run ${i + 1}: ${result.totalTime}ms [${status}]`);
    } else {
      process.stdout.write('.');
    }
  }

  if (!VERBOSE) {
    console.log('');
  }

  // Calculate and display summary
  const summary = calculateSummary(results);
  console.log(formatSummary(summary));

  // Additional metrics
  console.log('');
  console.log('Additional Metrics:');
  console.log('-------------------');

  // Version check time
  const versionTime = await measureVersionCheck();
  console.log(`  Version check (--version): ${versionTime}ms`);

  // Module import times
  console.log('');
  console.log('  Module Import Times:');
  const moduleResults = await measureModuleImports();
  for (const [mod, time] of Object.entries(moduleResults)) {
    if (time >= 0) {
      console.log(`    ${mod}: ${time}ms`);
    }
  }

  // Exit with error if benchmark failed
  if (summary.failed > 0) {
    console.log('');
    console.log(`Warning: ${summary.failed} benchmark run(s) failed`);
    process.exit(1);
  }

  // Exit with warning if performance is poor
  if (summary.totalTime.p50 >= 2000) {
    console.log('');
    console.log('Warning: Startup performance is critically slow');
    process.exit(1);
  }
}

// Run benchmark
runBenchmark().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
