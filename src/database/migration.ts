/**
 * Database Migration Utility
 *
 * Migrates existing JSON-based storage to SQLite database.
 *
 * Supports migration of:
 * - Memories from enhanced-memory.ts
 * - Sessions from session-store.ts
 * - Cache from semantic-cache.ts
 * - Cost data from cost-tracker.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { getDatabaseManager } from './database-manager.js';
import { getMemoryRepository } from './repositories/memory-repository.js';
import { getSessionRepository } from './repositories/session-repository.js';
import { getCacheRepository } from './repositories/cache-repository.js';
import { getAnalyticsRepository } from './repositories/analytics-repository.js';
import type { MemoryType } from './schema.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface MigrationResult {
  success: boolean;
  migratedItems: {
    memories: number;
    sessions: number;
    cache: number;
    analytics: number;
  };
  errors: string[];
  duration: number;
}

export interface MigrationOptions {
  dryRun?: boolean;
  deleteAfterMigration?: boolean;
  verbose?: boolean;
}

// Old JSON data structures
interface OldMemoryEntry {
  id: string;
  type: string;
  content: string;
  summary?: string;
  embedding?: number[];
  importance: number;
  accessCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastAccessedAt: string | Date;
  expiresAt?: string | Date;
  tags: string[];
  metadata: Record<string, unknown>;
  projectId?: string;
  sessionId?: string;
}

interface OldSessionData {
  id: string;
  projectId?: string;
  projectPath?: string;
  name?: string;
  model?: string;
  messages: {
    role: string;
    content?: string;
    toolCalls?: unknown[];
    toolCallId?: string;
  }[];
  createdAt: string | Date;
  updatedAt: string | Date;
  totalCost?: number;
  totalTokensIn?: number;
  totalTokensOut?: number;
}

interface OldCacheEntry {
  key: string;
  value: unknown;
  embedding?: number[];
  createdAt: string | Date;
  expiresAt?: string | Date;
  hits: number;
}

interface OldCostData {
  daily: Record<string, number>;
  sessions: { cost: number; tokens: number; model: string; date: string }[];
}

// ============================================================================
// Migration Paths
// ============================================================================

const MIGRATION_PATHS = {
  memories: path.join(os.homedir(), '.codebuddy', 'memories.json'),
  sessions: path.join(os.homedir(), '.codebuddy', 'sessions'),
  cache: path.join(os.homedir(), '.codebuddy', 'cache', 'semantic-cache.json'),
  costData: path.join(os.homedir(), '.codebuddy', 'cost-history.json'),
  projectMemories: (projectPath: string) => path.join(projectPath, '.codebuddy', 'memories.json'),
  projectSessions: (projectPath: string) => path.join(projectPath, '.codebuddy', 'sessions'),
};

// ============================================================================
// Migration Class
// ============================================================================

export class DatabaseMigration extends EventEmitter {
  private options: MigrationOptions;
  private errors: string[] = [];

  constructor(options: MigrationOptions = {}) {
    super();
    this.options = options;
  }

  /**
   * Run full migration
   */
  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      migratedItems: {
        memories: 0,
        sessions: 0,
        cache: 0,
        analytics: 0,
      },
      errors: [],
      duration: 0,
    };

    try {
      // Ensure database is initialized
      const dbManager = getDatabaseManager();
      if (!dbManager.isInitialized()) {
        await dbManager.initialize();
      }

      // Migrate memories
      this.emit('progress', { phase: 'memories', status: 'starting' });
      result.migratedItems.memories = await this.migrateMemories();
      this.emit('progress', { phase: 'memories', status: 'complete', count: result.migratedItems.memories });

      // Migrate sessions
      this.emit('progress', { phase: 'sessions', status: 'starting' });
      result.migratedItems.sessions = await this.migrateSessions();
      this.emit('progress', { phase: 'sessions', status: 'complete', count: result.migratedItems.sessions });

      // Migrate cache
      this.emit('progress', { phase: 'cache', status: 'starting' });
      result.migratedItems.cache = await this.migrateCache();
      this.emit('progress', { phase: 'cache', status: 'complete', count: result.migratedItems.cache });

      // Migrate cost data
      this.emit('progress', { phase: 'analytics', status: 'starting' });
      result.migratedItems.analytics = await this.migrateCostData();
      this.emit('progress', { phase: 'analytics', status: 'complete', count: result.migratedItems.analytics });

    } catch (error) {
      result.success = false;
      const errMsg = error instanceof Error ? error.message : String(error);
      this.errors.push(`Migration failed: ${errMsg}`);
    }

    result.errors = [...this.errors];
    result.duration = Date.now() - startTime;

    this.emit('complete', result);
    return result;
  }

  /**
   * Migrate memories
   */
  private async migrateMemories(): Promise<number> {
    let count = 0;

    // Migrate global memories
    if (fs.existsSync(MIGRATION_PATHS.memories)) {
      count += await this.migrateMemoriesFile(MIGRATION_PATHS.memories, 'user');
    }

    return count;
  }

  private async migrateMemoriesFile(filePath: string, scope: 'user' | 'project', projectId?: string): Promise<number> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      const memories: OldMemoryEntry[] = Array.isArray(data) ? data : (data.memories || []);

      if (this.options.dryRun) {
        this.log(`[DRY RUN] Would migrate ${memories.length} memories from ${filePath}`);
        return memories.length;
      }

      const memoryRepo = getMemoryRepository();
      let count = 0;

      for (const oldMemory of memories) {
        try {
          // Convert type
          const validTypes: MemoryType[] = ['fact', 'preference', 'pattern', 'decision', 'context', 'summary', 'instruction', 'error', 'definition', 'convention'];
          const memoryType = validTypes.includes(oldMemory.type as MemoryType)
            ? (oldMemory.type as MemoryType)
            : 'fact';

          // Convert embedding
          const embedding = oldMemory.embedding
            ? new Float32Array(oldMemory.embedding)
            : undefined;

          memoryRepo.create({
            id: oldMemory.id,
            type: memoryType,
            scope,
            project_id: projectId || oldMemory.projectId,
            content: oldMemory.content,
            embedding,
            importance: oldMemory.importance || 0.5,
            expires_at: oldMemory.expiresAt
              ? new Date(oldMemory.expiresAt).toISOString()
              : undefined,
            metadata: {
              ...oldMemory.metadata,
              tags: oldMemory.tags,
              summary: oldMemory.summary,
              migratedFrom: 'json',
            },
          });
          count++;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.errors.push(`Failed to migrate memory ${oldMemory.id}: ${errMsg}`);
        }
      }

      // Optionally delete source file
      if (this.options.deleteAfterMigration && count > 0) {
        fs.renameSync(filePath, filePath + '.migrated');
      }

      return count;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.errors.push(`Failed to read memories file ${filePath}: ${errMsg}`);
      return 0;
    }
  }

  /**
   * Migrate sessions
   */
  private async migrateSessions(): Promise<number> {
    const sessionsDir = MIGRATION_PATHS.sessions;
    if (!fs.existsSync(sessionsDir)) return 0;

    let count = 0;

    try {
      const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        count += await this.migrateSessionFile(path.join(sessionsDir, file));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.errors.push(`Failed to read sessions directory: ${errMsg}`);
    }

    return count;
  }

  private async migrateSessionFile(filePath: string): Promise<number> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const session: OldSessionData = JSON.parse(content);

      if (this.options.dryRun) {
        this.log(`[DRY RUN] Would migrate session ${session.id} with ${session.messages?.length || 0} messages`);
        return 1;
      }

      const sessionRepo = getSessionRepository();

      // Create session
      const newSession = sessionRepo.createSession({
        id: session.id,
        project_id: session.projectId,
        project_path: session.projectPath,
        name: session.name,
        model: session.model,
        metadata: { migratedFrom: 'json' },
      });

      // Add messages
      if (session.messages && Array.isArray(session.messages)) {
        for (const msg of session.messages) {
          sessionRepo.addMessage({
            session_id: newSession.id,
            role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
            content: msg.content,
            tool_calls: msg.toolCalls,
            tool_call_id: msg.toolCallId,
          });
        }
      }

      // Update stats if available
      if (session.totalCost || session.totalTokensIn || session.totalTokensOut) {
        sessionRepo.updateSessionStats(newSession.id, {
          cost: session.totalCost,
          tokensIn: session.totalTokensIn,
          tokensOut: session.totalTokensOut,
        });
      }

      // Optionally delete source file
      if (this.options.deleteAfterMigration) {
        fs.renameSync(filePath, filePath + '.migrated');
      }

      return 1;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.errors.push(`Failed to migrate session ${filePath}: ${errMsg}`);
      return 0;
    }
  }

  /**
   * Migrate cache
   */
  private async migrateCache(): Promise<number> {
    const cachePath = MIGRATION_PATHS.cache;
    if (!fs.existsSync(cachePath)) return 0;

    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      const data = JSON.parse(content);

      const entries: OldCacheEntry[] = Array.isArray(data) ? data : (data.entries || []);

      if (this.options.dryRun) {
        this.log(`[DRY RUN] Would migrate ${entries.length} cache entries`);
        return entries.length;
      }

      const cacheRepo = getCacheRepository();
      let count = 0;

      for (const entry of entries) {
        try {
          // Skip expired entries
          if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
            continue;
          }

          const embedding = entry.embedding
            ? new Float32Array(entry.embedding)
            : undefined;

          // Calculate remaining TTL
          const expiresAt = entry.expiresAt ? new Date(entry.expiresAt) : undefined;
          const ttlMs = expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : undefined;

          cacheRepo.set(entry.key, entry.value, {
            ttlMs,
            embedding,
            category: 'migrated',
          });
          count++;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.errors.push(`Failed to migrate cache entry ${entry.key}: ${errMsg}`);
        }
      }

      if (this.options.deleteAfterMigration && count > 0) {
        fs.renameSync(cachePath, cachePath + '.migrated');
      }

      return count;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.errors.push(`Failed to read cache file: ${errMsg}`);
      return 0;
    }
  }

  /**
   * Migrate cost data
   */
  private async migrateCostData(): Promise<number> {
    const costPath = MIGRATION_PATHS.costData;
    if (!fs.existsSync(costPath)) return 0;

    try {
      const content = fs.readFileSync(costPath, 'utf-8');
      const data: OldCostData = JSON.parse(content);

      if (this.options.dryRun) {
        const dailyCount = Object.keys(data.daily || {}).length;
        const sessionCount = (data.sessions || []).length;
        this.log(`[DRY RUN] Would migrate ${dailyCount} daily records and ${sessionCount} session records`);
        return dailyCount + sessionCount;
      }

      const analyticsRepo = getAnalyticsRepository();
      let count = 0;

      // Migrate daily costs
      if (data.daily) {
        for (const [date, cost] of Object.entries(data.daily)) {
          try {
            analyticsRepo.recordAnalytics({
              date,
              cost: cost as number,
              tokens_in: 0,
              tokens_out: 0,
              requests: 1,
              tool_calls: 0,
              errors: 0,
              avg_response_time_ms: 0,
              cache_hit_rate: 0,
              session_count: 0,
            });
            count++;
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.errors.push(`Failed to migrate daily cost ${date}: ${errMsg}`);
          }
        }
      }

      // Migrate session costs
      if (data.sessions) {
        for (const session of data.sessions) {
          try {
            analyticsRepo.recordAnalytics({
              date: session.date || new Date().toISOString().split('T')[0],
              model: session.model,
              cost: session.cost,
              tokens_in: Math.floor(session.tokens * 0.7), // Estimate
              tokens_out: Math.floor(session.tokens * 0.3),
              requests: 1,
              tool_calls: 0,
              errors: 0,
              avg_response_time_ms: 0,
              cache_hit_rate: 0,
              session_count: 1,
            });
            count++;
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.errors.push(`Failed to migrate session cost: ${errMsg}`);
          }
        }
      }

      if (this.options.deleteAfterMigration && count > 0) {
        fs.renameSync(costPath, costPath + '.migrated');
      }

      return count;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.errors.push(`Failed to read cost data file: ${errMsg}`);
      return 0;
    }
  }

  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    return (
      fs.existsSync(MIGRATION_PATHS.memories) ||
      fs.existsSync(MIGRATION_PATHS.sessions) ||
      fs.existsSync(MIGRATION_PATHS.cache) ||
      fs.existsSync(MIGRATION_PATHS.costData)
    );
  }

  /**
   * Get migration status
   */
  static getStatus(): {
    needsMigration: boolean;
    files: { path: string; exists: boolean; size?: number }[];
  } {
    const files = [
      MIGRATION_PATHS.memories,
      MIGRATION_PATHS.sessions,
      MIGRATION_PATHS.cache,
      MIGRATION_PATHS.costData,
    ].map(p => ({
      path: p,
      exists: fs.existsSync(p),
      size: fs.existsSync(p) && fs.statSync(p).isFile() ? fs.statSync(p).size : undefined,
    }));

    return {
      needsMigration: files.some(f => f.exists),
      files,
    };
  }

  private log(message: string): void {
    if (this.options.verbose) {
      logger.info(message);
    }
    this.emit('log', message);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Run migration with default options
 */
export async function runMigration(options: MigrationOptions = {}): Promise<MigrationResult> {
  const migration = new DatabaseMigration(options);
  return migration.migrate();
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  return DatabaseMigration.needsMigration();
}

/**
 * Get migration status
 */
export function getMigrationStatus(): ReturnType<typeof DatabaseMigration.getStatus> {
  return DatabaseMigration.getStatus();
}
