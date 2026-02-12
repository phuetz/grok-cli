/**
 * Prometheus Metrics Exporter
 *
 * Export metrics in Prometheus format:
 * - HTTP endpoint for scraping
 * - Standard metrics format
 * - Custom metrics support
 * - Histogram and counter types
 */

import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface MetricValue {
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

export interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labelNames?: string[];
}

export interface HistogramBucket {
  le: number;
  count: number;
}

export interface HistogramValue {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
  labels?: Record<string, string>;
}

export interface PrometheusConfig {
  /** HTTP server port */
  port: number;
  /** Metrics endpoint path */
  path: string;
  /** Default labels for all metrics */
  defaultLabels?: Record<string, string>;
  /** Metric prefix */
  prefix: string;
}

const DEFAULT_CONFIG: PrometheusConfig = {
  port: 9090,
  path: '/metrics',
  prefix: 'codebuddy_',
  defaultLabels: {},
};

/**
 * Prometheus Metrics Exporter
 */
export class PrometheusExporter extends EventEmitter {
  private config: PrometheusConfig;
  private server: Server | null = null;
  private metrics: Map<string, MetricDefinition> = new Map();
  private values: Map<string, MetricValue[]> = new Map();
  private histograms: Map<string, HistogramValue[]> = new Map();

  constructor(config?: Partial<PrometheusConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultMetrics();
  }

  /**
   * Register default metrics
   */
  private registerDefaultMetrics(): void {
    // Session metrics
    this.registerMetric({
      name: 'sessions_total',
      help: 'Total number of sessions started',
      type: 'counter',
    });

    this.registerMetric({
      name: 'sessions_active',
      help: 'Number of currently active sessions',
      type: 'gauge',
    });

    this.registerMetric({
      name: 'session_duration_seconds',
      help: 'Session duration in seconds',
      type: 'histogram',
    });

    // Message metrics
    this.registerMetric({
      name: 'messages_total',
      help: 'Total number of messages processed',
      type: 'counter',
      labelNames: ['role'],
    });

    this.registerMetric({
      name: 'tokens_total',
      help: 'Total tokens used',
      type: 'counter',
      labelNames: ['type'],
    });

    // Tool metrics
    this.registerMetric({
      name: 'tool_calls_total',
      help: 'Total tool calls',
      type: 'counter',
      labelNames: ['tool', 'status'],
    });

    this.registerMetric({
      name: 'tool_duration_seconds',
      help: 'Tool execution duration in seconds',
      type: 'histogram',
      labelNames: ['tool'],
    });

    // Cost metrics
    this.registerMetric({
      name: 'api_cost_dollars',
      help: 'Total API cost in dollars',
      type: 'counter',
    });

    this.registerMetric({
      name: 'cost_per_session_dollars',
      help: 'Cost per session in dollars',
      type: 'gauge',
    });

    // Error metrics
    this.registerMetric({
      name: 'errors_total',
      help: 'Total errors encountered',
      type: 'counter',
      labelNames: ['type'],
    });

    // Performance metrics
    this.registerMetric({
      name: 'response_time_seconds',
      help: 'API response time in seconds',
      type: 'histogram',
    });

    this.registerMetric({
      name: 'context_tokens',
      help: 'Current context window usage in tokens',
      type: 'gauge',
    });

    // File metrics
    this.registerMetric({
      name: 'files_read_total',
      help: 'Total files read',
      type: 'counter',
    });

    this.registerMetric({
      name: 'files_written_total',
      help: 'Total files written',
      type: 'counter',
    });

    this.registerMetric({
      name: 'lines_changed_total',
      help: 'Total lines changed',
      type: 'counter',
      labelNames: ['operation'],
    });
  }

  /**
   * Register a metric
   */
  registerMetric(definition: MetricDefinition): void {
    const fullName = this.config.prefix + definition.name;
    this.metrics.set(fullName, { ...definition, name: fullName });

    if (definition.type === 'histogram') {
      this.histograms.set(fullName, []);
    } else {
      this.values.set(fullName, []);
    }
  }

