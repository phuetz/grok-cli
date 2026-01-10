/**
 * Observability Dashboard Module
 *
 * Interactive terminal dashboard for real-time monitoring of:
 * - Agent costs and budget usage
 * - Latency and performance metrics
 * - Tool usage statistics
 * - Error tracking
 *
 * @example
 * ```typescript
 * import { ObservabilityDashboard } from './ui/dashboard';
 * import { render } from 'ink';
 *
 * render(<ObservabilityDashboard budget={10} />);
 * ```
 */

// Main dashboard
export {
  ObservabilityDashboard,
  StandaloneDashboard,
  type ObservabilityDashboardProps,
  type DashboardTab,
} from './dashboard.js';

// Views
export { OverviewView, type OverviewViewProps } from './views/overview-view.js';
export { CostsView, type CostsViewProps } from './views/costs-view.js';
export { LatencyView, type LatencyViewProps } from './views/latency-view.js';
export { ToolsView, type ToolsViewProps } from './views/tools-view.js';

// Components
export {
  MetricCard,
  MetricRow,
  MetricGrid,
  type MetricCardProps,
} from './components/metric-card.js';

export {
  Sparkline,
  BarChart,
  ProgressRing,
  Histogram,
  type SparklineProps,
  type BarChartProps,
  type ProgressRingProps,
  type HistogramProps,
} from './components/mini-chart.js';

// Hooks
export {
  useDashboardData,
  type DashboardData,
  type LatencyStats,
  type UseDashboardDataOptions,
} from './hooks/use-dashboard-data.js';

// Default export
export { ObservabilityDashboard as default } from './dashboard.js';
