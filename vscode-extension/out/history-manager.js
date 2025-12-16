"use strict";
/**
 * History Manager
 * Persists conversation history and context across sessions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryManager = void 0;
const vscode = __importStar(require("vscode"));
class HistoryManager {
    constructor(context) {
        this.disposables = [];
        this._onSessionChange = new vscode.EventEmitter();
        this.onSessionChange = this._onSessionChange.event;
        this.context = context;
        this.data = this.loadHistory();
        // Auto-save on changes
        this.setupAutoSave();
    }
    loadHistory() {
        const saved = this.context.globalState.get('codebuddy.history');
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
    async saveHistory() {
        await this.context.globalState.update('codebuddy.history', this.data);
        this._onSessionChange.fire();
    }
    setupAutoSave() {
        // Debounced auto-save
        let saveTimeout = null;
        const debouncedSave = () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            saveTimeout = setTimeout(() => this.saveHistory(), 1000);
        };
        // Save when VS Code is about to close
        this.disposables.push(vscode.workspace.onWillSaveTextDocument(() => debouncedSave()));
    }
    /**
     * Create a new chat session
     */
    createSession(title) {
        const session = {
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
    getCurrentSession() {
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
    addMessage(message) {
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
    getSessions() {
        return [...this.data.sessions];
    }
    /**
     * Get session by ID
     */
    getSession(id) {
        return this.data.sessions.find(s => s.id === id);
    }
    /**
     * Switch to a different session
     */
    switchSession(id) {
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
    deleteSession(id) {
        this.data.sessions = this.data.sessions.filter(s => s.id !== id);
        if (this.data.currentSessionId === id) {
            this.data.currentSessionId = this.data.sessions[0]?.id || null;
        }
        this.saveHistory();
    }
    /**
     * Clear current session messages
     */
    clearCurrentSession() {
        const session = this.getCurrentSession();
        session.messages = [];
        session.updatedAt = Date.now();
        this.saveHistory();
    }
    /**
     * Export session to markdown
     */
    exportSession(id) {
        const session = this.getSession(id);
        if (!session) {
            return '';
        }
        const lines = [
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
    search(query) {
        const results = [];
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
    getRecentContext() {
        const context = new Set();
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
    getStats() {
        const totalSessions = this.data.sessions.length;
        let totalMessages = 0;
        let oldestTimestamp = Date.now();
        const dayCount = new Map();
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
        let mostActiveDay = null;
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
    generateId() {
        return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    dispose() {
        this.saveHistory();
        this._onSessionChange.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.HistoryManager = HistoryManager;
//# sourceMappingURL=history-manager.js.map