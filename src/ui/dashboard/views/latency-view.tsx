/**
 * Latency View
 *
 * Performance and latency metrics:
 * - Average and P95 latency
 * - Target achievement rate
 * - First token latency (streaming)
 * - Latency by operation type
 * - Response time histogram
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../context/theme-context.js';
import { MetricCard, MetricRow } from '../components/metric-card.js';
import { Sparkline, Histogram, BarChart, ProgressRing } from '../components/mini-chart.js';
import { LATENCY_THRESHOLDS } from '../../../optimization/latency-optimizer.js';
import type { DashboardData } from '../hooks/use-dashboard-data.js';

export interface LatencyViewProps {
  data: DashboardData;
}

/**
 * Get status based on latency
 */
function getLatencyStatus(latency: number): 'success' | 'warning' | 'error' {
  if (latency <= LATENCY_THRESHOLDS.FAST) return 'success';
  if (latency <= LATENCY_THRESHOLDS.ACCEPTABLE) return 'warning';
  return 'error';
}

/**
 * Format milliseconds
 */
function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.round(ms)}ms`;
}

/**
 * Latency View Component
 */
export function LatencyView({ data }: LatencyViewProps) {
  const { colors } = useTheme();
  const { state: _state, latency, providers, responseTimeHistory } = data;

  // Get latency trend data
  const latencyTrend = responseTimeHistory.slice(-30).map((p) => p.value);

  // Prepare provider latency data for bar chart
  const providerLatencyData = providers
    .filter((p) => p.totalRequests > 0)
    .map((p) => ({
      label: `${p.provider}`.slice(0, 10),
      value: p.avgLatency,
      color: getLatencyStatus(p.avgLatency) === 'success'
        ? colors.success
        : getLatencyStatus(p.avgLatency) === 'warning'
          ? colors.warning
          : colors.error,
    }))
    .sort((a, b) => b.value - a.value);

  // Calculate latency distribution
  const latencyValues = responseTimeHistory.map((p) => p.value);

  // Get thresholds for display
  const thresholds = [
    { name: 'Instant', value: LATENCY_THRESHOLDS.INSTANT, color: colors.success },
    { name: 'Fast', value: LATENCY_THRESHOLDS.FAST, color: colors.success },
    { name: 'Acceptable', value: LATENCY_THRESHOLDS.ACCEPTABLE, color: colors.warning },
    { name: 'Slow', value: LATENCY_THRESHOLDS.SLOW, color: colors.warning },
    { name: 'Very Slow', value: LATENCY_THRESHOLDS.VERY_SLOW, color: colors.error },
  ];

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          ⚡ Latency Analysis
        </Text>
        <Text dimColor> • {latency.totalOperations} operations tracked</Text>
      </Box>

      {/* Key Metrics */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Performance Summary</Text>

          <Box marginTop={1}>
            <MetricRow gap={3}>
              <MetricCard
                icon="📊"
                label="Average"
                value={formatMs(latency.avgDuration)}
                status={getLatencyStatus(latency.avgDuration)}
              />
              <MetricCard
                icon="📈"
                label="P95"
                value={formatMs(latency.p95)}
                status={getLatencyStatus(latency.p95)}
              />
              <MetricCard
                icon="🎯"
                label="Target Met"
                value={`${latency.metTarget}%`}
                status={latency.metTarget >= 80 ? 'success' : latency.metTarget >= 50 ? 'warning' : 'error'}
              />
              <MetricCard
                icon="⏱"
                label="First Token"
                value={formatMs(latency.avgFirstToken)}
                status={getLatencyStatus(latency.avgFirstToken)}
              />
            </MetricRow>
          </Box>

          {/* Target achievement gauge */}
          <Box marginTop={1}>
            <Box width={15}>
              <Text color={colors.textMuted}>Target:</Text>
            </Box>
            <ProgressRing
              progress={latency.metTarget}
              size="medium"
              autoColor={true}
              showLabel={true}
            />
          </Box>
        </Box>
      </Box>

      {/* Latency by Provider */}
      {providerLatencyData.length > 0 && (
        <Box
          borderStyle="round"
          borderColor={colors.border}
          paddingX={1}
          paddingY={0}
          marginBottom={1}
        >
          <Box flexDirection="column">
            <Text bold color={colors.info}>Latency by Provider</Text>

            <Box marginTop={1}>
              <BarChart
                data={providerLatencyData}
                maxBarWidth={25}
                showValues={true}
                labelWidth={12}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Latency Trend */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Response Time Trend</Text>

          <Box marginTop={1}>
            {latencyTrend.length > 0 ? (
              <Sparkline
                data={latencyTrend}
                width={40}
                color={colors.primary}
                showLabels={true}
              />
            ) : (
              <Text dimColor>No latency data yet</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Latency Distribution */}
      {latencyValues.length > 5 && (
        <Box
          borderStyle="round"
          borderColor={colors.border}
          paddingX={1}
          paddingY={0}
          marginBottom={1}
        >
          <Box flexDirection="column">
            <Text bold color={colors.info}>Latency Distribution</Text>

            <Box marginTop={1}>
              <Histogram
                data={latencyValues}
                buckets={15}
                height={4}
                showLabels={true}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Thresholds Reference */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Latency Thresholds</Text>

          <Box marginTop={1} flexDirection="column">
            {thresholds.map((t, index) => (
              <Box key={index}>
                <Box width={12}>
                  <Text color={t.color}>{t.name}</Text>
                </Box>
                <Text dimColor>≤ {formatMs(t.value)}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default LatencyView;