  /**
   * Increment a counter
   */
  inc(name: string, value: number = 1, labels?: Record<string, string>): void {
    const fullName = this.config.prefix + name;
    const metric = this.metrics.get(fullName);

    if (!metric || metric.type !== 'counter') {
      return;
    }

    const allLabels = { ...this.config.defaultLabels, ...labels };
    const existing = this.findValue(fullName, allLabels);

    if (existing) {
      existing.value += value;
    } else {
      this.values.get(fullName)?.push({
        value,
        labels: allLabels,
        timestamp: Date.now(),
      });
    }

    this.emit('metric', { name, value, labels: allLabels });
  }

  /**
   * Set a gauge value
   */
  set(name: string, value: number, labels?: Record<string, string>): void {
    const fullName = this.config.prefix + name;
    const metric = this.metrics.get(fullName);

    if (!metric || metric.type !== 'gauge') {
      return;
    }

    const allLabels = { ...this.config.defaultLabels, ...labels };
    const existing = this.findValue(fullName, allLabels);

    if (existing) {
      existing.value = value;
      existing.timestamp = Date.now();
    } else {
      this.values.get(fullName)?.push({
        value,
        labels: allLabels,
        timestamp: Date.now(),
      });
    }

    this.emit('metric', { name, value, labels: allLabels });
  }

  /**
   * Observe a histogram value
   */
  observe(name: string, value: number, labels?: Record<string, string>): void {
    const fullName = this.config.prefix + name;
    const metric = this.metrics.get(fullName);

    if (!metric || metric.type !== 'histogram') {
      return;
    }

    const allLabels = { ...this.config.defaultLabels, ...labels };
    const labelKey = JSON.stringify(allLabels);

    let histogram = this.histograms.get(fullName)?.find(
      h => JSON.stringify(h.labels) === labelKey
    );

    if (!histogram) {
      histogram = {
        buckets: this.createDefaultBuckets(),
        sum: 0,
        count: 0,
        labels: allLabels,
      };
      this.histograms.get(fullName)?.push(histogram);
    }

    histogram.sum += value;
    histogram.count++;

    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }

