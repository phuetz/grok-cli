/**
 * Event Trigger System
 *
 * Defines trigger types and conditions for automated agent responses.
 * Supports cooldown to prevent spam.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type TriggerType = 'screen_change' | 'file_change' | 'time' | 'webhook' | 'custom';

export interface TriggerAction {
  type: 'notify' | 'execute' | 'agent_message';
  target: string; // channel for notify, command for execute, message for agent
  args?: Record<string, unknown>;
}

export interface Trigger {
  id: string;
  name: string;
  type: TriggerType;
  condition: string;
  action: TriggerAction;
  cooldownMs: number;
  enabled: boolean;
  createdAt: Date;
  lastFiredAt?: Date;
  fireCount: number;
}

export interface TriggerEvent {
  triggerId: string;
  type: TriggerType;
  data: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// Event Trigger
// ============================================================================

export class EventTriggerManager extends EventEmitter {
  private triggers: Map<string, Trigger> = new Map();
  private cooldowns: Map<string, number> = new Map(); // triggerId -> last fire timestamp

  /**
   * Add a trigger
   */
  addTrigger(trigger: Trigger): void {
    this.triggers.set(trigger.id, trigger);
    this.emit('trigger:added', trigger);
  }

  /**
   * Remove a trigger
   */
  removeTrigger(id: string): boolean {
    const removed = this.triggers.delete(id);
    if (removed) {
      this.cooldowns.delete(id);
      this.emit('trigger:removed', { id });
    }
    return removed;
  }

  /**
   * Get a trigger by ID
   */
  getTrigger(id: string): Trigger | undefined {
    return this.triggers.get(id);
  }

  /**
   * List all triggers
   */
  listTriggers(type?: TriggerType): Trigger[] {
    const all = Array.from(this.triggers.values());
    return type ? all.filter(t => t.type === type) : all;
  }

  /**
   * Evaluate an event against all triggers
   */
  evaluate(event: TriggerEvent): Trigger[] {
    const fired: Trigger[] = [];

    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;
      if (trigger.type !== event.type) continue;

      // Check cooldown
      if (this.isOnCooldown(trigger.id)) continue;

      // Evaluate condition
      if (this.evaluateCondition(trigger.condition, event)) {
        this.fireTrigger(trigger, event);
        fired.push(trigger);
      }
    }

    return fired;
  }

  /**
   * Check if a trigger is on cooldown
   */
  private isOnCooldown(triggerId: string): boolean {
    const lastFire = this.cooldowns.get(triggerId);
    if (!lastFire) return false;

    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    return (Date.now() - lastFire) < trigger.cooldownMs;
  }

  /**
   * Evaluate a condition string against event data
   */
  private evaluateCondition(condition: string, event: TriggerEvent): boolean {
    try {
      // Simple pattern matching conditions
      if (condition === '*' || condition === 'always') return true;

      // Glob-like path matching for file changes
      if (event.type === 'file_change' && event.data.path) {
        const pathStr = String(event.data.path);
        if (condition.includes('*')) {
          // Convert glob to regex: **/ matches zero or more path segments, * matches within segment
          const regexStr = condition
            .replace(/\*\*\//g, '§GLOBSTAR§')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/§GLOBSTAR§/g, '(.*/)?');
          const regex = new RegExp('^' + regexStr + '$');
          return regex.test(pathStr);
        }
        return pathStr.includes(condition);
      }

      // Screen change threshold
      if (event.type === 'screen_change' && event.data.changePercentage !== undefined) {
        const threshold = parseFloat(condition);
        if (!isNaN(threshold)) {
          return (event.data.changePercentage as number) >= threshold;
        }
      }

      // Default: string match
      return JSON.stringify(event.data).includes(condition);
    } catch {
      return false;
    }
  }

  /**
   * Fire a trigger
   */
  private fireTrigger(trigger: Trigger, event: TriggerEvent): void {
    trigger.lastFiredAt = new Date();
    trigger.fireCount++;
    this.cooldowns.set(trigger.id, Date.now());

    this.emit('trigger:fired', { trigger, event });

    logger.debug('Trigger fired', { triggerId: trigger.id, type: trigger.type });
  }

  /**
   * Enable/disable a trigger
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const trigger = this.triggers.get(id);
    if (!trigger) return false;
    trigger.enabled = enabled;
    return true;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let triggerManagerInstance: EventTriggerManager | null = null;

export function getEventTriggerManager(): EventTriggerManager {
  if (!triggerManagerInstance) {
    triggerManagerInstance = new EventTriggerManager();
  }
  return triggerManagerInstance;
}

export function resetEventTriggerManager(): void {
  triggerManagerInstance = null;
}
