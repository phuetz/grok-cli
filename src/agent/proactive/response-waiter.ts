/**
 * Response Waiter
 *
 * Waits for user responses with timeout, collecting from multiple channels.
 */

import { EventEmitter } from 'events';

export interface PendingResponse {
  id: string;
  question: string;
  channels: string[];
  timeoutMs: number;
  createdAt: Date;
  resolve: (response: string | null) => void;
}

export class ResponseWaiter extends EventEmitter {
  private pending: Map<string, PendingResponse> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Wait for a response from any channel
   */
  async waitForResponse(
    id: string,
    question: string,
    channels: string[],
    timeoutMs: number = 60000
  ): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      const pending: PendingResponse = {
        id,
        question,
        channels,
        timeoutMs,
        createdAt: new Date(),
        resolve,
      };

      this.pending.set(id, pending);

      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.timers.delete(id);
        this.emit('timeout', { id, question });
        resolve(null);
      }, timeoutMs);

      this.timers.set(id, timer);
      this.emit('waiting', { id, question, channels });
    });
  }

  /**
   * Deliver a response
   */
  deliverResponse(id: string, response: string, channel: string): boolean {
    const pending = this.pending.get(id);
    if (!pending) return false;

    // Clear timer
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);

    this.pending.delete(id);
    this.timers.delete(id);

    pending.resolve(response);
    this.emit('response', { id, response, channel });
    return true;
  }

  /**
   * Cancel a pending wait
   */
  cancel(id: string): boolean {
    const pending = this.pending.get(id);
    if (!pending) return false;

    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);

    this.pending.delete(id);
    this.timers.delete(id);

    pending.resolve(null);
    this.emit('cancelled', { id });
    return true;
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * List pending responses
   */
  listPending(): Array<{ id: string; question: string; channels: string[]; age: number }> {
    return Array.from(this.pending.values()).map(p => ({
      id: p.id,
      question: p.question,
      channels: p.channels,
      age: Date.now() - p.createdAt.getTime(),
    }));
  }

  /**
   * Cancel all pending
   */
  cancelAll(): void {
    for (const [id] of this.pending) {
      this.cancel(id);
    }
  }
}
