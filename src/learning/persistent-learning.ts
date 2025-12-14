/**
 * Persistent Learning System
 *
 * Manages learning from:
 * - Repair attempts (what fixes work for which errors)
 * - Code conventions (patterns detected in projects)
 * - Tool effectiveness (which tools work best for which tasks)
 *
 * All data is persisted to SQLite for continuous improvement.
 */

import { EventEmitter } from 'events';
import { getAnalyticsRepository } from '../database/repositories/analytics-repository.js';
import type { RepairLearning, Convention } from '../database/schema.js';
import { getDatabaseManager } from '../database/database-manager.js';

// ============================================================================
// Types
// ============================================================================

export interface RepairAttempt {
  errorMessage: string;
  errorType: 'compile' | 'runtime' | 'test' | 'lint' | 'type';
  strategy: string;
  success: boolean;
  attempts: number;
  language?: string;
  framework?: string;
  fixCode?: string;
  contextHash?: string;
}

export interface ConventionDetection {
  projectId: string;
  category: 'naming' | 'structure' | 'style' | 'testing' | 'docs';
  pattern: string;
  description?: string;
  examples?: string[];
}

export interface ToolUsage {
  toolName: string;
  projectId?: string;
  success: boolean;
  timeMs: number;
  cacheHit: boolean;
}

export interface LearningStats {
  repair: {
    totalPatterns: number;
    avgSuccessRate: number;
    topStrategies: { strategy: string; successRate: number; count: number }[];
  };
  conventions: {
    totalConventions: number;
    byCategory: Record<string, number>;
    avgConfidence: number;
  };
  tools: {
    totalTools: number;
    topTools: { name: string; usage: number; successRate: number }[];
    avgCacheHitRate: number;
  };
}

export interface LearningInsight {
  type: 'repair' | 'convention' | 'tool';
  message: string;
  confidence: number;
  data?: Record<string, unknown>;
}

// ============================================================================
// Persistent Learning System
// ============================================================================

export class PersistentLearning extends EventEmitter {
  private analyticsRepo = getAnalyticsRepository();

  constructor() {
    super();
  }

  // ============================================================================
  // Repair Learning Methods
  // ============================================================================

  /**
   * Record a repair attempt
   */
  recordRepairAttempt(attempt: RepairAttempt): void {
    // Normalize error pattern (remove line numbers, file paths, etc.)
    const normalizedPattern = this.normalizeErrorPattern(attempt.errorMessage);

    this.analyticsRepo.recordRepairAttempt(
      normalizedPattern,
      attempt.errorType,
      attempt.strategy,
      attempt.success,
      attempt.attempts,
      {
        contextHash: attempt.contextHash,
        language: attempt.language,
        framework: attempt.framework,
        example: attempt.fixCode,
      }
    );

    this.emit('repair:recorded', {
      pattern: normalizedPattern,
      strategy: attempt.strategy,
      success: attempt.success,
    });
  }

  /**
   * Get best repair strategies for an error
   */
  getBestRepairStrategies(
    errorMessage: string,
    options: {
      errorType?: RepairAttempt['errorType'];
      language?: string;
      framework?: string;
      limit?: number;
    } = {}
  ): RepairLearning[] {
    const normalizedPattern = this.normalizeErrorPattern(errorMessage);

    return this.analyticsRepo.getBestStrategies(normalizedPattern, {
      errorType: options.errorType,
      language: options.language,
      framework: options.framework,
      minSuccessRate: 0.3, // At least 30% success rate
    }, options.limit || 5);
  }

  /**
   * Get repair statistics
   */
  getRepairStats(): LearningStats['repair'] {
    const stats = this.analyticsRepo.getRepairStats();

    // Get top strategies
    const db = getDatabaseManager().getDatabase();
    const topStrategies = db.prepare(`
      SELECT strategy, AVG(success_rate) as successRate, COUNT(*) as count
      FROM repair_learning
      WHERE success_rate > 0
      GROUP BY strategy
      ORDER BY successRate DESC, count DESC
      LIMIT 10
    `).all() as { strategy: string; successRate: number; count: number }[];

    return {
      totalPatterns: stats.totalPatterns,
      avgSuccessRate: stats.avgSuccessRate,
      topStrategies,
    };
  }

  // ============================================================================
  // Convention Learning Methods
  // ============================================================================

