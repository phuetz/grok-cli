/**
 * Notification Manager
 *
 * Manages notification preferences, quiet hours, rate limiting, and history.
 */

import { EventEmitter } from 'events';
import type { MessagePriority, ProactiveMessage, DeliveryResult } from './proactive-agent.js';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreferences {
  /** Enabled channels */
  channels: string[];
  /** Quiet hours (24h format) */
  quietHoursStart?: number; // e.g., 22 for 10 PM
  quietHoursEnd?: number;   // e.g., 7 for 7 AM
  /** Max notifications per hour */
  maxPerHour: number;
  /** Min priority to send during quiet hours */
  quietHoursMinPriority: MessagePriority;
}

export interface NotificationRecord {
  timestamp: Date;
  channelType: string;
  priority: MessagePriority;
  delivered: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: ['cli'],
  maxPerHour: 20,
  quietHoursMinPriority: 'urgent',
};

const PRIORITY_LEVELS: Record<MessagePriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

// ============================================================================
// Notification Manager
// ============================================================================

export class NotificationManager extends EventEmitter {
  private preferences: NotificationPreferences;
  private history: NotificationRecord[] = [];
  private maxHistory: number = 1000;

  constructor(preferences: Partial<NotificationPreferences> = {}) {
    super();
    this.preferences = { ...DEFAULT_PREFERENCES, ...preferences };
  }

  /**
   * Check if a notification should be sent
   */
  shouldSend(msg: ProactiveMessage): { allowed: boolean; reason?: string } {
    // Check channel enabled
    if (!this.preferences.channels.includes(msg.channelType)) {
      return { allowed: false, reason: `Channel ${msg.channelType} not enabled` };
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      const minLevel = PRIORITY_LEVELS[this.preferences.quietHoursMinPriority];
      const msgLevel = PRIORITY_LEVELS[msg.priority];
      if (msgLevel < minLevel) {
        return { allowed: false, reason: 'Quiet hours - priority too low' };
      }
    }

    // Check rate limit
    if (this.isRateLimited()) {
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Record a notification
   */
  record(msg: ProactiveMessage, delivered: boolean): void {
    this.history.push({
      timestamp: new Date(),
      channelType: msg.channelType,
      priority: msg.priority,
      delivered,
    });

    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  /**
   * Check if currently in quiet hours
   */
  isQuietHours(): boolean {
    if (this.preferences.quietHoursStart === undefined ||
        this.preferences.quietHoursEnd === undefined) {
      return false;
    }

    const hour = new Date().getHours();
    const start = this.preferences.quietHoursStart;
    const end = this.preferences.quietHoursEnd;

    if (start <= end) {
      return hour >= start && hour < end;
    }
    // Wraps midnight (e.g., 22-7)
    return hour >= start || hour < end;
  }

  /**
   * Check if rate limit is exceeded
   */
  isRateLimited(): boolean {
    const oneHourAgo = Date.now() - 3600000;
    const recentCount = this.history.filter(
      r => r.timestamp.getTime() > oneHourAgo && r.delivered
    ).length;

    return recentCount >= this.preferences.maxPerHour;
  }

  /**
   * Update preferences
   */
  setPreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    this.emit('preferences:updated', this.preferences);
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Get notification history
   */
  getHistory(limit?: number): NotificationRecord[] {
    const sorted = [...this.history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get stats
   */
  getStats(): { totalSent: number; lastHour: number; deliveryRate: number } {
    const oneHourAgo = Date.now() - 3600000;
    const lastHour = this.history.filter(r => r.timestamp.getTime() > oneHourAgo);
    const delivered = this.history.filter(r => r.delivered);

    return {
      totalSent: this.history.length,
      lastHour: lastHour.length,
      deliveryRate: this.history.length > 0
        ? delivered.length / this.history.length
        : 1,
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let managerInstance: NotificationManager | null = null;

export function getNotificationManager(prefs?: Partial<NotificationPreferences>): NotificationManager {
  if (!managerInstance) {
    managerInstance = new NotificationManager(prefs);
  }
  return managerInstance;
}

export function resetNotificationManager(): void {
  managerInstance = null;
}
