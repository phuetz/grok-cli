/**
 * Docker Sandbox Types
 *
 * Type definitions for per-session Docker isolation.
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Docker sandbox configuration
 */
export interface DockerSandboxConfig {
  /** Docker image to use */
  image: string;
  /** Memory limit (e.g., '512m', '1g') */
  memoryLimit: string;
  /** CPU limit (0.5 = 50% of one CPU) */
  cpuLimit: number;
  /** Network mode */
  networkMode: 'none' | 'bridge' | 'host';
  /** Maximum execution time (ms) */
  timeout: number;
  /** Working directory inside container */
  workDir: string;
  /** User to run as */
  user?: string;
  /** Enable GPU support */
  gpuEnabled: boolean;
  /** Environment variables */
  env?: Record<string, string>;
  /** Volume mounts */
  volumes?: VolumeMount[];
  /** Resource limits */
  resourceLimits?: ResourceLimits;
}

/**
 * Default sandbox configuration
 */
export const DEFAULT_SANDBOX_CONFIG: DockerSandboxConfig = {
  image: 'codebuddy/sandbox:latest',
  memoryLimit: '512m',
  cpuLimit: 0.5,
  networkMode: 'none',
  timeout: 60000, // 1 minute
  workDir: '/workspace',
  gpuEnabled: false,
};

/**
 * Volume mount configuration
 */
export interface VolumeMount {
  /** Host path or volume name */
  source: string;
  /** Container path */
  target: string;
  /** Read-only */
  readOnly: boolean;
}

/**
 * Resource limits
 */
export interface ResourceLimits {
  /** Maximum PIDs */
  pidsLimit?: number;
  /** Disk quota (bytes) */
  diskQuota?: number;
  /** IO weight (10-1000) */
  ioWeight?: number;
  /** Open file limit */
  nofileLimit?: number;
}

// ============================================================================
// Container State
// ============================================================================

/**
 * Container status
 */
export type ContainerStatus =
  | 'creating'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'dead'
  | 'removing';

/**
 * Session container mapping
 */
export interface SessionContainer {
  /** Container ID */
  id: string;
  /** Session ID */
  sessionId: string;
  /** Docker container ID */
  containerId: string;
  /** Current status */
  status: ContainerStatus;
  /** Container image */
  image: string;
  /** Created at */
  createdAt: Date;
  /** Last activity */
  lastActivityAt: Date;
  /** Tool allowlist */
  toolAllowlist: string[];
  /** Tool denylist */
  toolDenylist: string[];
  /** Network policy */
  networkPolicy?: NetworkPolicy;
  /** Metrics */
  metrics?: ContainerMetrics;
}

/**
 * Container metrics
 */
export interface ContainerMetrics {
  /** CPU usage percentage */
  cpuPercent: number;
  /** Memory usage bytes */
  memoryUsage: number;
  /** Memory limit bytes */
  memoryLimit: number;
  /** Network RX bytes */
  networkRxBytes: number;
  /** Network TX bytes */
  networkTxBytes: number;
  /** Block IO read bytes */
  blockIoReadBytes: number;
  /** Block IO write bytes */
  blockIoWriteBytes: number;
}

// ============================================================================
// Network Policy
// ============================================================================

/**
 * Network policy for container
 */
export interface NetworkPolicy {
  /** Allowed outbound hosts */
  allowedHosts: string[];
  /** Blocked ports */
  blockedPorts: number[];
  /** Maximum bandwidth (e.g., '1m' for 1 MB/s) */
  maxBandwidth?: string;
  /** Custom DNS servers */
  dnsServers?: string[];
  /** Allow localhost access */
  allowLocalhost: boolean;
}

/**
 * Default network policy
 */
export const DEFAULT_NETWORK_POLICY: NetworkPolicy = {
  allowedHosts: [],
  blockedPorts: [22, 23, 25, 445, 3389],
  allowLocalhost: false,
};

// ============================================================================
// Execution
// ============================================================================

/**
 * Command execution options
 */
export interface ExecutionOptions {
  /** Working directory */
  workDir?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout (ms) */
  timeout?: number;
  /** User to run as */
  user?: string;
  /** Stdin input */
  stdin?: string;
  /** Capture stderr separately */
  captureStderr?: boolean;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  /** Exit code */
  exitCode: number;
  /** Stdout */
  stdout: string;
  /** Stderr */
  stderr: string;
  /** Execution time (ms) */
  durationMs: number;
  /** Was killed due to timeout */
  timedOut: boolean;
  /** Was killed due to OOM */
  oomKilled: boolean;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Sandbox events
 */
export interface SandboxEvents {
  'container:created': (container: SessionContainer) => void;
  'container:started': (containerId: string) => void;
  'container:stopped': (containerId: string, reason: string) => void;
  'container:destroyed': (containerId: string) => void;
  'container:oom': (containerId: string) => void;
  'execution:start': (containerId: string, command: string) => void;
  'execution:complete': (containerId: string, result: ExecutionResult) => void;
  'policy:violation': (containerId: string, violation: string) => void;
  'error': (error: Error) => void;
}

// ============================================================================
// Pool
// ============================================================================

/**
 * Container pool configuration
 */
export interface PoolConfig {
  /** Minimum warm containers */
  minWarm: number;
  /** Maximum total containers */
  maxTotal: number;
  /** Idle timeout before destruction (ms) */
  idleTimeoutMs: number;
  /** Health check interval (ms) */
  healthCheckIntervalMs: number;
  /** Pre-warm on startup */
  preWarmOnStartup: boolean;
}

/**
 * Default pool configuration
 */
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  minWarm: 2,
  maxTotal: 10,
  idleTimeoutMs: 5 * 60 * 1000, // 5 minutes
  healthCheckIntervalMs: 30 * 1000, // 30 seconds
  preWarmOnStartup: true,
};
