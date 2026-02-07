/**
 * Proactive Module - Barrel Export
 */

export {
  ProactiveAgent,
  getProactiveAgent,
  resetProactiveAgent,
  type ProactiveMessage,
  type DeliveryResult,
  type QuestionResult,
  type MessagePriority,
} from './proactive-agent.js';

export {
  NotificationManager,
  getNotificationManager,
  resetNotificationManager,
  type NotificationPreferences,
  type NotificationRecord,
} from './notification-manager.js';

export {
  ResponseWaiter,
  type PendingResponse,
} from './response-waiter.js';
