/**
 * EventBus - Global event bus singleton and convenience functions
 *
 * Provides centralized event management for the application.
 */

import type { BaseEvent, AllEvents, ApplicationEvents } from './types.js';
import { TypedEventEmitter } from './typed-emitter.js';

/**
 * EventBus - A global event bus for application-wide events
 */
export class EventBus<TEvents extends Record<string, BaseEvent> = Record<string, BaseEvent>> extends TypedEventEmitter<TEvents> {
  // Using unknown to allow flexible typing for singleton pattern
  private static instance: unknown = null;

  /**
   * Get the singleton instance
   */
  static getInstance<T extends Record<string, BaseEvent> = Record<string, BaseEvent>>(): EventBus<T> {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus<T>();
    }
    return EventBus.instance as EventBus<T>;
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  static resetInstance(): void {
    if (EventBus.instance) {
      (EventBus.instance as EventBus).dispose();
      EventBus.instance = null;
    }
  }
}

// ============================================================================
// Global Event Bus (Unified)
// ============================================================================

/**
 * Get the global typed event bus with all events
 */
export function getGlobalEventBus(): EventBus<AllEvents> {
  return EventBus.getInstance<AllEvents>();
}

// Export a default event bus instance (backward compatible)
export function getEventBus(): EventBus<ApplicationEvents> {
  return EventBus.getInstance<ApplicationEvents>();
}

// Export convenience function to reset the event bus (for testing)
export function resetEventBus(): void {
  EventBus.resetInstance();
}
