/**
 * Optimization Module
 *
 * Research-based optimizations for LLM-powered CLI applications.
 * Implements findings from 2024-2025 scientific publications.
 *
 * Key Optimizations:
 * - Dynamic Tool Filtering (Less-is-More): 70% execution time reduction
 * - Model Tier Routing (FrugalGPT): 30-70% cost reduction
 * - Parallel Tool Execution (LLMCompiler): 2.5-4.6x speedup
 * - Latency Optimization: Sub-500ms for flow state preservation
 */

// Tool Filtering
export {
  filterTools,
  buildTaskContext,
  classifyTaskType,
  extractKeywords,
  getFilteringStats,
  type TaskContext,
  type TaskType,
} from "./tool-filtering.js";

// Model Routing
export {
  ModelRouter,
  getModelRouter,
  initializeModelRouter,
  classifyTaskComplexity,
  selectModel,
  calculateCost,
  getCostComparison,
  GROK_MODELS,
  DEFAULT_ROUTING_CONFIG,
  type ModelTier,
  type ModelConfig,
  type TaskComplexity,
  type RoutingDecision,
  type RoutingConfig,
} from "./model-routing.js";

// Parallel Execution
export {
  ParallelExecutor,
  groupByDependency,
  analyzeDependencies,
  estimateSpeedup,
  createParallelExecutor,
  DEFAULT_EXECUTION_OPTIONS,
  type ToolCall,
  type ToolResult,
  type ExecutionGroup,
  type ExecutionOptions,
  type ToolExecutor,
} from "./parallel-executor.js";

// Latency Optimization
export {
  LatencyOptimizer,
  StreamingOptimizer,
  getLatencyOptimizer,
  getStreamingOptimizer,
  measureLatency,
  precompute,
  LATENCY_THRESHOLDS,
  OPERATION_TARGETS,
  type LatencyMeasurement,
} from "./latency-optimizer.js";

/**
 * Initialize all optimizations with default settings
 */
export function initializeOptimizations(config?: {
  enableToolFiltering?: boolean;
  enableModelRouting?: boolean;
  enableLatencyTracking?: boolean;
  modelRoutingConfig?: Partial<import("./model-routing.js").RoutingConfig>;
}): {
  modelRouter: import("./model-routing.js").ModelRouter;
  latencyOptimizer: import("./latency-optimizer.js").LatencyOptimizer;
} {
  const { initializeModelRouter } = require("./model-routing.js");
  const { getLatencyOptimizer } = require("./latency-optimizer.js");

  const modelRouter = initializeModelRouter(config?.modelRoutingConfig || {});
  const latencyOptimizer = getLatencyOptimizer();

  return { modelRouter, latencyOptimizer };
}

/**
 * Get optimization summary/report
 */
export async function getOptimizationReport(): Promise<{
  toolFiltering: { enabled: boolean };
  modelRouting: {
    enabled: boolean;
    totalCost: number;
    savings: { saved: number; percentage: number };
  };
  latency: {
    totalOperations: number;
    metTarget: number;
    p50: number;
    p95: number;
  };
  parallelExecution: {
    estimatedSpeedup: number;
  };
}> {
  const { getModelRouter } = await import("./model-routing.js");
  const { getLatencyOptimizer } = await import("./latency-optimizer.js");

  const modelRouter = getModelRouter();
  const latencyOptimizer = getLatencyOptimizer();

  const routerConfig = modelRouter.getConfig();
  const latencyStats = latencyOptimizer.getStats();

  return {
    toolFiltering: {
      enabled: true, // Always enabled when used
    },
    modelRouting: {
      enabled: routerConfig.enabled,
      totalCost: modelRouter.getTotalCost(),
      savings: modelRouter.getEstimatedSavings(),
    },
    latency: {
      totalOperations: latencyStats.totalOperations,
      metTarget: latencyStats.metTarget,
      p50: latencyStats.p50,
      p95: latencyStats.p95,
    },
    parallelExecution: {
      estimatedSpeedup: 2.5, // Average from research
    },
  };
}
