/**
 * FilteredEventEmitter - A view of an event emitter that only passes events matching a filter
 *
 * Created via TypedEventEmitter.filter() to provide a scoped view of events.
 */

import type { BaseEvent, EventListener, ListenerOptions, EventFilter } from './types.js';
// Note: We use a type-only import for TypedEventEmitter to avoid circular dependency
// at the type level. At runtime, FilteredEventEmitter receives the TypedEventEmitter
// instance via constructor injection, so there is no circular module loading.
import type { TypedEventEmitter } from './typed-emitter.js';

/**
 * FilteredEventEmitter - A view of an event emitter that only passes events matching a filter
 */
export class FilteredEventEmitter<
  TEvents extends Record<string, BaseEvent>,
  K extends keyof TEvents
> {
  private source: TypedEventEmitter<TEvents>;
  private type: K;
  private predicate: EventFilter<TEvents[K]>;
  private listenerIds: string[] = [];

  constructor(source: TypedEventEmitter<TEvents>, type: K, predicate: EventFilter<TEvents[K]>) {
    this.source = source;
    this.type = type;
    this.predicate = predicate;
  }

  /**
   * Add a listener that only receives filtered events
   */
  on(listener: EventListener<TEvents[K]>, options: Omit<ListenerOptions<TEvents[K]>, 'filter'> = {}): string {
    const id = this.source.on(this.type, listener, {
      ...options,
      filter: this.predicate,
    });
    this.listenerIds.push(id);
    return id;
  }

  /**
   * Add a one-time listener that only receives filtered events
   */
  once(listener: EventListener<TEvents[K]>, options: Omit<ListenerOptions<TEvents[K]>, 'filter' | 'once'> = {}): string {
    const id = this.source.once(this.type, listener, {
      ...options,
      filter: this.predicate,
    });
    this.listenerIds.push(id);
    return id;
  }

  /**
   * Remove a specific listener
   */
  off(listenerId: string): boolean {
    const index = this.listenerIds.indexOf(listenerId);
    if (index !== -1) {
      this.listenerIds.splice(index, 1);
    }
    return this.source.off(listenerId);
  }

  /**
   * Remove all listeners created through this filtered emitter
   */
  offAll(): void {
    for (const id of this.listenerIds) {
      this.source.off(id);
    }
    this.listenerIds = [];
  }

  /**
   * Wait for a filtered event
   */
  waitFor(options: { timeout?: number } = {}): Promise<TEvents[K]> {
    return this.source.waitFor(this.type, {
      ...options,
      filter: this.predicate,
    });
  }
}
