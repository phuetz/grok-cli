/**
 * Email Service
 *
 * Unified email service combining IMAP, SMTP, and webhook functionality.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { ImapClient } from './client.js';
import { SmtpClient } from './client.js';
import type {
  EmailServiceConfig,
  EmailServiceStats,
  EmailServiceEvents,
  EmailMessage,
  EmailFolder,
  ImapSearchCriteria,
  SendMailOptions,
  SendMailResult,
  EmailWebhookConfig,
  EmailWebhookEvent,
  EmailWebhookPayload,
  EmailFlag,
} from './types.js';

// ============================================================================
// Webhook Manager
// ============================================================================

export class WebhookManager extends EventEmitter {
  private webhooks: EmailWebhookConfig[] = [];

  constructor(webhooks: EmailWebhookConfig[] = []) {
    super();
    this.webhooks = webhooks;
  }

  /**
   * Add a webhook
   */
  addWebhook(webhook: EmailWebhookConfig): void {
    this.webhooks.push(webhook);
  }

  /**
   * Remove a webhook
   */
  removeWebhook(url: string): boolean {
    const index = this.webhooks.findIndex(w => w.url === url);
    if (index >= 0) {
      this.webhooks.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all webhooks
   */
  getWebhooks(): EmailWebhookConfig[] {
    return [...this.webhooks];
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(
    event: EmailWebhookEvent,
    data: EmailWebhookPayload['data']
  ): Promise<void> {
    const payload: EmailWebhookPayload = {
      event,
      timestamp: Date.now(),
      data,
    };

    const relevantWebhooks = this.webhooks.filter(w => w.events.includes(event));

    const promises = relevantWebhooks.map(webhook => this.sendWebhook(webhook, payload));
    await Promise.allSettled(promises);
  }

  /**
   * Send a webhook request
   */
  private async sendWebhook(
    webhook: EmailWebhookConfig,
    payload: EmailWebhookPayload
  ): Promise<void> {
    const body = JSON.stringify(payload);

    // Generate signature if secret is provided
    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
      payload.signature = signature;
    }

    const retries = webhook.retries ?? 3;
    const timeout = webhook.timeout ?? 10000;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // In a real implementation, use fetch or axios
        // For now, simulate the request
        await this.simulateWebhookRequest(webhook.url, body, timeout);
        this.emit('webhook-sent', webhook.url, payload);
        return;
      } catch (error) {
        if (attempt === retries - 1) {
          this.emit('webhook-failed', webhook.url, payload, error);
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private async simulateWebhookRequest(
    _url: string,
    _body: string,
    timeout: number
  ): Promise<void> {
    // Simulate network request
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Webhook request timed out'));
      }, timeout);

      // Simulate success after short delay
      setTimeout(() => {
        clearTimeout(timer);
        resolve();
      }, 50);
    });
  }
}

// ============================================================================
// Email Service
// ============================================================================

