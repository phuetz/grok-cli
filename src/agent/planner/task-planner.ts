/**
 * Task Planner
 *
 * Decomposes complex requests into a DAG of sub-tasks using LLM.
 * Estimates complexity, cost, and duration.
 */

import { EventEmitter } from 'events';
import { TaskGraph, PlannedTask } from './task-graph.js';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface TaskPlan {
  id: string;
  mainGoal: string;
  tasks: PlannedTask[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedTokens: number;
  createdAt: Date;
}

export interface PlannerConfig {
  /** Minimum complexity to trigger planning */
  complexityThreshold: number;
  /** Max tasks in a plan */
  maxTasks: number;
  /** Enable auto-delegation to subagents */
  autoDelegation: boolean;
}

const DEFAULT_PLANNER_CONFIG: PlannerConfig = {
  complexityThreshold: 3,
  maxTasks: 20,
  autoDelegation: true,
};

// ============================================================================
// Task Planner
// ============================================================================

export class TaskPlanner extends EventEmitter {
  private config: PlannerConfig;

  constructor(config: Partial<PlannerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PLANNER_CONFIG, ...config };
  }

  /**
   * Determine if a request needs planning (vs direct execution)
   */
  needsPlanning(request: string): boolean {
    const indicators = [
      /\band\b.*\band\b/i,           // Multiple "and" clauses
      /\bthen\b/i,                     // Sequential steps
      /\bfirst\b.*\bthen\b/i,         // Ordered steps
      /\brefactor\b/i,                // Complex operations
      /\bmigrate\b/i,
      /\bimplement\b.*\bsystem\b/i,
      /\badd\b.*\bfeature\b/i,
      /\bupdate\b.*\ball\b/i,
      /multiple\s+files/i,
      /across\s+(the\s+)?codebase/i,
    ];

    const matchCount = indicators.filter(r => r.test(request)).length;
    return matchCount >= 2 || request.length > 500;
  }

  /**
   * Create a plan from a request using LLM decomposition
   */
  async createPlan(
    request: string,
    decompose: (prompt: string) => Promise<string>
  ): Promise<TaskPlan> {
    const planPrompt = `Decompose this request into a sequence of concrete, actionable sub-tasks.
For each task, specify:
- id: short unique identifier (e.g., "t1", "t2")
- description: what to do
- dependencies: list of task IDs that must complete first (empty array if none)
- delegateTo: optional specialist (code-reviewer, debugger, test-runner, explorer, refactorer, documenter)

Return ONLY valid JSON array of tasks, no other text.

Request: ${request}`;

    try {
      const response = await decompose(planPrompt);
      const tasks = this.parseDecomposition(response);

      const plan: TaskPlan = {
        id: `plan-${Date.now()}`,
        mainGoal: request,
        tasks,
        estimatedComplexity: this.estimateComplexity(tasks),
        estimatedTokens: tasks.reduce((sum, t) => sum + (t.estimatedTokens || 2000), 0),
        createdAt: new Date(),
      };

      this.emit('plan:created', plan);
      return plan;
    } catch (error) {
      logger.error('Failed to create plan', error as Error);
      // Fallback: single task
      return {
        id: `plan-${Date.now()}`,
        mainGoal: request,
        tasks: [{
          id: 't1',
          description: request,
          dependencies: [],
          status: 'pending',
        }],
        estimatedComplexity: 'low',
        estimatedTokens: 5000,
        createdAt: new Date(),
      };
    }
  }

  /**
   * Parse LLM decomposition response into PlannedTask array
   */
  private parseDecomposition(response: string): PlannedTask[] {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in decomposition response');
    }

    const raw = JSON.parse(jsonMatch[0]) as Array<{
      id: string;
      description: string;
      dependencies?: string[];
      delegateTo?: string;
      estimatedTokens?: number;
    }>;

    return raw.map(t => ({
      id: t.id,
      description: t.description,
      dependencies: t.dependencies || [],
      delegateTo: t.delegateTo as PlannedTask['delegateTo'],
      estimatedTokens: t.estimatedTokens,
      status: 'pending' as const,
    })).slice(0, this.config.maxTasks);
  }

  /**
   * Estimate overall complexity
   */
  private estimateComplexity(tasks: PlannedTask[]): 'low' | 'medium' | 'high' {
    if (tasks.length <= 2) return 'low';
    if (tasks.length <= 5) return 'medium';
    return 'high';
  }

  /**
   * Build a TaskGraph from a plan
   */
  buildGraph(plan: TaskPlan): TaskGraph {
    return new TaskGraph(plan.tasks);
  }
}

// ============================================================================
// Singleton
// ============================================================================

let plannerInstance: TaskPlanner | null = null;

export function getTaskPlanner(config?: Partial<PlannerConfig>): TaskPlanner {
  if (!plannerInstance) {
    plannerInstance = new TaskPlanner(config);
  }
  return plannerInstance;
}

export function resetTaskPlanner(): void {
  plannerInstance = null;
}