    this.emit('metric', { name, value, labels: allLabels });
  }

  /**
   * Create default histogram buckets
   */
  private createDefaultBuckets(): HistogramBucket[] {
    return [
      { le: 0.005, count: 0 },
      { le: 0.01, count: 0 },
      { le: 0.025, count: 0 },
      { le: 0.05, count: 0 },
      { le: 0.1, count: 0 },
      { le: 0.25, count: 0 },
      { le: 0.5, count: 0 },
      { le: 1, count: 0 },
      { le: 2.5, count: 0 },
      { le: 5, count: 0 },
      { le: 10, count: 0 },
      { le: Infinity, count: 0 },
    ];
  }

  /**
   * Find existing value by labels
   */
  private findValue(name: string, labels: Record<string, string>): MetricValue | undefined {
    const values = this.values.get(name);
    if (!values) return undefined;

    const labelKey = JSON.stringify(labels);
    return values.find(v => JSON.stringify(v.labels || {}) === labelKey);
  }

  /**
   * Format metrics for Prometheus
   */
  formatMetrics(): string {
    const lines: string[] = [];

    // Regular metrics (counters and gauges)
    for (const [name, definition] of this.metrics) {
      if (definition.type === 'histogram') continue;

      lines.push(`# HELP ${name} ${definition.help}`);
      lines.push(`# TYPE ${name} ${definition.type}`);

      const values = this.values.get(name) || [];
      for (const value of values) {
        const labelStr = this.formatLabels(value.labels);
        lines.push(`${name}${labelStr} ${value.value}`);
      }

      if (values.length === 0) {
        lines.push(`${name} 0`);
      }

      lines.push('');
    }

    // Histograms
    for (const [name, definition] of this.metrics) {
      if (definition.type !== 'histogram') continue;

      lines.push(`# HELP ${name} ${definition.help}`);
      lines.push(`# TYPE ${name} histogram`);

      const histograms = this.histograms.get(name) || [];
      for (const histogram of histograms) {
        const baseLabelStr = this.formatLabels(histogram.labels);

        for (const bucket of histogram.buckets) {
          const leStr = bucket.le === Infinity ? '+Inf' : String(bucket.le);
          const bucketLabels = histogram.labels
            ? { ...histogram.labels, le: leStr }
            : { le: leStr };
          lines.push(`${name}_bucket${this.formatLabels(bucketLabels)} ${bucket.count}`);
        }

        lines.push(`${name}_sum${baseLabelStr} ${histogram.sum}`);
        lines.push(`${name}_count${baseLabelStr} ${histogram.count}`);
      }

      if (histograms.length === 0) {
        for (const bucket of this.createDefaultBuckets()) {
          const leStr = bucket.le === Infinity ? '+Inf' : String(bucket.le);
          lines.push(`${name}_bucket{le="${leStr}"} 0`);
        }
        lines.push(`${name}_sum 0`);
        lines.push(`${name}_count 0`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    const pairs = Object.entries(labels)
      .map(([k, v]) => `${k}="${this.escapeLabel(v)}"`)
      .join(',');

    return `{${pairs}}`;
  }

  /**
   * Escape label value
   */
  private escapeLabel(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  /**
   * Start HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);

      this.server.listen(this.config.port, () => {
        logger.info(`Prometheus metrics available at http://localhost:${this.config.port}${this.config.path}`);
        this.emit('started');
        resolve();
      });
    });
  }

  /**
   * Handle HTTP request
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.url === this.config.path && req.method === 'GET') {
      const metrics = this.formatMetrics();
      res.writeHead(200, {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Content-Length': Buffer.byteLength(metrics),
      });
      res.end(metrics);
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  /**
   * Stop HTTP server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const [name] of this.metrics) {
      if (this.values.has(name)) {
        this.values.set(name, []);
      }
      if (this.histograms.has(name)) {
        this.histograms.set(name, []);
      }
    }
  }

  /**
   * Get current metric value
   */
  getValue(name: string, labels?: Record<string, string>): number | undefined {
    const fullName = this.config.prefix + name;
    const allLabels = { ...this.config.defaultLabels, ...labels };
    const value = this.findValue(fullName, allLabels);
    return value?.value;
  }

  /**
   * Push metrics to Prometheus Pushgateway
   */
  async pushToGateway(gatewayUrl: string, jobName: string): Promise<void> {
    const metrics = this.formatMetrics();
    const url = `${gatewayUrl}/metrics/job/${jobName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: metrics,
    });

    if (!response.ok) {
      throw new Error(`Failed to push metrics: ${response.statusText}`);
    }
  }
}

// Singleton instance
let exporter: PrometheusExporter | null = null;

/**
 * Get or create Prometheus exporter
 */
export function getPrometheusExporter(config?: Partial<PrometheusConfig>): PrometheusExporter {
  if (!exporter) {
    exporter = new PrometheusExporter(config);
  }
  return exporter;
}

/**
 * Create metrics middleware for integration
 */
export function createMetricsCollector(exporter: PrometheusExporter) {
  return {
    onSessionStart: () => {
      exporter.inc('sessions_total');
      exporter.set('sessions_active', (exporter.getValue('sessions_active') || 0) + 1);
    },

    onSessionEnd: (durationSeconds: number) => {
      exporter.set('sessions_active', Math.max(0, (exporter.getValue('sessions_active') || 1) - 1));
      exporter.observe('session_duration_seconds', durationSeconds);
    },

    onMessage: (role: string, tokens: number) => {
      exporter.inc('messages_total', 1, { role });
      exporter.inc('tokens_total', tokens, { type: role === 'assistant' ? 'output' : 'input' });
    },

    onToolCall: (tool: string, success: boolean, durationSeconds: number) => {
      const safeTool = tool.replace(/[\n\r\\]/g, '_').slice(0, 64);
      exporter.inc('tool_calls_total', 1, { tool: safeTool, status: success ? 'success' : 'failure' });
      exporter.observe('tool_duration_seconds', durationSeconds, { tool: safeTool });
    },

    onCost: (amount: number) => {
      exporter.inc('api_cost_dollars', amount);
    },

    onError: (type: string) => {
      exporter.inc('errors_total', 1, { type });
    },

    onResponse: (durationSeconds: number) => {
      exporter.observe('response_time_seconds', durationSeconds);
    },

    onContextUpdate: (tokens: number) => {
      exporter.set('context_tokens', tokens);
    },

    onFileRead: () => {
      exporter.inc('files_read_total');
    },

    onFileWrite: () => {
      exporter.inc('files_written_total');
    },

    onLinesChanged: (added: number, removed: number) => {
      exporter.inc('lines_changed_total', added, { operation: 'added' });
      exporter.inc('lines_changed_total', removed, { operation: 'removed' });
    },
  };
}

export default PrometheusExporter;