export class EmailService extends EventEmitter {
  private config: EmailServiceConfig;
  private imapClient: ImapClient | null = null;
  private smtpClient: SmtpClient | null = null;
  private webhookManager: WebhookManager;
  private pollInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    lastSync: undefined as Date | undefined,
  };

  constructor(config: EmailServiceConfig) {
    super();
    this.config = config;
    this.webhookManager = new WebhookManager(config.webhooks);

    // Forward webhook events
    this.webhookManager.on('webhook-sent', (url, payload) => {
      this.emit('webhook-sent', url, payload);
    });
    this.webhookManager.on('webhook-failed', (url, payload, error) => {
      this.emit('webhook-failed', url, payload, error);
    });
  }

  /**
   * Connect to email servers
   */
  async connect(): Promise<void> {
    this.startTime = Date.now();

    try {
      // Connect to IMAP
      if (this.config.imap) {
        this.imapClient = new ImapClient(this.config.imap);
        this.setupImapListeners();
        await this.imapClient.connect();
      }

      // Connect to SMTP
      if (this.config.smtp) {
        this.smtpClient = new SmtpClient(this.config.smtp);
        this.setupSmtpListeners();
        await this.smtpClient.connect();
      }

      this.emit('connected');

      // Start polling if configured
      if (this.config.pollInterval && this.config.pollInterval > 0) {
        this.startPolling();
      }
    } catch (error) {
      this.stats.errors++;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from servers
   */
  async disconnect(): Promise<void> {
    this.stopPolling();

    if (this.imapClient) {
      await this.imapClient.disconnect();
      this.imapClient = null;
    }

    if (this.smtpClient) {
      await this.smtpClient.disconnect();
      this.smtpClient = null;
    }

    this.emit('disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    const imapConnected = !this.config.imap || (this.imapClient?.isConnected() ?? false);
    const smtpConnected = !this.config.smtp || (this.smtpClient?.isConnected() ?? false);
    return imapConnected && smtpConnected;
  }

  // ============================================================================
  // IMAP Operations
  // ============================================================================

  /**
   * List all folders
   */
  async listFolders(): Promise<EmailFolder[]> {
    this.ensureImapConnected();
    return this.imapClient!.listFolders();
  }

  /**
   * Select a folder
   */
  async selectFolder(path: string): Promise<EmailFolder> {
    this.ensureImapConnected();
    return this.imapClient!.selectFolder(path);
  }

  /**
   * Search for messages
   */
  async search(criteria: ImapSearchCriteria, folder?: string): Promise<number[]> {
    this.ensureImapConnected();

    if (folder) {
      await this.imapClient!.selectFolder(folder);
    }

    return this.imapClient!.search(criteria);
  }

  /**
   * Fetch messages
   */
  async fetchMessages(uids: number | number[], folder?: string): Promise<EmailMessage[]> {
    this.ensureImapConnected();

    if (folder) {
      await this.imapClient!.selectFolder(folder);
    }

    return this.imapClient!.fetch(uids);
  }

  /**
   * Fetch a single message
   */
  async fetchMessage(uid: number, folder?: string): Promise<EmailMessage | null> {
    this.ensureImapConnected();

    if (folder) {
      await this.imapClient!.selectFolder(folder);
    }

    return this.imapClient!.fetchOne(uid);
  }

  /**
   * Mark messages as read
   */
  async markAsRead(uids: number | number[], folder?: string): Promise<void> {
    this.ensureImapConnected();

    if (folder) {
      await this.imapClient!.selectFolder(folder);
    }

    await this.imapClient!.addFlags(uids, 'seen');
    await this.webhookManager.trigger('message.read', {
      message: { uid: Array.isArray(uids) ? uids[0] : uids },
      account: this.config.imap!.user,
    });
  }

  /**
   * Mark messages as unread
   */
  async markAsUnread(uids: number | number[], folder?: string): Promise<void> {
    this.ensureImapConnected();

    if (folder) {
      await this.imapClient!.selectFolder(folder);
    }

    await this.imapClient!.removeFlags(uids, 'seen');
  }

  /**
   * Flag messages
   */
  async flagMessages(uids: number | number[], flags: EmailFlag | EmailFlag[], folder?: string): Promise<void> {
    this.ensureImapConnected();

    if (folder) {
      await this.imapClient!.selectFolder(folder);
    }

    await this.imapClient!.addFlags(uids, flags);

    const flagList = Array.isArray(flags) ? flags : [flags];
    if (flagList.includes('flagged')) {
      await this.webhookManager.trigger('message.flagged', {
        message: { uid: Array.isArray(uids) ? uids[0] : uids },
        account: this.config.imap!.user,
      });
    }
  }

  /**
   * Move messages
   */
  async moveMessages(uids: number | number[], destFolder: string, srcFolder?: string): Promise<void> {
    this.ensureImapConnected();

    if (srcFolder) {
      await this.imapClient!.selectFolder(srcFolder);
    }

    await this.imapClient!.move(uids, destFolder);
  }

  /**
   * Delete messages
   */
  async deleteMessages(uids: number | number[], folder?: string, permanent = false): Promise<void> {
    this.ensureImapConnected();

    if (folder) {
      await this.imapClient!.selectFolder(folder);
    }

    await this.imapClient!.delete(uids, permanent);
    await this.webhookManager.trigger('message.deleted', {
      message: { uid: Array.isArray(uids) ? uids[0] : uids },
      account: this.config.imap!.user,
    });
  }

  /**
   * Create a folder
   */
  async createFolder(path: string): Promise<EmailFolder> {
    this.ensureImapConnected();
    const folder = await this.imapClient!.createFolder(path);
    await this.webhookManager.trigger('folder.created', {
      folder: { path },
      account: this.config.imap!.user,
    });
    return folder;
  }

  /**
   * Delete a folder
   */
  async deleteFolder(path: string): Promise<void> {
    this.ensureImapConnected();
    await this.imapClient!.deleteFolder(path);
    await this.webhookManager.trigger('folder.deleted', {
      folder: { path },
      account: this.config.imap!.user,
    });
  }

  // ============================================================================
  // SMTP Operations
  // ============================================================================

  /**
   * Send an email
   */
  async sendEmail(options: SendMailOptions): Promise<SendMailResult> {
    this.ensureSmtpConnected();

    try {
      const result = await this.smtpClient!.send(options);
      this.stats.messagesSent++;

      await this.webhookManager.trigger('message.sent', {
        message: {
          subject: options.subject,
          to: Array.isArray(options.to)
            ? options.to.map(a => typeof a === 'string' ? { address: a } : a)
            : [typeof options.to === 'string' ? { address: options.to } : options.to],
        },
        account: typeof options.from === 'string' ? options.from : options.from.address,
      });

      return result;
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Reply to an email
   */
  async replyToEmail(
    originalMessage: EmailMessage,
    options: Omit<SendMailOptions, 'to' | 'subject' | 'inReplyTo' | 'references'>
  ): Promise<SendMailResult> {
    const replyTo = originalMessage.replyTo?.[0] || originalMessage.from[0];

    return this.sendEmail({
      ...options,
      to: replyTo,
      subject: originalMessage.subject.startsWith('Re:')
        ? originalMessage.subject
        : `Re: ${originalMessage.subject}`,
      inReplyTo: originalMessage.messageId,
      references: originalMessage.references
        ? [...originalMessage.references, originalMessage.messageId!]
        : [originalMessage.messageId!],
    });
  }

  /**
   * Forward an email
   */
  async forwardEmail(
    originalMessage: EmailMessage,
    options: Omit<SendMailOptions, 'subject' | 'text' | 'html'>
  ): Promise<SendMailResult> {
    const forwardText = `
---------- Forwarded message ----------
From: ${originalMessage.from.map(a => a.name ? `${a.name} <${a.address}>` : a.address).join(', ')}
Date: ${originalMessage.date.toISOString()}
Subject: ${originalMessage.subject}
To: ${originalMessage.to.map(a => a.name ? `${a.name} <${a.address}>` : a.address).join(', ')}

${originalMessage.text || ''}
`;

    return this.sendEmail({
      ...options,
      subject: `Fwd: ${originalMessage.subject}`,
      text: forwardText,
      html: originalMessage.html
        ? `<div style="border-left: 2px solid #ccc; padding-left: 10px;">${originalMessage.html}</div>`
        : undefined,
    });
  }

  // ============================================================================
  // Webhook Management
  // ============================================================================

  /**
   * Add a webhook
   */
  addWebhook(webhook: EmailWebhookConfig): void {
    this.webhookManager.addWebhook(webhook);
  }

  /**
   * Remove a webhook
   */
  removeWebhook(url: string): boolean {
    return this.webhookManager.removeWebhook(url);
  }

  /**
   * Get all webhooks
   */
  getWebhooks(): EmailWebhookConfig[] {
    return this.webhookManager.getWebhooks();
  }

  // ============================================================================
  // Sync & Polling
  // ============================================================================

  /**
   * Sync folder and check for new messages
   */
  async syncFolder(folder = 'INBOX'): Promise<number> {
    this.ensureImapConnected();

    await this.imapClient!.selectFolder(folder);
    const uids = await this.imapClient!.search({ unseen: true });

    if (uids.length > 0) {
      const messages = await this.imapClient!.fetch(uids);

      for (const message of messages) {
        this.stats.messagesReceived++;
        this.emit('message', message);

        await this.webhookManager.trigger('message.received', {
          message: {
            id: message.id,
            subject: message.subject,
            from: message.from,
            date: message.date,
          },
          account: this.config.imap!.user,
        });
      }
    }

    this.stats.lastSync = new Date();
    this.emit('sync', folder, uids.length);

    return uids.length;
  }

  /**
   * Start polling for new messages
   */
  startPolling(interval?: number): void {
    const pollMs = interval || this.config.pollInterval || 60000;

    if (this.pollInterval) {
      this.stopPolling();
    }

    this.pollInterval = setInterval(async () => {
      try {
        await this.syncFolder(this.config.defaultFolder || 'INBOX');
      } catch (error) {
        this.stats.errors++;
        this.emit('error', error);
      }
    }, pollMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Start IDLE mode
   */
  async startIdle(): Promise<void> {
    this.ensureImapConnected();

    while (this.imapClient?.isConnected()) {
      await this.imapClient.selectFolder(this.config.defaultFolder || 'INBOX');
      await this.imapClient.idle();
      await this.syncFolder();
      this.emit('idle');
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get service statistics
   */
  getStats(): EmailServiceStats {
    return {
      connected: this.isConnected(),
      messagesReceived: this.stats.messagesReceived,
      messagesSent: this.stats.messagesSent,
      errors: this.stats.errors,
      lastSync: this.stats.lastSync,
      uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0,
      lastSync: undefined,
    };
  }

  // ============================================================================
  // Testing Helpers
  // ============================================================================

  /**
   * Add a mock message (for testing)
   */
  addMockMessage(folder: string, message: Partial<EmailMessage>): number {
    this.ensureImapConnected();
    return this.imapClient!.addMockMessage(folder, message);
  }

  /**
   * Get IMAP client (for testing)
   */
  getImapClient(): ImapClient | null {
    return this.imapClient;
  }

  /**
   * Get SMTP client (for testing)
   */
  getSmtpClient(): SmtpClient | null {
    return this.smtpClient;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureImapConnected(): void {
    if (!this.imapClient?.isConnected()) {
      throw new Error('IMAP not connected');
    }
  }

  private ensureSmtpConnected(): void {
    if (!this.smtpClient?.isConnected()) {
      throw new Error('SMTP not connected');
    }
  }

  private setupImapListeners(): void {
    if (!this.imapClient) return;

    this.imapClient.on('error', (error) => {
      this.stats.errors++;
      this.emit('error', error);
    });

    this.imapClient.on('mail', async (numNew) => {
      // New mail notification during IDLE
      if (numNew > 0) {
        try {
          await this.syncFolder();
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }

  private setupSmtpListeners(): void {
    if (!this.smtpClient) return;

    this.smtpClient.on('error', (error) => {
      this.stats.errors++;
      this.emit('error', error);
    });
  }
}

// ============================================================================
// Singleton
// ============================================================================

let emailServiceInstance: EmailService | null = null;

export function getEmailService(config?: EmailServiceConfig): EmailService {
  if (!emailServiceInstance && config) {
    emailServiceInstance = new EmailService(config);
  }
  if (!emailServiceInstance) {
    throw new Error('EmailService not initialized. Provide config on first call.');
  }
  return emailServiceInstance;
}

export function resetEmailService(): void {
  if (emailServiceInstance) {
    emailServiceInstance.disconnect().catch((err) => {
      logger.debug('Email service disconnect error (ignored)', { error: err instanceof Error ? err.message : String(err) });
    });
    emailServiceInstance = null;
  }
}
