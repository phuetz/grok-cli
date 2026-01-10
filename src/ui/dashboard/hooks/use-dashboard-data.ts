/**
 * Dashboard Data Hook
 *
 * Provides real-time data from MetricsCollector for the dashboard.
 * Updates periodically and exposes metrics, tools, providers, and errors.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMetricsCollector,
  type DashboardState,
  type ToolMetrics,
  type ProviderMetrics,
  type ErrorRecord,
  type MetricPoint,
} from '../../../observability/dashboard.js';
import {
  getLatencyOptimizer,
  getStreamingOptimizer,
} from '../../../optimization/latency-optimizer.js';

export interface LatencyStats {
  avgDuration: number;
  p95: number;
  metTarget: number;
  totalOperations: number;
  avgFirstToken: number;
  byOperation: Map<string, { avg: number; count: number }>;
}

export interface DashboardData {
  state: DashboardState;
  tools: ToolMetrics[];
  providers: ProviderMetrics[];
  errors: ErrorRecord[];
  latency: LatencyStats;
  tokenHistory: MetricPoint[];
  costHistory: MetricPoint[];
  responseTimeHistory: MetricPoint[];
  isConnected: boolean;
  lastUpdate: number;
}

export interface UseDashboardDataOptions {
  refreshInterval?: number;
  historyWindow?: number; // ms to look back for history
}

/**
 * Hook for accessing real-time dashboard data
 */
export function useDashboardData(options: UseDashboardDataOptions = {}): DashboardData {
  const { refreshInterval = 1000, historyWindow = 5 * 60 * 1000 } = options;

  const [data, setData] = useState<DashboardData>(() => getInitialData());
  const collectorRef = useRef(getMetricsCollector());

  const fetchData = useCallback(() => {
    const collector = collectorRef.current;
    const latencyOptimizer = getLatencyOptimizer();
    const streamingOptimizer = getStreamingOptimizer();

    const since = Date.now() - historyWindow;

    // Get latency stats by operation type
    const opStats = latencyOptimizer.getStats();
    const streamStats = streamingOptimizer.getStats();

    // Calculate per-operation latency from history
    const byOperation = new Map<string, { avg: number; count: number }>();
    const responseHistory = collector.getMetricHistory('response_time', since);
    for (const point of responseHistory) {
      const op = point.labels?.provider || 'unknown';
      const existing = byOperation.get(op) || { avg: 0, count: 0 };
      existing.avg = (existing.avg * existing.count + point.value) / (existing.count + 1);
      existing.count++;
      byOperation.set(op, existing);
    }

    setData({
      state: collector.getDashboardState(),
      tools: collector.getToolMetrics(),
      providers: collector.getProviderMetrics(),
      errors: collector.getRecentErrors(10),
      latency: {
        avgDuration: opStats.avgDuration,
        p95: opStats.p95,
        metTarget: opStats.totalOperations > 0
          ? Math.round((opStats.metTarget / opStats.totalOperations) * 100)
          : 0,
        totalOperations: opStats.totalOperations,
        avgFirstToken: streamStats.avgFirstToken,
        byOperation,
      },
      tokenHistory: collector.getMetricHistory('tokens_total', since),
      costHistory: collector.getMetricHistory('cost_total', since),
      responseTimeHistory: responseHistory,
      isConnected: true,
      lastUpdate: Date.now(),
    });
  }, [historyWindow]);

  // Set up periodic refresh
  useEffect(() => {
    fetchData(); // Initial fetch

    const interval = setInterval(fetchData, refreshInterval);

    // Listen for real-time events
    const collector = collectorRef.current;
    const handleMetric = () => fetchData();
    const handleTool = () => fetchData();
    const handleAPI = () => fetchData();
    const handleError = () => fetchData();

    collector.on('metric', handleMetric);
    collector.on('tool:executed', handleTool);
    collector.on('api:request', handleAPI);
    collector.on('error', handleError);

    return () => {
      clearInterval(interval);
      collector.off('metric', handleMetric);
      collector.off('tool:executed', handleTool);
      collector.off('api:request', handleAPI);
      collector.off('error', handleError);
    };
  }, [fetchData, refreshInterval]);

  return data;
}

/**
 * Get initial empty data
 */
function getInitialData(): DashboardData {
  return {
    state: {
      uptime: 0,
      activeSession: false,
      totalSessions: 0,
      totalTokens: 0,
      totalCost: 0,
      totalToolCalls: 0,
      avgResponseTime: 0,
      errorRate: 0,
      tokensPerMinute: 0,
      costPerHour: 0,
    },
    tools: [],
    providers: [],
    errors: [],
    latency: {
      avgDuration: 0,
      p95: 0,
      metTarget: 0,
      totalOperations: 0,
      avgFirstToken: 0,
      byOperation: new Map(),
    },
    tokenHistory: [],
    costHistory: [],
    responseTimeHistory: [],
    isConnected: false,
    lastUpdate: 0,
  };
}

export default useDashboardData;
