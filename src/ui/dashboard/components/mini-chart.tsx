/**
 * Mini Chart Components
 *
 * ASCII-based charts for terminal display:
 * - Sparkline: Compact inline trend visualization
 * - BarChart: Horizontal bar chart
 * - ProgressRing: Circular progress (ASCII art)
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../context/theme-context.js';

// Braille characters for sparklines (8 levels)
const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export interface SparklineProps {
  /** Data points to visualize */
  data: number[];
  /** Width in characters */
  width?: number;
  /** Color of the sparkline */
  color?: string;
  /** Show min/max labels */
  showLabels?: boolean;
}

/**
 * Sparkline - Compact inline trend visualization
 */
export function Sparkline({
  data,
  width = 20,
  color,
  showLabels = false,
}: SparklineProps) {
  const { colors } = useTheme();
  const chartColor = color || colors.primary;

  if (data.length === 0) {
    return <Text dimColor>{'─'.repeat(width)}</Text>;
  }

  // Normalize data to fit width
  const normalizedData = normalizeDataToWidth(data, width);

  // Find min/max for scaling
  const min = Math.min(...normalizedData);
  const max = Math.max(...normalizedData);
  const range = max - min || 1;

  // Generate sparkline characters
  const chars = normalizedData.map((value) => {
    const normalized = (value - min) / range;
    const index = Math.min(
      SPARK_CHARS.length - 1,
      Math.floor(normalized * (SPARK_CHARS.length - 1))
    );
    return SPARK_CHARS[index];
  });

  return (
    <Box>
      {showLabels && (
        <Text dimColor>{formatCompact(min)} </Text>
      )}
      <Text color={chartColor}>{chars.join('')}</Text>
      {showLabels && (
        <Text dimColor> {formatCompact(max)}</Text>
      )}
    </Box>
  );
}

export interface BarChartProps {
  /** Data items with label and value */
  data: Array<{ label: string; value: number; color?: string }>;
  /** Maximum width for bars */
  maxBarWidth?: number;
  /** Show values */
  showValues?: boolean;
  /** Label width */
  labelWidth?: number;
}

/**
 * Bar Chart - Horizontal bar chart
 */
export function BarChart({
  data,
  maxBarWidth = 20,
  showValues = true,
  labelWidth = 15,
}: BarChartProps) {
  const { colors } = useTheme();

  if (data.length === 0) {
    return <Text dimColor>No data</Text>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Box flexDirection="column">
      {data.map((item, index) => {
        const barWidth = Math.round((item.value / maxValue) * maxBarWidth);
        const barColor = item.color || colors.primary;

        return (
          <Box key={index}>
            <Box width={labelWidth}>
              <Text color={colors.textMuted}>
                {item.label.slice(0, labelWidth - 1).padEnd(labelWidth - 1)}
              </Text>
            </Box>
            <Text color={barColor}>{'█'.repeat(barWidth)}</Text>
            <Text dimColor>{'░'.repeat(maxBarWidth - barWidth)}</Text>
            {showValues && (
              <Text dimColor> {formatCompact(item.value)}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export interface ProgressRingProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Size: small, medium, large */
  size?: 'small' | 'medium' | 'large';
  /** Color based on progress */
  autoColor?: boolean;
  /** Custom color */
  color?: string;
  /** Show percentage label */
  showLabel?: boolean;
}

/**
 * Progress Ring - ASCII circular progress
 */
export function ProgressRing({
  progress,
  size = 'medium',
  autoColor = true,
  color,
  showLabel = true,
}: ProgressRingProps) {
  const { colors } = useTheme();

  // Clamp progress
  const p = Math.max(0, Math.min(100, progress));

  // Determine color
  let ringColor = color || colors.primary;
  if (autoColor && !color) {
    if (p < 50) ringColor = colors.success;
    else if (p < 80) ringColor = colors.warning;
    else ringColor = colors.error;
  }

  // Size-based rendering
  if (size === 'small') {
    // Single character progress
    const chars = ['○', '◔', '◑', '◕', '●'];
    const index = Math.min(chars.length - 1, Math.floor(p / 25));
    return (
      <Box>
        <Text color={ringColor}>{chars[index]}</Text>
        {showLabel && <Text dimColor> {p}%</Text>}
      </Box>
    );
  }

  // Medium/large: bar-based
  const width = size === 'large' ? 20 : 10;
  const filled = Math.round((p / 100) * width);

  return (
    <Box>
      <Text color={ringColor}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(width - filled)}</Text>
      {showLabel && <Text dimColor> {p}%</Text>}
    </Box>
  );
}

export interface HistogramProps {
  /** Data points */
  data: number[];
  /** Number of buckets */
  buckets?: number;
  /** Height in lines */
  height?: number;
  /** Show bucket labels */
  showLabels?: boolean;
}

/**
 * Histogram - Vertical bar histogram
 */
export function Histogram({
  data,
  buckets = 10,
  height = 5,
  showLabels = true,
}: HistogramProps) {
  const { colors } = useTheme();

  if (data.length === 0) {
    return <Text dimColor>No data</Text>;
  }

  // Calculate bucket ranges
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const bucketSize = range / buckets;

  // Count values in each bucket
  const counts = new Array(buckets).fill(0);
  for (const value of data) {
    const bucketIndex = Math.min(
      buckets - 1,
      Math.floor((value - min) / bucketSize)
    );
    counts[bucketIndex]++;
  }

  const maxCount = Math.max(...counts, 1);

  // Build histogram rows (top to bottom)
  const rows: string[] = [];
  for (let row = height; row > 0; row--) {
    const threshold = (row / height) * maxCount;
    let line = '';
    for (let b = 0; b < buckets; b++) {
      line += counts[b] >= threshold ? '█' : ' ';
    }
    rows.push(line);
  }

  return (
    <Box flexDirection="column">
      {rows.map((row, index) => (
        <Text key={index} color={colors.primary}>
          {row}
        </Text>
      ))}
      {showLabels && (
        <Box>
          <Text dimColor>
            {formatCompact(min)}{'─'.repeat(buckets - 6)}{formatCompact(max)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Normalize data array to a specific width by sampling/averaging
 */
function normalizeDataToWidth(data: number[], width: number): number[] {
  if (data.length <= width) {
    return data;
  }

  const result: number[] = [];
  const ratio = data.length / width;

  for (let i = 0; i < width; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    const slice = data.slice(start, end);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    result.push(avg);
  }

  return result;
}

/**
 * Format number in compact form (1K, 1.5M, etc.)
 */
function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  if (value >= 100) {
    return Math.round(value).toString();
  }
  if (value >= 10) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

export default Sparkline;
