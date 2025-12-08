/**
 * Unified Cache Types
 *
 * This module provides common cache type definitions that can be used
 * throughout the codebase. Instead of each module defining its own
 * CacheEntry/CacheStats, import from here for consistency.
 *
 * Migration guide:
 * - Use BaseCacheEntry<T> for simple key-value caches
 * - Use TimedCacheEntry<T> for TTL-based caches
 * - Use LRUCacheEntry<T> for LRU caches with access tracking
 * - Use BaseCacheStats for basic statistics
 * - Use DetailedCacheStats for comprehensive statistics
 */

// ============================================================================
// Base Cache Entry Types
// ============================================================================

/**
 * Minimal cache entry - just value and timestamp
 */
export interface BaseCacheEntry<T = unknown> {
  value: T;
  timestamp: number;
}

/**
 * Cache entry with TTL/expiration
 */
export interface TimedCacheEntry<T = unknown> extends BaseCacheEntry<T> {
  expiresAt: number;
  ttl?: number;
}

/**
 * LRU cache entry with access tracking
 */
export interface LRUCacheEntry<T = unknown> extends BaseCacheEntry<T> {
  createdAt: number;
  accessedAt: number;
  accessCount?: number;
}

/**
 * Full-featured cache entry combining all fields
 */
export interface FullCacheEntry<T = unknown> {
  key?: string;
  value: T;
  timestamp: number;
  createdAt: number;
  accessedAt: number;
  expiresAt?: number;
  ttl?: number;
  accessCount?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Cache Statistics Types
// ============================================================================

/**
 * Basic cache statistics
 */
export interface BaseCacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Detailed cache statistics with eviction tracking
 */
export interface DetailedCacheStats extends BaseCacheStats {
  maxSize: number;
  evictions: number;
  totalEntries?: number;
  savedTime?: number;
  savedCalls?: number;
}

/**
 * Cache statistics with breakdown by type/category
 */
export interface CategorizedCacheStats extends DetailedCacheStats {
  byCategory?: Record<string, number>;
  byType?: Record<string, number>;
}

// ============================================================================
// Cache Configuration Types
// ============================================================================

/**
 * Base cache configuration
 */
export interface BaseCacheConfig {
  maxSize: number;
  ttlMs?: number;
  enabled?: boolean;
}

/**
 * LRU cache configuration
 */
export interface LRUCacheConfig<T = unknown> extends BaseCacheConfig {
  onEvict?: (key: string, value: T) => void;
  onExpire?: (key: string, value: T) => void;
}

/**
 * Semantic cache configuration (for similarity-based caching)
 */
export interface SemanticCacheConfig extends BaseCacheConfig {
  similarityThreshold: number;
  embeddingDimension?: number;
}

// ============================================================================
// Cache Operation Types
// ============================================================================

/**
 * Result of a cache lookup
 */
export interface CacheLookupResult<T = unknown> {
  found: boolean;
  value?: T;
  expired?: boolean;
  age?: number;
}

/**
 * Cache operation event
 */
export interface CacheEvent<T = unknown> {
  type: 'get' | 'set' | 'delete' | 'evict' | 'expire' | 'clear';
  key: string;
  value?: T;
  timestamp: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an object is a valid cache entry
 */
export function isCacheEntry<T>(obj: unknown): obj is BaseCacheEntry<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'value' in obj &&
    'timestamp' in obj &&
    typeof (obj as BaseCacheEntry<T>).timestamp === 'number'
  );
}

/**
 * Check if a cache entry has expired
 */
export function isExpired(entry: TimedCacheEntry | FullCacheEntry): boolean {
  if (!entry.expiresAt) return false;
  return Date.now() > entry.expiresAt;
}

/**
 * Calculate cache hit rate
 */
export function calculateHitRate(hits: number, misses: number): number {
  const total = hits + misses;
  return total > 0 ? hits / total : 0;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a basic cache entry
 */
export function createCacheEntry<T>(value: T): BaseCacheEntry<T> {
  return {
    value,
    timestamp: Date.now(),
  };
}

/**
 * Create a timed cache entry
 */
export function createTimedCacheEntry<T>(value: T, ttlMs: number): TimedCacheEntry<T> {
  const now = Date.now();
  return {
    value,
    timestamp: now,
    expiresAt: now + ttlMs,
    ttl: ttlMs,
  };
}

/**
 * Create an LRU cache entry
 */
export function createLRUCacheEntry<T>(value: T): LRUCacheEntry<T> {
  const now = Date.now();
  return {
    value,
    timestamp: now,
    createdAt: now,
    accessedAt: now,
    accessCount: 1,
  };
}

/**
 * Create initial cache statistics
 */
export function createCacheStats(maxSize: number = 0): DetailedCacheStats {
  return {
    size: 0,
    maxSize,
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0,
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic cache interface
 */
export interface ICache<T = unknown> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  getStats?(): BaseCacheStats | DetailedCacheStats;
}

/**
 * Async cache interface (for persistence-backed caches)
 */
export interface IAsyncCache<T = unknown> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}
