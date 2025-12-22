/**
 * Prospective Memory System
 *
 * Implements goal-oriented memory for future tasks and reminders.
 * Based on MemGPT research (UC Berkeley 2023) for stateful AI agents.
 *
 * Features:
 * - Task scheduling and reminders
 * - Goal tracking with progress monitoring
 * - Contextual triggers (time, event, condition)
 * - Priority-based task ordering
 * - Automatic task cleanup
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { getDatabaseManager } from '../database/database-manager.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
export type TriggerType = 'time' | 'event' | 'condition' | 'manual';

export interface ProspectiveTask {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  trigger: TaskTrigger;
  context?: TaskContext;
  progress: number; // 0-100
  subtasks?: SubTask[];
  dependencies?: string[]; // Task IDs
  tags: string[];
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface TaskTrigger {
  type: TriggerType;
  /** For time triggers: ISO date string or cron expression */
  schedule?: string;
  /** For event triggers: event name to listen for */
  event?: string;
  /** For condition triggers: condition to evaluate */
  condition?: string;
  /** Has this trigger fired? */
  fired: boolean;
  /** Last time the trigger was checked */
  lastChecked?: Date;
}

export interface TaskContext {
  /** Files related to this task */
  files?: string[];
  /** Relevant code snippets */
  codeSnippets?: Array<{ file: string; code: string; language: string }>;
  /** User notes */
  notes?: string;
  /** Links/references */
  references?: string[];
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  tasks: string[]; // Task IDs contributing to this goal
  progress: number; // 0-100, calculated from tasks
  status: 'active' | 'achieved' | 'abandoned';
  milestones?: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  targetProgress: number; // e.g., 25, 50, 75, 100
  achieved: boolean;
  achievedAt?: Date;
}

export interface Reminder {
  id: string;
  taskId?: string;
  message: string;
  triggerAt: Date;
  recurring?: {
    interval: 'daily' | 'weekly' | 'monthly';
    count?: number; // How many times to repeat
  };
  dismissed: boolean;
  createdAt: Date;
}

export interface ProspectiveMemoryConfig {
  enabled: boolean;
  maxTasks: number;
  maxGoals: number;
  checkIntervalMs: number; // How often to check triggers
  autoCleanupDays: number; // Days after which completed tasks are archived
}

const DEFAULT_CONFIG: ProspectiveMemoryConfig = {
  enabled: true,
  maxTasks: 1000,
  maxGoals: 100,
  checkIntervalMs: 60000, // Check every minute
  autoCleanupDays: 30,
};

// ============================================================================
// Database Schema Extension
// ============================================================================

const PROSPECTIVE_SCHEMA = `
-- Prospective tasks table
CREATE TABLE IF NOT EXISTS prospective_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('time', 'event', 'condition', 'manual')),
  trigger_schedule TEXT,
  trigger_event TEXT,
  trigger_condition TEXT,
  trigger_fired INTEGER DEFAULT 0,
  trigger_last_checked TEXT,
  context TEXT, -- JSON
  progress INTEGER DEFAULT 0,
  subtasks TEXT, -- JSON array
  dependencies TEXT, -- JSON array of task IDs
  tags TEXT, -- JSON array
  project_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  due_at TEXT,
  completed_at TEXT,
  metadata TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_prospective_tasks_status ON prospective_tasks(status);
CREATE INDEX IF NOT EXISTS idx_prospective_tasks_priority ON prospective_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_prospective_tasks_due ON prospective_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_prospective_tasks_project ON prospective_tasks(project_id);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  tasks TEXT, -- JSON array of task IDs
  progress INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('active', 'achieved', 'abandoned')),
  milestones TEXT, -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES prospective_tasks(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  trigger_at TEXT NOT NULL,
  recurring TEXT, -- JSON
  dismissed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON reminders(trigger_at);
CREATE INDEX IF NOT EXISTS idx_reminders_dismissed ON reminders(dismissed);
`;

// ============================================================================
// Prospective Memory Manager
// ============================================================================

