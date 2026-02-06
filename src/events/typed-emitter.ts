/**
 * TypedEventEmitter - A type-safe event emitter with advanced features
 *
 * Provides type-safe event emission/listening, priority handling, wildcard listeners,
 * event history tracking, and an adapter for gradual migration from native EventEmitter.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type {
  BaseEvent,
  EventListener,
  EventFilter,
  ListenerOptions,
  ListenerWrapper,
  EventHistoryEntry,
  EventStats,
  AllEvents,
} from './types.js';
import { FilteredEventEmitter } from './filtered-emitter.js';

/**
 * TypedEventEmitter - A type-safe event emitter with advanced features
 */
export class TypedEventEmitter<TEvents extends Record<string, BaseEvent> = Record<string, BaseEvent>> {
  private emitter: EventEmitter;
  private listeners: Map<string, ListenerWrapper[]> = new Map();
  private wildcardListeners: ListenerWrapper[] = [];
  private eventHistory: EventHistoryEntry[] = [];
  private maxHistorySize: number;
  private stats: EventStats;
  private listenerIdCounter: number = 0;
  private enabled: boolean = true;

  constructor(options: { maxHistorySize?: number } = {}) {
    this.emitter = new EventEmitter();
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.stats = {
      totalEmitted: 0,
      totalListeners: 0,
      eventCounts: {},
    };
  }

  /**
   * Generate a unique listener ID
   */
  private generateListenerId(): string {
    return `listener_${++this.listenerIdCounter}_${Date.now()}`;
  }

  /**
   * Enable or disable the event emitter
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if the emitter is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Emit an event
   */
  emit<K extends keyof TEvents>(type: K, event: Omit<TEvents[K], 'type' | 'timestamp'>): boolean {
    if (!this.enabled) {
      return false;
    }

    const fullEvent = {
      ...event,
      type: type as string,
      timestamp: Date.now(),
    } as TEvents[K];

    // Update stats
    this.stats.totalEmitted++;
    this.stats.eventCounts[type as string] = (this.stats.eventCounts[type as string] || 0) + 1;
    this.stats.lastEmitted = fullEvent;

    // Get listeners for this event type
    const typeListeners = this.listeners.get(type as string) || [];

    // Combine with wildcard listeners
    const allListeners = [...typeListeners, ...this.wildcardListeners];

    // Sort by priority (higher priority first)
    allListeners.sort((a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0));

    // Track history
    this.addToHistory(fullEvent, allListeners.length);

    // Execute listeners
    const listenersToRemove: string[] = [];

    for (const wrapper of allListeners) {
      // Apply filter if present
      if (wrapper.options.filter && !wrapper.options.filter(fullEvent)) {
        continue;
      }

      try {
        const result = wrapper.listener(fullEvent);
        // Handle async listeners
        if (result instanceof Promise) {
          result.catch((error) => {
            // Emit error if there are listeners, otherwise log
            if (this.emitter.listenerCount('error') > 0) {
              this.emitter.emit('error', error);
            } else {
              logger.error('Unhandled async listener error:', error as Error);
            }
          });
        }
      } catch (error) {
        // Emit error if there are listeners, otherwise log silently
        // This allows emit() to continue without throwing
        if (this.emitter.listenerCount('error') > 0) {
          this.emitter.emit('error', error);
        } else {
          logger.error('Unhandled listener error:', error as Error);
        }
      }

      // Mark once listeners for removal
      if (wrapper.options.once) {
        listenersToRemove.push(wrapper.id);
      }
    }

    // Remove once listeners
    for (const id of listenersToRemove) {
      this.removeListenerById(id);
    }

    return allListeners.length > 0;
  }

