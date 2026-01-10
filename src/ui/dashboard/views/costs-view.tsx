/**
 * Costs View
 *
 * Detailed cost breakdown and budget tracking:
 * - Total cost and budget progress
 * - Cost by provider/model
 * - Token usage breakdown
 * - Cost trends over time
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../context/theme-context.js';
import { MetricCard, MetricRow } from '../components/metric-card.js';
import { BarChart, Sparkline, ProgressRing } from '../components/mini-chart.js';
import type { DashboardData } from '../hooks/use-dashboard-data.js';

export interface CostsViewProps {
  data: DashboardData;
  budget?: number;
}

/**
 * Format cost
 */
function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.001) return `$${(cost * 10000).toFixed(2)}×10⁻⁴`;
  if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count
 */
function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

/**
 * Costs View Component
 */
export function CostsView({ data, budget = 10 }: CostsViewProps) {
  const { colors } = useTheme();
  const { state, providers, costHistory } = data;

  // Calculate budget progress
  const budgetProgress = budget > 0 ? (state.totalCost / budget) * 100 : 0;
  const budgetStatus = budgetProgress < 50 ? 'success' : budgetProgress < 80 ? 'warning' : 'error';

  // Sort providers by cost
  const sortedProviders = [...providers].sort((a, b) => b.totalCost - a.totalCost);

  // Prepare chart data
  const providerCostData = sortedProviders.slice(0, 5).map((p) => ({
    label: `${p.provider}/${p.model}`.slice(0, 14),
    value: p.totalCost,
    color: colors.primary,
  }));

  // Token breakdown
  const totalPromptTokens = providers.reduce((sum, p) => sum + p.promptTokens, 0);
  const totalCompletionTokens = providers.reduce((sum, p) => sum + p.completionTokens, 0);

  // Cost history for sparkline
  const recentCosts = costHistory.slice(-30).map((p) => p.value);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          💰 Cost Analysis
        </Text>
        <Text dimColor> • Budget: {formatCost(budget)}</Text>
      </Box>

      {/* Budget Progress */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Budget Status</Text>

          <Box marginTop={1} justifyContent="space-between">
            <Box flexDirection="column" width="60%">
              <Box>
                <Box width={12}>
                  <Text color={colors.textMuted}>Spent:</Text>
                </Box>
                <Text bold color={budgetStatus === 'error' ? colors.error : budgetStatus === 'warning' ? colors.warning : colors.success}>
                  {formatCost(state.totalCost)}
                </Text>
                <Text dimColor> / {formatCost(budget)}</Text>
              </Box>

              <Box>
                <Box width={12}>
                  <Text color={colors.textMuted}>Remaining:</Text>
                </Box>
                <Text color={colors.success}>
                  {formatCost(Math.max(0, budget - state.totalCost))}
                </Text>
              </Box>

              <Box>
                <Box width={12}>
                  <Text color={colors.textMuted}>Rate:</Text>
                </Box>
                <Text>{formatCost(state.costPerHour)}/hr</Text>
              </Box>
            </Box>

            <Box flexDirection="column" alignItems="center" width="40%">
              <ProgressRing
                progress={Math.min(100, budgetProgress)}
                size="large"
                autoColor={true}
                showLabel={true}
              />
              <Text dimColor>of budget used</Text>
            </Box>
          </Box>

          {/* Budget warnings */}
          {budgetProgress > 80 && (
            <Box marginTop={1}>
              <Text color={colors.error}>
                ⚠ Warning: {budgetProgress >= 100 ? 'Budget exceeded!' : 'Approaching budget limit'}
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Cost by Provider */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Cost by Provider</Text>

          {providerCostData.length > 0 ? (
            <Box marginTop={1}>
              <BarChart
                data={providerCostData}
                maxBarWidth={25}
                showValues={true}
                labelWidth={16}
              />
            </Box>
          ) : (
            <Text dimColor>No provider data yet</Text>
          )}
        </Box>
      </Box>

      {/* Token Breakdown */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Token Usage</Text>

          <Box marginTop={1}>
            <MetricRow gap={4}>
              <MetricCard
                icon="📥"
                label="Input Tokens"
                value={formatTokens(totalPromptTokens)}
                status="neutral"
              />
              <MetricCard
                icon="📤"
                label="Output Tokens"
                value={formatTokens(totalCompletionTokens)}
                status="neutral"
              />
              <MetricCard
                icon="📊"
                label="Total"
                value={formatTokens(state.totalTokens)}
                detail={`${state.tokensPerMinute.toFixed(0)}/min`}
                status="neutral"
              />
            </MetricRow>
          </Box>

          {/* Input/Output ratio */}
          {state.totalTokens > 0 && (
            <Box marginTop={1}>
              <Text color={colors.textMuted}>Ratio: </Text>
              <Text color={colors.primary}>
                {((totalPromptTokens / state.totalTokens) * 100).toFixed(0)}% input
              </Text>
              <Text dimColor> / </Text>
              <Text color={colors.secondary}>
                {((totalCompletionTokens / state.totalTokens) * 100).toFixed(0)}% output
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Cost Trend */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Cost Trend</Text>

          <Box marginTop={1}>
            {recentCosts.length > 0 ? (
              <Sparkline data={recentCosts} width={40} color={colors.warning} showLabels={true} />
            ) : (
              <Text dimColor>No cost data yet</Text>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default CostsView;