export class ProspectiveMemory extends EventEmitter {
  private config: ProspectiveMemoryConfig;
  private tasks: Map<string, ProspectiveTask> = new Map();
  private goals: Map<string, Goal> = new Map();
  private reminders: Map<string, Reminder> = new Map();
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor(config: Partial<ProspectiveMemoryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the prospective memory system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize database tables
      const db = getDatabaseManager();
      db.getDatabase().exec(PROSPECTIVE_SCHEMA);

      // Load existing data
      await this.loadTasks();
      await this.loadGoals();
      await this.loadReminders();

      // Start trigger checker
      if (this.config.enabled) {
        this.checkIntervalId = setInterval(
          () => this.checkTriggers(),
          this.config.checkIntervalMs
        );
      }

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      logger.warn('Failed to initialize prospective memory', { error });
    }
  }

  // ============================================================================
  // Task Management
  // ============================================================================

  /**
   * Create a new task
   */
  async createTask(options: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    trigger?: Partial<TaskTrigger>;
    context?: TaskContext;
    subtasks?: string[];
    dependencies?: string[];
    tags?: string[];
    projectId?: string;
    dueAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<ProspectiveTask> {
    const id = crypto.randomBytes(8).toString('hex');
    const now = new Date();

    const task: ProspectiveTask = {
      id,
      title: options.title,
      description: options.description,
      priority: options.priority || 'medium',
      status: 'pending',
      trigger: {
        type: options.trigger?.type || 'manual',
        schedule: options.trigger?.schedule,
        event: options.trigger?.event,
        condition: options.trigger?.condition,
        fired: false,
      },
      context: options.context,
      progress: 0,
      subtasks: options.subtasks?.map((title, index) => ({
        id: crypto.randomBytes(4).toString('hex'),
        title,
        completed: false,
        order: index,
      })),
      dependencies: options.dependencies,
      tags: options.tags || [],
      projectId: options.projectId,
      createdAt: now,
      updatedAt: now,
      dueAt: options.dueAt,
      metadata: options.metadata,
    };

    this.tasks.set(id, task);
    await this.saveTask(task);

    this.emit('task:created', { task });

    return task;
  }

  /**
   * Update a task
   */
  async updateTask(
    id: string,
    updates: Partial<Omit<ProspectiveTask, 'id' | 'createdAt'>>
  ): Promise<ProspectiveTask | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updatedTask: ProspectiveTask = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };

    // Update progress based on subtasks if applicable
    if (updatedTask.subtasks && updatedTask.subtasks.length > 0) {
      const completedCount = updatedTask.subtasks.filter(s => s.completed).length;
      updatedTask.progress = Math.round((completedCount / updatedTask.subtasks.length) * 100);
    }

    // Mark as completed if progress is 100%
    if (updatedTask.progress === 100 && updatedTask.status !== 'completed') {
      updatedTask.status = 'completed';
      updatedTask.completedAt = new Date();
    }

    this.tasks.set(id, updatedTask);
    await this.saveTask(updatedTask);

    this.emit('task:updated', { task: updatedTask });

    // Update related goals
    await this.updateGoalProgress();

    return updatedTask;
  }

  /**
   * Complete a subtask
   */
  async completeSubtask(taskId: string, subtaskId: string): Promise<ProspectiveTask | null> {
    const task = this.tasks.get(taskId);
    if (!task || !task.subtasks) return null;

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return null;

    subtask.completed = true;

    return this.updateTask(taskId, { subtasks: task.subtasks });
  }

  /**
   * Get tasks by filter
   */
  getTasks(filter?: {
    status?: TaskStatus | TaskStatus[];
    priority?: TaskPriority | TaskPriority[];
    projectId?: string;
    tags?: string[];
    dueBefore?: Date;
    dueAfter?: Date;
  }): ProspectiveTask[] {
    let results = Array.from(this.tasks.values());

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter(t => statuses.includes(t.status));
    }

    if (filter?.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      results = results.filter(t => priorities.includes(t.priority));
    }

    if (filter?.projectId) {
      results = results.filter(t => t.projectId === filter.projectId);
    }

    if (filter?.tags && filter.tags.length > 0) {
      results = results.filter(t => filter.tags!.some(tag => t.tags.includes(tag)));
    }

    if (filter?.dueBefore) {
      results = results.filter(t => t.dueAt && t.dueAt <= filter.dueBefore!);
    }

    if (filter?.dueAfter) {
      results = results.filter(t => t.dueAt && t.dueAt >= filter.dueAfter!);
    }

    // Sort by priority and due date
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    results.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by due date (earlier first)
      if (a.dueAt && b.dueAt) {
        return a.dueAt.getTime() - b.dueAt.getTime();
      }
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;

      return 0;
    });

    return results;
  }

  /**
   * Get upcoming tasks (due within N days)
   */
  getUpcomingTasks(days: number = 7): ProspectiveTask[] {
    const now = new Date();
    const deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.getTasks({
      status: ['pending', 'in_progress'],
      dueBefore: deadline,
    });
  }

  /**
   * Get overdue tasks
   */
  getOverdueTasks(): ProspectiveTask[] {
    const now = new Date();
    return this.getTasks({ status: ['pending', 'in_progress'] })
      .filter(t => t.dueAt && t.dueAt < now);
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;

    this.tasks.delete(id);

    try {
      const db = getDatabaseManager();
      db.getDatabase().prepare('DELETE FROM prospective_tasks WHERE id = ?').run(id);
    } catch {
      // Ignore database errors
    }

    this.emit('task:deleted', { id });

    return true;
  }

  // ============================================================================
  // Goal Management
  // ============================================================================

  /**
   * Create a new goal
   */
  async createGoal(options: {
    title: string;
    description?: string;
    targetDate?: Date;
    tasks?: string[];
    milestones?: Array<{ title: string; targetProgress: number }>;
  }): Promise<Goal> {
    const id = crypto.randomBytes(8).toString('hex');
    const now = new Date();

    const goal: Goal = {
      id,
      title: options.title,
      description: options.description,
      targetDate: options.targetDate,
      tasks: options.tasks || [],
      progress: 0,
      status: 'active',
      milestones: options.milestones?.map(m => ({
        id: crypto.randomBytes(4).toString('hex'),
        title: m.title,
        targetProgress: m.targetProgress,
        achieved: false,
      })),
      createdAt: now,
      updatedAt: now,
    };

    this.goals.set(id, goal);
    await this.saveGoal(goal);

    this.emit('goal:created', { goal });

    return goal;
  }

  /**
   * Add task to goal
   */
  async addTaskToGoal(goalId: string, taskId: string): Promise<Goal | null> {
    const goal = this.goals.get(goalId);
    if (!goal) return null;

    if (!goal.tasks.includes(taskId)) {
      goal.tasks.push(taskId);
      goal.updatedAt = new Date();
      await this.saveGoal(goal);
      await this.updateGoalProgress();
    }

    return goal;
  }

  /**
   * Update goal progress based on tasks
   */
  private async updateGoalProgress(): Promise<void> {
    for (const goal of this.goals.values()) {
      if (goal.status !== 'active') continue;

      const tasks = goal.tasks
        .map(id => this.tasks.get(id))
        .filter((t): t is ProspectiveTask => t !== undefined);

      if (tasks.length === 0) {
        goal.progress = 0;
      } else {
        const totalProgress = tasks.reduce((sum, t) => sum + t.progress, 0);
        goal.progress = Math.round(totalProgress / tasks.length);
      }

      // Check milestones
      if (goal.milestones) {
        for (const milestone of goal.milestones) {
          if (!milestone.achieved && goal.progress >= milestone.targetProgress) {
            milestone.achieved = true;
            milestone.achievedAt = new Date();
            this.emit('milestone:achieved', { goal, milestone });
          }
        }
      }

      // Check if goal is achieved
      if (goal.progress === 100) {
        goal.status = 'achieved';
        this.emit('goal:achieved', { goal });
      }

      goal.updatedAt = new Date();
      await this.saveGoal(goal);
    }
  }

  /**
   * Get goals
   */
  getGoals(status?: Goal['status']): Goal[] {
    let results = Array.from(this.goals.values());

    if (status) {
      results = results.filter(g => g.status === status);
    }

    return results.sort((a, b) => {
      // Active goals first
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;

      // Then by target date
      if (a.targetDate && b.targetDate) {
        return a.targetDate.getTime() - b.targetDate.getTime();
      }

      return 0;
    });
  }

  // ============================================================================
  // Reminder Management
  // ============================================================================

  /**
   * Create a reminder
   */
  async createReminder(options: {
    message: string;
    triggerAt: Date;
    taskId?: string;
    recurring?: Reminder['recurring'];
  }): Promise<Reminder> {
    const id = crypto.randomBytes(8).toString('hex');

    const reminder: Reminder = {
      id,
      taskId: options.taskId,
      message: options.message,
      triggerAt: options.triggerAt,
      recurring: options.recurring,
      dismissed: false,
      createdAt: new Date(),
    };

    this.reminders.set(id, reminder);
    await this.saveReminder(reminder);

    this.emit('reminder:created', { reminder });

    return reminder;
  }

  /**
   * Get pending reminders
   */
  getPendingReminders(): Reminder[] {
    const now = new Date();
    return Array.from(this.reminders.values())
      .filter(r => !r.dismissed && new Date(r.triggerAt) <= now)
      .sort((a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime());
  }

  /**
   * Dismiss a reminder
   */
  async dismissReminder(id: string): Promise<boolean> {
    const reminder = this.reminders.get(id);
    if (!reminder) return false;

    // Handle recurring reminders
    if (reminder.recurring) {
      const nextTrigger = this.calculateNextTrigger(reminder);
      if (nextTrigger) {
        reminder.triggerAt = nextTrigger;
        await this.saveReminder(reminder);
        this.emit('reminder:rescheduled', { reminder });
        return true;
      }
    }

    reminder.dismissed = true;
    await this.saveReminder(reminder);

    this.emit('reminder:dismissed', { reminder });

    return true;
  }

  /**
   * Calculate next trigger for recurring reminder
   */
  private calculateNextTrigger(reminder: Reminder): Date | null {
    if (!reminder.recurring) return null;

    const current = new Date(reminder.triggerAt);
    let next: Date;

    switch (reminder.recurring.interval) {
      case 'daily':
        next = new Date(current.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        next = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        next = new Date(current);
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        return null;
    }

    return next;
  }

  // ============================================================================
  // Trigger System
  // ============================================================================

  /**
   * Check all triggers
   */
  private async checkTriggers(): Promise<void> {
    const now = new Date();

    for (const task of this.tasks.values()) {
      if (task.status !== 'pending' || task.trigger.fired) continue;

      let shouldFire = false;

      switch (task.trigger.type) {
        case 'time':
          if (task.trigger.schedule) {
            const triggerTime = new Date(task.trigger.schedule);
            shouldFire = triggerTime <= now;
          }
          break;

        case 'condition':
          // Condition evaluation would go here
          // For now, conditions are checked externally
          break;

        case 'event':
          // Events are fired externally via fireEvent()
          break;
      }

      if (shouldFire) {
        task.trigger.fired = true;
        task.trigger.lastChecked = now;
        await this.saveTask(task);

        this.emit('task:triggered', { task });
      }
    }

    // Check reminders
    const pendingReminders = this.getPendingReminders();
    for (const reminder of pendingReminders) {
      this.emit('reminder:due', { reminder });
    }
  }

  /**
   * Fire an event (for event-based triggers)
   */
  async fireEvent(eventName: string, data?: unknown): Promise<ProspectiveTask[]> {
    const triggeredTasks: ProspectiveTask[] = [];

    for (const task of this.tasks.values()) {
      if (
        task.status === 'pending' &&
        task.trigger.type === 'event' &&
        task.trigger.event === eventName &&
        !task.trigger.fired
      ) {
        task.trigger.fired = true;
        task.trigger.lastChecked = new Date();
        await this.saveTask(task);

        triggeredTasks.push(task);
        this.emit('task:triggered', { task, event: eventName, data });
      }
    }

    return triggeredTasks;
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private async loadTasks(): Promise<void> {
    try {
      const db = getDatabaseManager();
      const rows = db.getDatabase().prepare('SELECT * FROM prospective_tasks').all() as Array<Record<string, unknown>>;

      for (const row of rows) {
        const task: ProspectiveTask = {
          id: row.id as string,
          title: row.title as string,
          description: row.description as string | undefined,
          priority: row.priority as TaskPriority,
          status: row.status as TaskStatus,
          trigger: {
            type: row.trigger_type as TriggerType,
            schedule: row.trigger_schedule as string | undefined,
            event: row.trigger_event as string | undefined,
            condition: row.trigger_condition as string | undefined,
            fired: Boolean(row.trigger_fired),
            lastChecked: row.trigger_last_checked
              ? new Date(row.trigger_last_checked as string)
              : undefined,
          },
          context: row.context ? JSON.parse(row.context as string) : undefined,
          progress: row.progress as number,
          subtasks: row.subtasks ? JSON.parse(row.subtasks as string) : undefined,
          dependencies: row.dependencies ? JSON.parse(row.dependencies as string) : undefined,
          tags: row.tags ? JSON.parse(row.tags as string) : [],
          projectId: row.project_id as string | undefined,
          createdAt: new Date(row.created_at as string),
          updatedAt: new Date(row.updated_at as string),
          dueAt: row.due_at ? new Date(row.due_at as string) : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
          metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
        };

        this.tasks.set(task.id, task);
      }
    } catch {
      // Table might not exist yet
    }
  }

  private async saveTask(task: ProspectiveTask): Promise<void> {
    try {
      const db = getDatabaseManager();
      db.getDatabase().prepare(`
        INSERT OR REPLACE INTO prospective_tasks (
          id, title, description, priority, status,
          trigger_type, trigger_schedule, trigger_event, trigger_condition,
          trigger_fired, trigger_last_checked,
          context, progress, subtasks, dependencies, tags,
          project_id, created_at, updated_at, due_at, completed_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        task.id,
        task.title,
        task.description,
        task.priority,
        task.status,
        task.trigger.type,
        task.trigger.schedule,
        task.trigger.event,
        task.trigger.condition,
        task.trigger.fired ? 1 : 0,
        task.trigger.lastChecked?.toISOString(),
        task.context ? JSON.stringify(task.context) : null,
        task.progress,
        task.subtasks ? JSON.stringify(task.subtasks) : null,
        task.dependencies ? JSON.stringify(task.dependencies) : null,
        JSON.stringify(task.tags),
        task.projectId,
        task.createdAt.toISOString(),
        task.updatedAt.toISOString(),
        task.dueAt?.toISOString(),
        task.completedAt?.toISOString(),
        task.metadata ? JSON.stringify(task.metadata) : null
      );
    } catch {
      // Ignore database errors
    }
  }

  private async loadGoals(): Promise<void> {
    try {
      const db = getDatabaseManager();
      const rows = db.getDatabase().prepare('SELECT * FROM goals').all() as Array<Record<string, unknown>>;

      for (const row of rows) {
        const goal: Goal = {
          id: row.id as string,
          title: row.title as string,
          description: row.description as string | undefined,
          targetDate: row.target_date ? new Date(row.target_date as string) : undefined,
          tasks: row.tasks ? JSON.parse(row.tasks as string) : [],
          progress: row.progress as number,
          status: row.status as Goal['status'],
          milestones: row.milestones ? JSON.parse(row.milestones as string) : undefined,
          createdAt: new Date(row.created_at as string),
          updatedAt: new Date(row.updated_at as string),
        };

        this.goals.set(goal.id, goal);
      }
    } catch {
      // Table might not exist yet
    }
  }

  private async saveGoal(goal: Goal): Promise<void> {
    try {
      const db = getDatabaseManager();
      db.getDatabase().prepare(`
        INSERT OR REPLACE INTO goals (
          id, title, description, target_date, tasks, progress, status, milestones,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        goal.id,
        goal.title,
        goal.description,
        goal.targetDate?.toISOString(),
        JSON.stringify(goal.tasks),
        goal.progress,
        goal.status,
        goal.milestones ? JSON.stringify(goal.milestones) : null,
        goal.createdAt.toISOString(),
        goal.updatedAt.toISOString()
      );
    } catch {
      // Ignore database errors
    }
  }

  private async loadReminders(): Promise<void> {
    try {
      const db = getDatabaseManager();
      const rows = db.getDatabase().prepare('SELECT * FROM reminders').all() as Array<Record<string, unknown>>;

      for (const row of rows) {
        const reminder: Reminder = {
          id: row.id as string,
          taskId: row.task_id as string | undefined,
          message: row.message as string,
          triggerAt: new Date(row.trigger_at as string),
          recurring: row.recurring ? JSON.parse(row.recurring as string) : undefined,
          dismissed: Boolean(row.dismissed),
          createdAt: new Date(row.created_at as string),
        };

        this.reminders.set(reminder.id, reminder);
      }
    } catch {
      // Table might not exist yet
    }
  }

  private async saveReminder(reminder: Reminder): Promise<void> {
    try {
      const db = getDatabaseManager();
      db.getDatabase().prepare(`
        INSERT OR REPLACE INTO reminders (
          id, task_id, message, trigger_at, recurring, dismissed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        reminder.id,
        reminder.taskId,
        reminder.message,
        reminder.triggerAt.toISOString(),
        reminder.recurring ? JSON.stringify(reminder.recurring) : null,
        reminder.dismissed ? 1 : 0,
        reminder.createdAt.toISOString()
      );
    } catch {
      // Ignore database errors
    }
  }

  // ============================================================================
  // Context Building
  // ============================================================================

  /**
   * Build context for LLM with prospective information
   */
  buildContext(): string {
    const parts: string[] = [];

    // Upcoming tasks
    const upcoming = this.getUpcomingTasks(7);
    if (upcoming.length > 0) {
      parts.push('📅 Upcoming Tasks (next 7 days):');
      for (const task of upcoming.slice(0, 5)) {
        const dueStr = task.dueAt
          ? ` (due: ${task.dueAt.toLocaleDateString()})`
          : '';
        parts.push(`  - [${task.priority.toUpperCase()}] ${task.title}${dueStr}`);
      }
    }

    // Overdue tasks
    const overdue = this.getOverdueTasks();
    if (overdue.length > 0) {
      parts.push('\n⚠️ Overdue Tasks:');
      for (const task of overdue.slice(0, 5)) {
        parts.push(`  - [${task.priority.toUpperCase()}] ${task.title}`);
      }
    }

    // Active goals
    const activeGoals = this.getGoals('active');
    if (activeGoals.length > 0) {
      parts.push('\n🎯 Active Goals:');
      for (const goal of activeGoals.slice(0, 3)) {
        parts.push(`  - ${goal.title} (${goal.progress}% complete)`);
      }
    }

    // Pending reminders
    const reminders = this.getPendingReminders();
    if (reminders.length > 0) {
      parts.push('\n🔔 Pending Reminders:');
      for (const reminder of reminders.slice(0, 3)) {
        parts.push(`  - ${reminder.message}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Get status display
   */
  formatStatus(): string {
    const pendingTasks = this.getTasks({ status: 'pending' }).length;
    const inProgressTasks = this.getTasks({ status: 'in_progress' }).length;
    const overdueTasks = this.getOverdueTasks().length;
    const activeGoals = this.getGoals('active').length;
    const pendingReminders = this.getPendingReminders().length;

    const lines = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║                  📋 PROSPECTIVE MEMORY                        ║',
      '╠══════════════════════════════════════════════════════════════╣',
      `║ Pending Tasks:     ${pendingTasks.toString().padEnd(40)}║`,
      `║ In Progress:       ${inProgressTasks.toString().padEnd(40)}║`,
      `║ Overdue:           ${overdueTasks.toString().padEnd(40)}║`,
      `║ Active Goals:      ${activeGoals.toString().padEnd(40)}║`,
      `║ Pending Reminders: ${pendingReminders.toString().padEnd(40)}║`,
      '╠══════════════════════════════════════════════════════════════╣',
      '║ /task create | /task list | /goal create | /reminder         ║',
      '╚══════════════════════════════════════════════════════════════╝',
    ];

    return lines.join('\n');
  }

  /**
   * Cleanup old completed tasks
   */
  async cleanup(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.autoCleanupDays);

    let removed = 0;

    for (const [id, task] of this.tasks) {
      if (
        task.status === 'completed' &&
        task.completedAt &&
        task.completedAt < cutoffDate
      ) {
        await this.deleteTask(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Dispose
   */
  dispose(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.removeAllListeners();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let prospectiveMemoryInstance: ProspectiveMemory | null = null;

export function getProspectiveMemory(
  config?: Partial<ProspectiveMemoryConfig>
): ProspectiveMemory {
  if (!prospectiveMemoryInstance) {
    prospectiveMemoryInstance = new ProspectiveMemory(config);
  }
  return prospectiveMemoryInstance;
}

export async function initializeProspectiveMemory(
  config?: Partial<ProspectiveMemoryConfig>
): Promise<ProspectiveMemory> {
  const instance = getProspectiveMemory(config);
  await instance.initialize();
  return instance;
}

export function resetProspectiveMemory(): void {
  if (prospectiveMemoryInstance) {
    prospectiveMemoryInstance.dispose();
  }
  prospectiveMemoryInstance = null;
}
