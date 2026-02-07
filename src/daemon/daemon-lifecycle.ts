/**
 * Daemon Lifecycle
 *
 * Manages ordered startup/shutdown of daemon services:
 * - Server, scheduler, channels, observer
 * - Health check polling
 * - Service registry
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { ServiceStatus } from './daemon-manager.js';

// ============================================================================
// Types
// ============================================================================

export interface DaemonService {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getStatus(): ServiceStatus;
}

export interface LifecycleConfig {
  /** Health check polling interval (ms) */
  healthCheckIntervalMs: number;
  /** Shutdown timeout per service (ms) */
  shutdownTimeoutMs: number;
}

const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  healthCheckIntervalMs: 30000,
  shutdownTimeoutMs: 10000,
};

// ============================================================================
// Daemon Lifecycle Manager
// ============================================================================

export class DaemonLifecycle extends EventEmitter {
  private config: LifecycleConfig;
  private services: Map<string, DaemonService> = new Map();
  private startOrder: string[] = [];
  private healthTimer: NodeJS.Timeout | null = null;
  private running: boolean = false;

  constructor(config: Partial<LifecycleConfig> = {}) {
    super();
    this.config = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };
  }

  /**
   * Register a service for lifecycle management
   */
  registerService(service: DaemonService): void {
    this.services.set(service.name, service);
    this.startOrder.push(service.name);
    logger.debug(`Service registered: ${service.name}`);
  }

  /**
   * Auto-register observer service if triggers exist
   */
  async autoRegisterObserver(): Promise<void> {
    try {
      const { EventTriggerManager } = await import('../agent/observer/event-trigger.js');
      const { TriggerRegistry } = await import('../agent/observer/trigger-registry.js');
      const triggerManager = new EventTriggerManager();
      const registry = new TriggerRegistry(triggerManager);
      await registry.load();
      const triggers = triggerManager.listTriggers();

      if (triggers.length > 0) {
        const { ScreenObserver } = await import('../agent/observer/screen-observer.js');
        const { ObserverCoordinator } = await import('../agent/observer/observer-coordinator.js');
        const screenObserver = new ScreenObserver();
        const coordinator = new ObserverCoordinator(screenObserver, triggerManager);
        this.registerService({
          name: 'observer',
          start: () => coordinator.start(),
          stop: () => coordinator.stop(),
          isRunning: () => coordinator.isRunning(),
          getStatus: () => ({
            name: 'observer',
            running: coordinator.isRunning(),
            startedAt: new Date(),
          }),
        });
        logger.info(`Observer auto-registered with ${triggers.length} trigger(s)`);
      }
    } catch (error) {
      logger.debug('Observer auto-registration skipped', { error: String(error) });
    }
  }

  /**
   * Start all registered services in order
   */
  async startAll(): Promise<void> {
    if (this.running) return;

    // Auto-register observer if triggers exist
    await this.autoRegisterObserver();

    logger.info(`Starting ${this.services.size} daemon services...`);

    for (const name of this.startOrder) {
      const service = this.services.get(name);
      if (!service) continue;

      try {
        logger.info(`Starting service: ${name}`);
        await service.start();
        this.emit('service:started', { name });
      } catch (error) {
        logger.error(`Failed to start service: ${name}`, error as Error);
        this.emit('service:error', { name, error });
      }
    }

    // Start health check polling
    this.healthTimer = setInterval(
      () => this.runHealthCheck(),
      this.config.healthCheckIntervalMs
    );

    this.running = true;
    this.emit('started');
  }

  /**
   * Stop all services in reverse order
   */
  async stopAll(): Promise<void> {
    if (!this.running) return;

    // Stop health checks
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }

    logger.info('Stopping daemon services...');

    // Stop in reverse order
    const reverseOrder = [...this.startOrder].reverse();

    for (const name of reverseOrder) {
      const service = this.services.get(name);
      if (!service) continue;

      try {
        logger.info(`Stopping service: ${name}`);
        await Promise.race([
          service.stop(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Shutdown timeout')), this.config.shutdownTimeoutMs)
          ),
        ]);
        this.emit('service:stopped', { name });
      } catch (error) {
        logger.error(`Failed to stop service: ${name}`, error as Error);
        this.emit('service:error', { name, error });
      }
    }

    this.running = false;
    this.emit('stopped');
  }

  /**
   * Run health check on all services
   */
  private runHealthCheck(): void {
    for (const [name, service] of this.services) {
      const status = service.getStatus();
      if (!status.running && this.running) {
        logger.warn(`Service ${name} is not running`);
        this.emit('service:unhealthy', { name, status });
      }
    }
  }

  /**
   * Get status of all services
   */
  getAllStatus(): ServiceStatus[] {
    return Array.from(this.services.values()).map(s => s.getStatus());
  }

  /**
   * Check if lifecycle is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get registered service names
   */
  getServiceNames(): string[] {
    return [...this.startOrder];
  }
}

// ============================================================================
// Singleton
// ============================================================================

let lifecycleInstance: DaemonLifecycle | null = null;

export function getDaemonLifecycle(config?: Partial<LifecycleConfig>): DaemonLifecycle {
  if (!lifecycleInstance) {
    lifecycleInstance = new DaemonLifecycle(config);
  }
  return lifecycleInstance;
}

export function resetDaemonLifecycle(): void {
  lifecycleInstance = null;
}
