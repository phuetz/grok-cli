/**
 * Concurrency Module
 *
 * Utilities for managing concurrent operations including
 * session lanes, rate limiting, and backpressure.
 *
 * Two lane systems available:
 * 1. SessionLane/LaneManager - Original session-based lanes
 * 2. LaneQueue (OpenClaw-inspired) - "Default Serial, Explicit Parallel" pattern
 */

export type {
  LaneItem,
  LaneStatus,
  LaneEvents,
  LaneConfig,
} from './lanes.js';

export {
  DEFAULT_LANE_CONFIG,
  SessionLane,
  LaneManager,
  getLaneManager,
  resetLaneManager,
  withLane,
  createLanedFunction,
} from './lanes.js';

// OpenClaw-inspired Lane Queue (Default Serial, Explicit Parallel)
export type {
  Task,
  TaskStatus,
  TaskOptions,
  Lane,
  LaneStats,
  LaneQueueConfig,
  LaneQueueEvents,
} from './lane-queue.js';

export {
  DEFAULT_LANE_QUEUE_CONFIG,
  LaneQueue,
  getLaneQueue,
  resetLaneQueue,
} from './lane-queue.js';