  /**
   * Record a detected convention
   */
  recordConvention(detection: ConventionDetection): void {
    const db = getDatabaseManager().getDatabase();

    const stmt = db.prepare(`
      INSERT INTO conventions (project_id, category, pattern, description, confidence, occurrences, examples)
      VALUES (?, ?, ?, ?, 0.5, 1, ?)
      ON CONFLICT(project_id, category, pattern) DO UPDATE SET
        occurrences = conventions.occurrences + 1,
        confidence = MIN(1.0, conventions.confidence + 0.1),
        examples = ?,
        updated_at = CURRENT_TIMESTAMP
    `);

    const examplesJson = detection.examples ? JSON.stringify(detection.examples) : null;

    stmt.run(
      detection.projectId,
      detection.category,
      detection.pattern,
      detection.description || null,
      examplesJson,
      examplesJson
    );

    this.emit('convention:recorded', detection);
  }

  /**
   * Get conventions for a project
   */
  getProjectConventions(
    projectId: string,
    options: { category?: string; minConfidence?: number } = {}
  ): Convention[] {
    const db = getDatabaseManager().getDatabase();

    let sql = 'SELECT * FROM conventions WHERE project_id = ?';
    const params: unknown[] = [projectId];

    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }

    if (options.minConfidence !== undefined) {
      sql += ' AND confidence >= ?';
      params.push(options.minConfidence);
    }

    sql += ' ORDER BY confidence DESC, occurrences DESC';

    const results = db.prepare(sql).all(...params) as (Convention & { examples: string | null })[];

