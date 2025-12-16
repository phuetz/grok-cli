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
export declare class HistoryManager implements vscode.Disposable {
    private data;
    private context;
    private disposables;
    private _onSessionChange;
    readonly onSessionChange: vscode.Event<void>;
    constructor(context: vscode.ExtensionContext);
    private loadHistory;
    private saveHistory;
    private setupAutoSave;
    /**
     * Create a new chat session
     */
    createSession(title?: string): ChatSession;
    /**
     * Get or create current session
     */
    getCurrentSession(): ChatSession;
    /**
     * Add message to current session
     */
    addMessage(message: Omit<ChatMessage, 'timestamp'>): void;
    /**
     * Get all sessions
     */
    getSessions(): ChatSession[];
    /**
     * Get session by ID
     */
    getSession(id: string): ChatSession | undefined;
    /**
     * Switch to a different session
     */
    switchSession(id: string): ChatSession | null;
    /**
     * Delete a session
     */
    deleteSession(id: string): void;
    /**
     * Clear current session messages
     */
    clearCurrentSession(): void;
    /**
     * Export session to markdown
     */
    exportSession(id: string): string;
    /**
     * Search across all sessions
     */
    search(query: string): Array<{
        session: ChatSession;
        message: ChatMessage;
    }>;
    /**
     * Get recent context (files, topics discussed)
     */
    getRecentContext(): string[];
    /**
     * Get message statistics
     */
    getStats(): {
        totalSessions: number;
        totalMessages: number;
        oldestSession: Date | null;
        mostActiveDay: string | null;
    };
    private generateId;
    dispose(): void;
}
//# sourceMappingURL=history-manager.d.ts.map