  /**
   * Add an event listener
   */
  on<K extends keyof TEvents>(
    type: K,
    listener: EventListener<TEvents[K]>,
    options: ListenerOptions<TEvents[K]> = {}
  ): string {
    const id = this.generateListenerId();
    const wrapper: ListenerWrapper<TEvents[K]> = {
      listener,
      options,
      id,
    };

    const typeKey = type as string;
    if (!this.listeners.has(typeKey)) {
      this.listeners.set(typeKey, []);
    }
    this.listeners.get(typeKey)!.push(wrapper as ListenerWrapper);

    this.stats.totalListeners++;

    return id;
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof TEvents>(
    type: K,
    listener: EventListener<TEvents[K]>,
    options: Omit<ListenerOptions<TEvents[K]>, 'once'> = {}
  ): string {
    return this.on(type, listener, { ...options, once: true });
  }

  /**
   * Add a wildcard listener that receives all events
   */
  onAny(listener: EventListener<BaseEvent>, options: ListenerOptions<BaseEvent> = {}): string {
    const id = this.generateListenerId();
    const wrapper: ListenerWrapper = {
      listener,
      options,
      id,
    };

    this.wildcardListeners.push(wrapper);
    this.stats.totalListeners++;

    return id;
  }

  /**
   * Remove an event listener by ID
   */
  off(listenerId: string): boolean {
    return this.removeListenerById(listenerId);
  }

  /**
   * Remove all listeners for a specific event type
   */
  offAll<K extends keyof TEvents>(type?: K): void {
    if (type) {
      const typeKey = type as string;
      const count = this.listeners.get(typeKey)?.length ?? 0;
      this.listeners.delete(typeKey);
      this.stats.totalListeners -= count;
    } else {
      // Remove all listeners
      let _totalRemoved = 0;
      for (const listeners of this.listeners.values()) {
        _totalRemoved += listeners.length;
      }
      _totalRemoved += this.wildcardListeners.length;

      this.listeners.clear();
      this.wildcardListeners = [];
      this.stats.totalListeners = 0;
    }
  }

  /**
   * Remove a listener by ID
   */
  private removeListenerById(id: string): boolean {
    // Check type-specific listeners
    for (const [type, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex((w) => w.id === id);
      if (index !== -1) {
        listeners.splice(index, 1);
        this.stats.totalListeners--;
        if (listeners.length === 0) {
          this.listeners.delete(type);
        }
        return true;
      }
    }

    // Check wildcard listeners
    const wildcardIndex = this.wildcardListeners.findIndex((w) => w.id === id);
    if (wildcardIndex !== -1) {
      this.wildcardListeners.splice(wildcardIndex, 1);
      this.stats.totalListeners--;
      return true;
    }

    return false;
  }

  /**
   * Add event to history
   */
  private addToHistory<T extends BaseEvent>(event: T, listenerCount: number): void {
    this.eventHistory.push({
      event,
      timestamp: event.timestamp,
      listenerCount,
    });

    // Trim history if needed
    while (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory(): EventHistoryEntry[] {
    return [...this.eventHistory];
  }

  /**
   * Get filtered event history
   */
  getFilteredHistory<T extends BaseEvent>(filter: EventFilter<T>): EventHistoryEntry<T>[] {
    return this.eventHistory.filter((entry) => filter(entry.event as T)) as EventHistoryEntry<T>[];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get listener count for a specific event type
   */
  listenerCount<K extends keyof TEvents>(type?: K): number {
    if (type) {
      return (this.listeners.get(type as string)?.length ?? 0) + this.wildcardListeners.length;
    }
    return this.stats.totalListeners;
  }

  /**
   * Get event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get event statistics
   */
  getStats(): EventStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEmitted: 0,
      totalListeners: this.stats.totalListeners,
      eventCounts: {},
    };
  }

  /**
   * Wait for a specific event (returns a Promise)
   */
  waitFor<K extends keyof TEvents>(
    type: K,
    options: { timeout?: number; filter?: EventFilter<TEvents[K]> } = {}
  ): Promise<TEvents[K]> {
    return new Promise((resolve, reject) => {
      const { timeout, filter } = options;
      let timeoutId: NodeJS.Timeout | undefined;

      const listenerId = this.once(
        type,
        (event) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve(event);
        },
        { filter }
      );

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off(listenerId);
          reject(new Error(`Timeout waiting for event: ${String(type)}`));
        }, timeout);
      }
    });
  }

  /**
   * Pipe events to another emitter
   */
  pipe<K extends keyof TEvents>(
    type: K,
    target: TypedEventEmitter<TEvents>,
    options: { transform?: (event: TEvents[K]) => TEvents[K] } = {}
  ): string {
    return this.on(type, (event) => {
      const transformedEvent = options.transform ? options.transform(event) : event;
      target.emit(type, transformedEvent as Omit<TEvents[K], 'type' | 'timestamp'>);
    });
  }

  /**
   * Create a filtered view of this emitter
   */
  filter<K extends keyof TEvents>(type: K, predicate: EventFilter<TEvents[K]>): FilteredEventEmitter<TEvents, K> {
    return new FilteredEventEmitter(this, type, predicate);
  }

  /**
   * Dispose the emitter and clean up resources
   */
  dispose(): void {
    this.offAll();
    this.clearHistory();
    this.emitter.removeAllListeners();
  }
}