    return results.map(r => ({
      ...r,
      examples: r.examples ? JSON.parse(r.examples) : undefined,
    }));
  }

  /**
   * Get convention statistics
   */
  getConventionStats(projectId?: string): LearningStats['conventions'] {
    const db = getDatabaseManager().getDatabase();

    let whereClause = '';
    const params: unknown[] = [];

    if (projectId) {
      whereClause = ' WHERE project_id = ?';
      params.push(projectId);
    }

    const total = (db.prepare(`SELECT COUNT(*) as count FROM conventions${whereClause}`).get(...params) as { count: number }).count;

    const avgConfidence = (db.prepare(`SELECT AVG(confidence) as avg FROM conventions${whereClause}`).get(...params) as { avg: number | null }).avg || 0;

    const categoryRows = db.prepare(`
      SELECT category, COUNT(*) as count FROM conventions${whereClause}
      GROUP BY category
    `).all(...params) as { category: string; count: number }[];

    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    return {
      totalConventions: total,
      byCategory,
      avgConfidence,
    };
  }

  // ============================================================================
  // Tool Learning Methods
  // ============================================================================

  /**
   * Record tool usage
   */
  recordToolUsage(usage: ToolUsage): void {
    this.analyticsRepo.recordToolUsage(
      usage.toolName,
      usage.success,
      usage.timeMs,
      usage.cacheHit,
      usage.projectId
    );

    this.emit('tool:recorded', usage);
  }

  /**
   * Get tool statistics
   */
  getToolStats(projectId?: string): LearningStats['tools'] {
    const stats = this.analyticsRepo.getToolStats(projectId);
    const topTools = this.analyticsRepo.getTopTools(10);

    // Calculate average cache hit rate
    let totalHits = 0;
    let totalTotal = 0;
    for (const stat of stats) {
      totalHits += stat.cache_hits;
      totalTotal += stat.cache_hits + stat.cache_misses;
    }

    return {
      totalTools: stats.length,
      topTools: topTools.map(t => ({
        name: t.tool_name,
        usage: t.usage,
        successRate: t.success_rate,
      })),
      avgCacheHitRate: totalTotal > 0 ? totalHits / totalTotal : 0,
    };
  }

  /**
   * Get best tool for a task type
   */
  getBestToolForTask(taskType: string, projectId?: string): { tool: string; confidence: number } | null {
    const db = getDatabaseManager().getDatabase();

    // Map task types to tool patterns
    const toolPatterns: Record<string, string[]> = {
      'search': ['search', 'grep', 'find', 'glob'],
      'edit': ['str_replace_editor', 'multi_edit'],
      'read': ['view_file', 'read'],
      'execute': ['bash', 'execute_command'],
      'git': ['git_status', 'git_diff', 'git_commit'],
    };

    const patterns = toolPatterns[taskType] || [taskType];
    const placeholders = patterns.map(() => '?').join(',');

    let sql = `
      SELECT tool_name, success_count * 1.0 / (success_count + failure_count) as success_rate
      FROM tool_stats
      WHERE tool_name IN (${placeholders})
    `;
    const params: unknown[] = [...patterns];

    if (projectId) {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }

    sql += ' ORDER BY success_rate DESC, success_count DESC LIMIT 1';

    const result = db.prepare(sql).get(...params) as { tool_name: string; success_rate: number } | undefined;

    if (!result) return null;

    return {
      tool: result.tool_name,
      confidence: result.success_rate,
    };
  }

  // ============================================================================
  // Insight Generation
  // ============================================================================

  /**
   * Generate learning insights
   */
  generateInsights(projectId?: string): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Repair insights
    const repairStats = this.getRepairStats();
    if (repairStats.topStrategies.length > 0) {
      const topStrategy = repairStats.topStrategies[0];
      insights.push({
        type: 'repair',
        message: `"${topStrategy.strategy}" is the most effective repair strategy with ${(topStrategy.successRate * 100).toFixed(0)}% success rate`,
        confidence: topStrategy.successRate,
        data: { strategy: topStrategy.strategy, count: topStrategy.count },
      });
    }

    // Convention insights
    if (projectId) {
      const conventions = this.getProjectConventions(projectId, { minConfidence: 0.7 });
      for (const conv of conventions.slice(0, 3)) {
        insights.push({
          type: 'convention',
          message: `Detected ${conv.category} convention: ${conv.pattern}`,
          confidence: conv.confidence,
          data: { category: conv.category, pattern: conv.pattern },
        });
      }
    }

    // Tool insights
    const toolStats = this.getToolStats(projectId);
    if (toolStats.topTools.length > 0) {
      const topTool = toolStats.topTools[0];
      insights.push({
        type: 'tool',
        message: `"${topTool.name}" is the most used tool with ${(topTool.successRate * 100).toFixed(0)}% success rate`,
        confidence: topTool.successRate,
        data: { tool: topTool.name, usage: topTool.usage },
      });
    }

    // Cache insight
    if (toolStats.avgCacheHitRate > 0.5) {
      insights.push({
        type: 'tool',
        message: `Tool caching is effective with ${(toolStats.avgCacheHitRate * 100).toFixed(0)}% hit rate`,
        confidence: toolStats.avgCacheHitRate,
        data: { hitRate: toolStats.avgCacheHitRate },
      });
    }

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get comprehensive learning stats
   */
  getStats(projectId?: string): LearningStats {
    return {
      repair: this.getRepairStats(),
      conventions: this.getConventionStats(projectId),
      tools: this.getToolStats(projectId),
    };
  }

  /**
   * Format stats for display
   */
  formatStats(projectId?: string): string {
    const stats = this.getStats(projectId);
    const lines: string[] = [];

    lines.push('📚 Learning Statistics');
    lines.push('═'.repeat(40));

    // Repair Learning
    lines.push('');
    lines.push('🔧 Repair Learning');
    lines.push(`  Patterns learned: ${stats.repair.totalPatterns}`);
    lines.push(`  Average success rate: ${(stats.repair.avgSuccessRate * 100).toFixed(1)}%`);
    if (stats.repair.topStrategies.length > 0) {
      lines.push('  Top strategies:');
      for (const s of stats.repair.topStrategies.slice(0, 3)) {
        lines.push(`    • ${s.strategy}: ${(s.successRate * 100).toFixed(0)}% (${s.count} uses)`);
      }
    }

    // Conventions
    lines.push('');
    lines.push('📋 Conventions');
    lines.push(`  Total conventions: ${stats.conventions.totalConventions}`);
    lines.push(`  Average confidence: ${(stats.conventions.avgConfidence * 100).toFixed(1)}%`);
    const categories = Object.entries(stats.conventions.byCategory);
    if (categories.length > 0) {
      lines.push('  By category:');
      for (const [cat, count] of categories) {
        lines.push(`    • ${cat}: ${count}`);
      }
    }

    // Tools
    lines.push('');
    lines.push('🛠️ Tool Usage');
    lines.push(`  Tools tracked: ${stats.tools.totalTools}`);
    lines.push(`  Cache hit rate: ${(stats.tools.avgCacheHitRate * 100).toFixed(1)}%`);
    if (stats.tools.topTools.length > 0) {
      lines.push('  Top tools:');
      for (const t of stats.tools.topTools.slice(0, 5)) {
        lines.push(`    • ${t.name}: ${t.usage} uses (${(t.successRate * 100).toFixed(0)}% success)`);
      }
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Normalize error pattern for matching
   */
  private normalizeErrorPattern(error: string): string {
    return error
      // Remove line numbers
      .replace(/:\d+:\d+/g, ':N:N')
      .replace(/line \d+/gi, 'line N')
      // Remove file paths
      .replace(/\/[\w\-./]+\.(ts|js|tsx|jsx|py|go|rs)/g, 'FILE')
      // Remove specific identifiers that vary
      .replace(/'[^']+'/g, "'X'")
      .replace(/"[^"]+"/g, '"X"')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Limit length
      .substring(0, 200);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: PersistentLearning | null = null;

export function getPersistentLearning(): PersistentLearning {
  if (!instance) {
    instance = new PersistentLearning();
  }
  return instance;
}

export function resetPersistentLearning(): void {
  if (instance) {
    instance.removeAllListeners();
  }
  instance = null;
}
