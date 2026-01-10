/**
 * Metric Card Component
 *
 * Displays a single metric with optional trend indicator,
 * sparkline chart, and status coloring.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../context/theme-context.js';

export interface MetricCardProps {
  /** Label for the metric */
  label: string;
  /** Primary value to display */
  value: string | number;
  /** Optional unit suffix */
  unit?: string;
  /** Optional secondary/detail value */
  detail?: string;
  /** Status for coloring: success, warning, error, neutral */
  status?: 'success' | 'warning' | 'error' | 'neutral';
  /** Optional trend: up, down, stable */
  trend?: 'up' | 'down' | 'stable';
  /** Optional icon/emoji */
  icon?: string;
  /** Width of the card */
  width?: number;
  /** Show border */
  bordered?: boolean;
}

/**
 * Metric Card - Displays a key metric with styling
 */
export function MetricCard({
  label,
  value,
  unit,
  detail,
  status = 'neutral',
  trend,
  icon,
  width,
  bordered = false,
}: MetricCardProps) {
  const { colors } = useTheme();

  // Determine color based on status
  const statusColors: Record<string, string> = {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    neutral: colors.text,
  };

  const valueColor = statusColors[status] || colors.text;

  // Trend indicators
  const trendIcons: Record<string, { icon: string; color: string }> = {
    up: { icon: '↑', color: colors.success },
    down: { icon: '↓', color: colors.error },
    stable: { icon: '→', color: colors.textMuted },
  };

  const trendDisplay = trend ? trendIcons[trend] : null;

  const content = (
    <Box flexDirection="column" width={width}>
      {/* Label row */}
      <Box>
        {icon && <Text>{icon} </Text>}
        <Text color={colors.textMuted}>{label}</Text>
      </Box>

      {/* Value row */}
      <Box>
        <Text bold color={valueColor}>
          {value}
        </Text>
        {unit && <Text color={colors.textMuted}> {unit}</Text>}
        {trendDisplay && (
          <Text color={trendDisplay.color}> {trendDisplay.icon}</Text>
        )}
      </Box>

      {/* Detail row */}
      {detail && (
        <Box>
          <Text dimColor>{detail}</Text>
        </Box>
      )}
    </Box>
  );

  if (bordered) {
    return (
      <Box
        borderStyle="single"
        borderColor={colors.border}
        paddingX={1}
        width={width}
      >
        {content}
      </Box>
    );
  }

  return content;
}

/**
 * Metric Row - Horizontal layout of metrics
 */
export function MetricRow({
  children,
  gap = 2,
}: {
  children: React.ReactNode;
  gap?: number;
}) {
  return (
    <Box flexDirection="row" gap={gap}>
      {children}
    </Box>
  );
}

/**
 * Metric Grid - Grid layout of metric cards
 */
export function MetricGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: number;
}) {
  const { colors } = useTheme();

  return (
    <Box
      flexDirection="row"
      flexWrap="wrap"
      borderStyle="single"
      borderColor={colors.border}
      padding={1}
    >
      {React.Children.map(children, (child, index) => (
        <Box key={index} width={`${100 / columns}%`} paddingRight={1}>
          {child}
        </Box>
      ))}
    </Box>
  );
}

export default MetricCard;