// ============================================================================
// EventEmitter Adapter
// ============================================================================

/**
 * Adapter that wraps native EventEmitter to provide TypedEventEmitter interface.
 * This allows gradual migration from EventEmitter to TypedEventEmitter.
 *
 * Usage:
 * ```typescript
 * // Old code (EventEmitter)
 * class MyClass extends EventEmitter {
 *   doSomething() {
 *     this.emit('event', { data: 'value' });
 *   }
 * }
 *
 * // New code (TypedEventEmitterAdapter)
 * class MyClass extends TypedEventEmitterAdapter<MyEvents> {
 *   doSomething() {
 *     this.emitTyped('event', { data: 'value' });
 *   }
 * }
 * ```
 */
export class TypedEventEmitterAdapter<TEvents extends Record<string, BaseEvent> = AllEvents> extends EventEmitter {
  private typedEmitter: TypedEventEmitter<TEvents>;

  constructor(options: { maxHistorySize?: number } = {}) {
    super();
    this.typedEmitter = new TypedEventEmitter<TEvents>(options);
  }

  /**
   * Type-safe emit (new API)
   */
  emitTyped<K extends keyof TEvents>(
    type: K,
    event: Omit<TEvents[K], 'type' | 'timestamp'>
  ): boolean {
    // Emit through both systems for backward compatibility
    const fullEvent = {
      ...event,
      type: type as string,
      timestamp: Date.now(),
    } as TEvents[K];

    // Emit through native EventEmitter (for old listeners)
    super.emit(type as string, fullEvent);

    // Emit through TypedEventEmitter (for new listeners)
    return this.typedEmitter.emit(type, event);
  }

  /**
   * Type-safe listener (new API)
   */
  onTyped<K extends keyof TEvents>(
    type: K,
    listener: EventListener<TEvents[K]>,
    options?: ListenerOptions<TEvents[K]>
  ): string {
    return this.typedEmitter.on(type, listener, options);
  }

  /**
   * Type-safe once listener (new API)
   */
  onceTyped<K extends keyof TEvents>(
    type: K,
    listener: EventListener<TEvents[K]>,
    options?: Omit<ListenerOptions<TEvents[K]>, 'once'>
  ): string {
    return this.typedEmitter.once(type, listener, options);
  }

  /**
   * Remove typed listener by ID
   */
  offTyped(listenerId: string): boolean {
    return this.typedEmitter.off(listenerId);
  }

  /**
   * Wait for a typed event
   */
  waitForTyped<K extends keyof TEvents>(
    type: K,
    options?: { timeout?: number; filter?: EventFilter<TEvents[K]> }
  ): Promise<TEvents[K]> {
    return this.typedEmitter.waitFor(type, options);
  }

  /**
   * Get the underlying TypedEventEmitter
   */
  getTypedEmitter(): TypedEventEmitter<TEvents> {
    return this.typedEmitter;
  }

  /**
   * Get event statistics
   */
  getEventStats(): EventStats {
    return this.typedEmitter.getStats();
  }

  /**
   * Get event history
   */
  getEventHistory(): EventHistoryEntry[] {
    return this.typedEmitter.getHistory();
  }

  /**
   * Dispose both emitters
   */
  dispose(): void {
    this.typedEmitter.dispose();
    this.removeAllListeners();
  }
}
