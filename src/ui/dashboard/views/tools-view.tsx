/**
 * Tools View
 *
 * Tool usage metrics and breakdown:
 * - Most used tools
 * - Success/error rates
 * - Execution times
 * - Recent tool activity
 */

import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../context/theme-context.js';
import { MetricCard, MetricRow } from '../components/metric-card.js';
import { BarChart, ProgressRing as _ProgressRing } from '../components/mini-chart.js';
import type { DashboardData } from '../hooks/use-dashboard-data.js';
import type { ToolMetrics } from '../../../observability/dashboard.js';

export interface ToolsViewProps {
  data: DashboardData;
}

type SortField = 'calls' | 'success' | 'duration' | 'name';

/**
 * Format duration
 */
function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.round(ms)}ms`;
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp) return 'Never';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * Tools View Component
 */
export function ToolsView({ data }: ToolsViewProps) {
  const { colors } = useTheme();
  const { state: _state, tools } = data;

  const [sortBy, setSortBy] = useState<SortField>('calls');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Handle keyboard input for sorting
  useInput((input, key) => {
    if (input === 'c') setSortBy('calls');
    else if (input === 's') setSortBy('success');
    else if (input === 'd') setSortBy('duration');
    else if (input === 'n') setSortBy('name');
    else if (key.upArrow && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
    else if (key.downArrow && selectedIndex < tools.length - 1) setSelectedIndex(selectedIndex + 1);
  });

  // Sort tools
  const sortedTools = useMemo(() => {
    const sorted = [...tools];
    switch (sortBy) {
      case 'calls':
        sorted.sort((a, b) => b.totalCalls - a.totalCalls);
        break;
      case 'success':
        sorted.sort((a, b) => {
          const aRate = a.totalCalls > 0 ? a.successCount / a.totalCalls : 0;
          const bRate = b.totalCalls > 0 ? b.successCount / b.totalCalls : 0;
          return bRate - aRate;
        });
        break;
      case 'duration':
        sorted.sort((a, b) => b.avgDuration - a.avgDuration);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [tools, sortBy]);

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const totalCalls = tools.reduce((sum, t) => sum + t.totalCalls, 0);
    const totalSuccess = tools.reduce((sum, t) => sum + t.successCount, 0);
    const totalErrors = tools.reduce((sum, t) => sum + t.errorCount, 0);
    const avgDuration = tools.length > 0
      ? tools.reduce((sum, t) => sum + t.avgDuration, 0) / tools.length
      : 0;
    const successRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 100;

    return { totalCalls, totalSuccess, totalErrors, avgDuration, successRate };
  }, [tools]);

  // Top tools for bar chart
  const topToolsData = sortedTools.slice(0, 5).map((t) => ({
    label: t.name.slice(0, 12),
    value: t.totalCalls,
    color: colors.primary,
  }));

  // Selected tool details
  const selectedTool: ToolMetrics | undefined = sortedTools[selectedIndex];

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          🔧 Tool Analytics
        </Text>
        <Text dimColor> • {tools.length} tools tracked</Text>
      </Box>

      {/* Summary Stats */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.info}>Summary</Text>

          <Box marginTop={1}>
            <MetricRow gap={3}>
              <MetricCard
                icon="📊"
                label="Total Calls"
                value={stats.totalCalls.toString()}
                status="neutral"
              />
              <MetricCard
                icon="✓"
                label="Success Rate"
                value={`${stats.successRate.toFixed(1)}%`}
                status={stats.successRate >= 95 ? 'success' : stats.successRate >= 80 ? 'warning' : 'error'}
              />
              <MetricCard
                icon="❌"
                label="Errors"
                value={stats.totalErrors.toString()}
                status={stats.totalErrors === 0 ? 'success' : 'error'}
              />
              <MetricCard
                icon="⏱"
                label="Avg Duration"
                value={formatDuration(stats.avgDuration)}
                status="neutral"
              />
            </MetricRow>
          </Box>
        </Box>
      </Box>

      {/* Top Tools Chart */}
      {topToolsData.length > 0 && (
        <Box
          borderStyle="round"
          borderColor={colors.border}
          paddingX={1}
          paddingY={0}
          marginBottom={1}
        >
          <Box flexDirection="column">
            <Text bold color={colors.info}>Most Used Tools</Text>

            <Box marginTop={1}>
              <BarChart
                data={topToolsData}
                maxBarWidth={25}
                showValues={true}
                labelWidth={14}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Tool List */}
      <Box
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
        marginBottom={1}
      >
        <Box flexDirection="column">
          <Box justifyContent="space-between">
            <Text bold color={colors.info}>Tool List</Text>
            <Box>
              <Text dimColor>Sort: </Text>
              <Text color={sortBy === 'calls' ? colors.primary : colors.textMuted}>[c]alls </Text>
              <Text color={sortBy === 'success' ? colors.primary : colors.textMuted}>[s]uccess </Text>
              <Text color={sortBy === 'duration' ? colors.primary : colors.textMuted}>[d]uration </Text>
              <Text color={sortBy === 'name' ? colors.primary : colors.textMuted}>[n]ame</Text>
            </Box>
          </Box>

          {/* Header row */}
          <Box marginTop={1}>
            <Box width={16}><Text bold dimColor>Tool</Text></Box>
            <Box width={8}><Text bold dimColor>Calls</Text></Box>
            <Box width={10}><Text bold dimColor>Success</Text></Box>
            <Box width={10}><Text bold dimColor>Avg Time</Text></Box>
            <Box width={10}><Text bold dimColor>Last</Text></Box>
          </Box>

          {/* Tool rows */}
          {sortedTools.slice(0, 10).map((tool, index) => {
            const successRate = tool.totalCalls > 0
              ? (tool.successCount / tool.totalCalls) * 100
              : 100;
            const isSelected = index === selectedIndex;

            return (
              <Box key={tool.name}>
                <Box width={16}>
                  <Text
                    color={isSelected ? colors.primary : colors.text}
                    bold={isSelected}
                  >
                    {isSelected ? '▶ ' : '  '}
                    {tool.name.slice(0, 12)}
                  </Text>
                </Box>
                <Box width={8}>
                  <Text>{tool.totalCalls}</Text>
                </Box>
                <Box width={10}>
                  <Text color={successRate >= 95 ? colors.success : successRate >= 80 ? colors.warning : colors.error}>
                    {successRate.toFixed(0)}%
                  </Text>
                </Box>
                <Box width={10}>
                  <Text>{formatDuration(tool.avgDuration)}</Text>
                </Box>
                <Box width={10}>
                  <Text dimColor>{formatTimeAgo(tool.lastExecuted)}</Text>
                </Box>
              </Box>
            );
          })}

          {tools.length > 10 && (
            <Text dimColor>...and {tools.length - 10} more tools</Text>
          )}
        </Box>
      </Box>

      {/* Selected Tool Details */}
      {selectedTool && (
        <Box
          borderStyle="round"
          borderColor={colors.primary}
          paddingX={1}
          paddingY={0}
        >
          <Box flexDirection="column">
            <Text bold color={colors.primary}>
              {selectedTool.name}
            </Text>

            <Box marginTop={1}>
              <MetricRow gap={2}>
                <Box flexDirection="column">
                  <Text color={colors.textMuted}>Calls</Text>
                  <Text bold>{selectedTool.totalCalls}</Text>
                </Box>
                <Box flexDirection="column">
                  <Text color={colors.textMuted}>Success</Text>
                  <Text bold color={colors.success}>{selectedTool.successCount}</Text>
                </Box>
                <Box flexDirection="column">
                  <Text color={colors.textMuted}>Errors</Text>
                  <Text bold color={selectedTool.errorCount > 0 ? colors.error : colors.textMuted}>
                    {selectedTool.errorCount}
                  </Text>
                </Box>
              </MetricRow>
            </Box>

            <Box marginTop={1}>
              <Text color={colors.textMuted}>Duration: </Text>
              <Text>min {formatDuration(selectedTool.minDuration === Infinity ? 0 : selectedTool.minDuration)}</Text>
              <Text dimColor> / </Text>
              <Text>avg {formatDuration(selectedTool.avgDuration)}</Text>
              <Text dimColor> / </Text>
              <Text>max {formatDuration(selectedTool.maxDuration)}</Text>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default ToolsView;
