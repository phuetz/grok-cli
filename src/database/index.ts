/**
 * Database Module
 *
 * Central SQLite database for code-buddy persistence.
 *
 * Features:
 * - Persistent memories with vector embeddings
 * - Session and message history
 * - Code embeddings for semantic search
 * - Analytics and cost tracking
 * - Tool statistics and repair learning
 * - General-purpose cache with TTL
 */

// Schema and types
export * from './schema.js';

// Migration
export {
  DatabaseMigration,
  MigrationResult,
  MigrationOptions,
  runMigration,
  needsMigration,
  getMigrationStatus,
} from './migration.js';

// Database manager
export {
  DatabaseManager,
  DatabaseConfig,
  DatabaseStats,
  getDatabaseManager,
  initializeDatabase,
  resetDatabaseManager,
} from './database-manager.js';

// Repositories
export {
  // Memory
  MemoryRepository,
  MemoryFilter,
  MemorySearchResult,
  getMemoryRepository,
  resetMemoryRepository,

  // Session
  SessionRepository,
  SessionFilter,
  SessionWithMessages,
  getSessionRepository,
  resetSessionRepository,

  // Analytics
  AnalyticsRepository,
  AnalyticsFilter,
  RepairLearningFilter,
  getAnalyticsRepository,
  resetAnalyticsRepository,

  // Embedding
  EmbeddingRepository,
  EmbeddingFilter,
  EmbeddingSearchResult,
  getEmbeddingRepository,
  resetEmbeddingRepository,

  // Cache
  CacheRepository,
  CacheEntry,
  CacheFilter,
  getCacheRepository,
  resetCacheRepository,
} from './repositories/index.js';

// ============================================================================
// Convenience Functions
// ============================================================================

import { initializeDatabase, resetDatabaseManager } from './database-manager.js';
import {
  resetMemoryRepository,
  resetSessionRepository,
  resetAnalyticsRepository,
  resetEmbeddingRepository,
  resetCacheRepository,
} from './repositories/index.js';

// Integration layer
export {
  DatabaseIntegration,
  DatabaseIntegrationConfig,
  MemoryAddOptions,
  MemorySearchOptions,
  getDatabaseIntegration,
  initializeDatabaseIntegration,
  resetDatabaseIntegration,
} from './integration.js';

/**
 * Initialize the entire database system
 */
export async function initializeDatabaseSystem(config?: {
  dbPath?: string;
  inMemory?: boolean;
  verbose?: boolean;
}): Promise<void> {
  await initializeDatabase(config);
}

/**
 * Reset all database components (for testing)
 */
export function resetDatabaseSystem(): void {
  resetMemoryRepository();
  resetSessionRepository();
  resetAnalyticsRepository();
  resetEmbeddingRepository();
  resetCacheRepository();
  resetDatabaseManager();
}
