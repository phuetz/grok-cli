/**
 * History Manager
 * Persists conversation history and context across sessions
 */

import * as vscode from 'vscode';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mentions?: string[];
  command?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  context?: string[];
}

interface HistoryData {
  sessions: ChatSession[];
  currentSessionId: string | null;
  settings: {
    maxSessions: number;
    maxMessagesPerSession: number;
  };
}

export class HistoryManager implements vscode.Disposable {
  private data: HistoryData;
  private context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  private _onSessionChange = new vscode.EventEmitter<void>();
  readonly onSessionChange = this._onSessionChange.event;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.data = this.loadHistory();

    // Auto-save on changes
    this.setupAutoSave();
  }

  private loadHistory(): HistoryData {
    const saved = this.context.globalState.get<HistoryData>('codebuddy.history');
    if (saved) {
      return saved;
    }

    return {
      sessions: [],
      currentSessionId: null,
      settings: {
        maxSessions: 50,
        maxMessagesPerSession: 100,
      },
    };
  }

  private async saveHistory(): Promise<void> {
    await this.context.globalState.update('codebuddy.history', this.data);
    this._onSessionChange.fire();
  }

  private setupAutoSave(): void {
    // Debounced auto-save
    let saveTimeout: NodeJS.Timeout | null = null;
    const debouncedSave = () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => this.saveHistory(), 1000);
    };

    // Save when VS Code is about to close
    this.disposables.push(
      vscode.workspace.onWillSaveTextDocument(() => debouncedSave())
    );
  }

  /**
   * Create a new chat session
   */
  createSession(title?: string): ChatSession {
    const session: ChatSession = {
      id: this.generateId(),
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.data.sessions.unshift(session);
    this.data.currentSessionId = session.id;

    // Trim old sessions
    if (this.data.sessions.length > this.data.settings.maxSessions) {
      this.data.sessions = this.data.sessions.slice(0, this.data.settings.maxSessions);
    }

    this.saveHistory();
    return session;
  }

  /**
   * Get or create current session
   */
  getCurrentSession(): ChatSession {
    if (this.data.currentSessionId) {
      const session = this.data.sessions.find(s => s.id === this.data.currentSessionId);
      if (session) {
        return session;
      }
    }

    return this.createSession();
  }

  /**
   * Add message to current session
   */
  addMessage(message: Omit<ChatMessage, 'timestamp'>): void {
    const session = this.getCurrentSession();
    session.messages.push({
      ...message,
      timestamp: Date.now(),
    });
    session.updatedAt = Date.now();

    // Update title from first user message
    if (session.messages.length === 1 && message.role === 'user') {
      session.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }

    // Trim old messages
    if (session.messages.length > this.data.settings.maxMessagesPerSession) {
      session.messages = session.messages.slice(-this.data.settings.maxMessagesPerSession);
    }

    this.saveHistory();
  }

  /**
   * Get all sessions
   */
  getSessions(): ChatSession[] {
    return [...this.data.sessions];
  }

  /**
   * Get session by ID
   */
  getSession(id: string): ChatSession | undefined {
    return this.data.sessions.find(s => s.id === id);
  }

  /**
   * Switch to a different session
   */
  switchSession(id: string): ChatSession | null {
    const session = this.data.sessions.find(s => s.id === id);
    if (session) {
      this.data.currentSessionId = id;
      this.saveHistory();
      return session;
    }
    return null;
  }

  /**
   * Delete a session
   */
  deleteSession(id: string): void {
    this.data.sessions = this.data.sessions.filter(s => s.id !== id);
    if (this.data.currentSessionId === id) {
      this.data.currentSessionId = this.data.sessions[0]?.id || null;
    }
    this.saveHistory();
  }

  /**
   * Clear current session messages
   */
  clearCurrentSession(): void {
    const session = this.getCurrentSession();
    session.messages = [];
    session.updatedAt = Date.now();
    this.saveHistory();
  }

  /**
   * Export session to markdown
   */
  exportSession(id: string): string {
    const session = this.getSession(id);
    if (!session) {
      return '';
    }

    const lines: string[] = [
      `# ${session.title}`,
      `Created: ${new Date(session.createdAt).toLocaleString()}`,
      '',
    ];

    for (const msg of session.messages) {
      const role = msg.role === 'user' ? '**You**' : '**Code Buddy**';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`### ${role} (${time})`);
      lines.push(msg.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Search across all sessions
   */
  search(query: string): Array<{ session: ChatSession; message: ChatMessage }> {
    const results: Array<{ session: ChatSession; message: ChatMessage }> = [];
    const lowerQuery = query.toLowerCase();

    for (const session of this.data.sessions) {
      for (const message of session.messages) {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          results.push({ session, message });
        }
      }
    }

    return results;
  }

  /**
   * Get recent context (files, topics discussed)
   */
  getRecentContext(): string[] {
    const context: Set<string> = new Set();
    const session = this.getCurrentSession();

    // Extract file mentions from recent messages
    for (const msg of session.messages.slice(-10)) {
      const fileMatches = msg.content.matchAll(/@file:([^\s]+)/g);
      for (const match of fileMatches) {
        context.add(match[1]);
      }

      // Extract code block languages
      const codeMatches = msg.content.matchAll(/```(\w+)/g);
      for (const match of codeMatches) {
        context.add(`language:${match[1]}`);
      }
    }

    return Array.from(context);
  }

  /**
   * Get message statistics
   */
  getStats(): {
    totalSessions: number;
    totalMessages: number;
    oldestSession: Date | null;
    mostActiveDay: string | null;
  } {
    const totalSessions = this.data.sessions.length;
    let totalMessages = 0;
    let oldestTimestamp = Date.now();
    const dayCount: Map<string, number> = new Map();

    for (const session of this.data.sessions) {
      totalMessages += session.messages.length;
      if (session.createdAt < oldestTimestamp) {
        oldestTimestamp = session.createdAt;
      }

      for (const msg of session.messages) {
        const day = new Date(msg.timestamp).toLocaleDateString();
        dayCount.set(day, (dayCount.get(day) || 0) + 1);
      }
    }

    let mostActiveDay: string | null = null;
    let maxCount = 0;
    for (const [day, count] of dayCount) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveDay = day;
      }
    }

    return {
      totalSessions,
      totalMessages,
      oldestSession: totalSessions > 0 ? new Date(oldestTimestamp) : null,
      mostActiveDay,
    };
  }

  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  dispose(): void {
    this.saveHistory();
    this._onSessionChange.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
