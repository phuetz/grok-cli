/**
 * Overview View
 *
 * Main dashboard view showing key metrics at a glance:
 * - Session status and uptime
 * - Token usage and cost summary
 * - Error rate and response time
 * - Quick activity indicators
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../context/theme-context.js';
import { MetricCard, MetricRow } from '../components/metric-card.js';
import { Sparkline, ProgressRing } from '../components/mini-chart.js';
import type { DashboardData } from '../hooks/use-dashboard-data.js';

export interface OverviewViewProps {
  data: DashboardData;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format cost
 */
function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Overview View Component
 */
export function OverviewView({ data }: OverviewViewProps) {
  const { colors } = useTheme();
  const { state, tokenHistory, responseTimeHistory, errors } = data;

  // Determine status colors
  const getErrorStatus = (rate: number) => {
    if (rate === 0) return 'success';
    if (rate < 5) return 'warning';
    return 'error';
  };

  const getCostStatus = (cost: number) => {
    if (cost < 1) return 'success';
    if (cost < 5) return 'warning';
    return 'error';
  };

  // Extract recent values for sparklines
  const recentTokens = tokenHistory.slice(-20).map((p) => p.value);
  const recentLatency = responseTimeHistory.slice(-20).map((p) => p.value);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          📊 Dashboard Overview
        </Text>
        <Text dimColor> • Updated {new Date(data.lastUpdate).toLocaleTimeString()}</Text>
      </Box>

      {/* Session Status */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Box justifyContent="space-between" marginBottom={1}>
            <Box>
              <Text color={state.activeSession ? colors.success : colors.textMuted}>
                {state.activeSession ? '● Active' : '○ Idle'}
              </Text>
              <Text dimColor> • Uptime: {formatDuration(state.uptime)}</Text>
            </Box>
            <Box>
              <Text dimColor>Sessions: {state.totalSessions}</Text>
            </Box>
          </Box>

          {/* Key Metrics Row */}
          <MetricRow gap={4}>
            <MetricCard
              icon="🎯"
              label="Total Tokens"
              value={state.totalTokens.toLocaleString()}
              detail={`${state.tokensPerMinute.toFixed(0)}/min`}
              status="neutral"
            />
            <MetricCard
              icon="💰"
              label="Total Cost"
              value={formatCost(state.totalCost)}
              detail={`${formatCost(state.costPerHour)}/hr`}
              status={getCostStatus(state.totalCost)}
            />
            <MetricCard
              icon="🔧"
              label="Tool Calls"
              value={state.totalToolCalls.toString()}
              status="neutral"
            />
            <MetricCard
              icon="⚡"
              label="Avg Response"
              value={`${Math.round(state.avgResponseTime)}ms`}
              status={state.avgResponseTime > 2000 ? 'warning' : 'success'}
            />
          </MetricRow>
        </Box>
      </Box>

      {/* Activity Charts */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Activity</Text>

          {/* Token Trend */}
          <Box marginTop={1}>
            <Box width={15}>
              <Text color={colors.textMuted}>Tokens:</Text>
            </Box>
            {recentTokens.length > 0 ? (
              <Sparkline data={recentTokens} width={30} color={colors.primary} />
            ) : (
              <Text dimColor>No data yet</Text>
            )}
          </Box>

          {/* Latency Trend */}
          <Box>
            <Box width={15}>
              <Text color={colors.textMuted}>Latency:</Text>
            </Box>
            {recentLatency.length > 0 ? (
              <Sparkline data={recentLatency} width={30} color={colors.warning} />
            ) : (
              <Text dimColor>No data yet</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Error Status */}
      <Box
        borderStyle="round"
        borderColor={errors.length > 0 ? colors.error : colors.border}
        paddingX={1}
        paddingY={0}
      >
        <Box flexDirection="column">
          <Box justifyContent="space-between">
            <Box>
              <Text bold color={colors.info}>Error Rate</Text>
            </Box>
            <Box>
              <ProgressRing
                progress={state.errorRate}
                size="small"
                autoColor={true}
              />
            </Box>
          </Box>

          {errors.length > 0 ? (
            <Box marginTop={1} flexDirection="column">
              <Text color={colors.warning}>Recent Errors ({errors.length}):</Text>
              {errors.slice(0, 3).map((error, index) => (
                <Box key={index}>
                  <Text dimColor>• </Text>
                  <Text color={colors.error}>{error.type}: </Text>
                  <Text dimColor>{error.message.slice(0, 40)}</Text>
                </Box>
              ))}
            </Box>
          ) : (
            <Box>
              <Text color={colors.success}>✓ No errors</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default OverviewView;
