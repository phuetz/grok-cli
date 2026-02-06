/**
 * Event Type Guards
 *
 * Type guard functions for narrowing event types at runtime.
 */

import type {
  BaseEvent,
  AllEvents,
  AgentEvent,
  ToolEvent,
  SessionEvent,
  FileEvent,
  CacheHitEvent,
  CacheMissEvent,
  CacheSetEvent,
  CacheDeleteEvent,
  CacheClearEvent,
  CacheExpiredEvent,
  CacheEvictedEvent,
  SyncStartedEvent,
  SyncCompletedEvent,
  SyncFailedEvent,
  SyncProgressEvent,
} from './types.js';

/**
 * Type guard for checking event types
 */
export function isEventType<K extends keyof AllEvents>(
  event: BaseEvent,
  type: K
): event is AllEvents[K] {
  return event.type === type;
}

/**
 * Type guard for agent events
 */
export function isAgentEvent(event: BaseEvent): event is AgentEvent {
  return event.type.startsWith('agent:');
}

/**
 * Type guard for tool events
 */
export function isToolEvent(event: BaseEvent): event is ToolEvent {
  return event.type.startsWith('tool:');
}

/**
 * Type guard for session events
 */
export function isSessionEvent(event: BaseEvent): event is SessionEvent {
  return event.type.startsWith('session:');
}

/**
 * Type guard for file events
 */
export function isFileEvent(event: BaseEvent): event is FileEvent {
  return event.type.startsWith('file:');
}

/**
 * Type guard for cache events
 */
export function isCacheEvent(event: BaseEvent): event is CacheHitEvent | CacheMissEvent | CacheSetEvent | CacheDeleteEvent | CacheClearEvent | CacheExpiredEvent | CacheEvictedEvent {
  return event.type.startsWith('cache:');
}

/**
 * Type guard for sync events
 */
export function isSyncEvent(event: BaseEvent): event is SyncStartedEvent | SyncCompletedEvent | SyncFailedEvent | SyncProgressEvent {
  return event.type.startsWith('sync:');
}
