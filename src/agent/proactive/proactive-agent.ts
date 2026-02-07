/**
 * Proactive Agent
 *
 * Enables the agent to initiate communication, send notifications,
 * and ask questions via channels.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ProactiveMessage {
  channelType: 'telegram' | 'discord' | 'slack' | 'cli' | 'web' | 'api';
  channelId: string;
  message: string;
  priority: MessagePriority;
  requiresResponse?: boolean;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
  delivered: boolean;
  channelType: string;
  channelId: string;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface QuestionResult {
  answered: boolean;
  response: string | null;
  channelType: string;
  timedOut: boolean;
}

// ============================================================================
// Proactive Agent
// ============================================================================

export class ProactiveAgent extends EventEmitter {
  private sendImpl: ((msg: ProactiveMessage) => Promise<DeliveryResult>) | null = null;
  private questionResolvers: Map<string, (response: string | null) => void> = new Map();

  /**
   * Set the message sending implementation
   */
  setSendMethod(send: (msg: ProactiveMessage) => Promise<DeliveryResult>): void {
    this.sendImpl = send;
  }

  /**
   * Send a proactive message
   */
  async sendMessage(msg: ProactiveMessage): Promise<DeliveryResult> {
    this.emit('message:sending', msg);

    if (!this.sendImpl) {
      // Fallback: emit event for local handling
      this.emit('message:local', msg);
      return {
        delivered: true,
        channelType: msg.channelType,
        channelId: msg.channelId,
        timestamp: new Date(),
      };
    }

    try {
      const result = await this.sendImpl(msg);
      this.emit('message:sent', result);
      return result;
    } catch (error) {
      const result: DeliveryResult = {
        delivered: false,
        channelType: msg.channelType,
        channelId: msg.channelId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
      this.emit('message:failed', result);
      return result;
    }
  }

  /**
   * Ask a question and wait for response
   */
  async askQuestion(
    question: string,
    options: string[],
    channelType: ProactiveMessage['channelType'],
    channelId: string,
    timeoutMs: number = 60000
  ): Promise<QuestionResult> {
    const questionId = `q-${Date.now()}`;
    const formattedMessage = `${question}\n\nOptions:\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;

    // Send question
    await this.sendMessage({
      channelType,
      channelId,
      message: formattedMessage,
      priority: 'high',
      requiresResponse: true,
      timeoutMs,
    });

    // Wait for response
    return new Promise<QuestionResult>((resolve) => {
      const timer = setTimeout(() => {
        this.questionResolvers.delete(questionId);
        resolve({
          answered: false,
          response: null,
          channelType,
          timedOut: true,
        });
      }, timeoutMs);

      this.questionResolvers.set(questionId, (response) => {
        clearTimeout(timer);
        this.questionResolvers.delete(questionId);
        resolve({
          answered: true,
          response,
          channelType,
          timedOut: false,
        });
      });

      this.emit('question:asked', { questionId, question, options, channelType, channelId });
    });
  }

  /**
   * Receive a response to a pending question
   */
  receiveResponse(questionId: string, response: string): boolean {
    const resolver = this.questionResolvers.get(questionId);
    if (resolver) {
      resolver(response);
      return true;
    }
    return false;
  }

  /**
   * Notify task completion
   */
  async notifyCompletion(
    taskId: string,
    result: { success: boolean; output?: string; error?: string },
    channelType: ProactiveMessage['channelType'],
    channelId: string
  ): Promise<DeliveryResult> {
    const status = result.success ? 'completed successfully' : 'failed';
    const details = result.success
      ? (result.output ? `\n\nOutput: ${result.output.slice(0, 500)}` : '')
      : (result.error ? `\n\nError: ${result.error}` : '');

    return this.sendMessage({
      channelType,
      channelId,
      message: `Task ${taskId} ${status}${details}`,
      priority: result.success ? 'normal' : 'high',
    });
  }

  /**
   * Get pending question count
   */
  getPendingQuestions(): number {
    return this.questionResolvers.size;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let proactiveInstance: ProactiveAgent | null = null;

export function getProactiveAgent(): ProactiveAgent {
  if (!proactiveInstance) {
    proactiveInstance = new ProactiveAgent();
  }
  return proactiveInstance;
}

export function resetProactiveAgent(): void {
  proactiveInstance = null;
}
