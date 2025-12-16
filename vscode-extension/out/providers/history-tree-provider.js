"use strict";
/**
 * History Tree Provider
 * Shows conversation history in the sidebar
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
exports.HistoryTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class HistoryTreeProvider {
    constructor(historyManager) {
        this.historyManager = historyManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.disposables = [];
        // Refresh when history changes
        this.disposables.push(historyManager.onSessionChange(() => {
            this.refresh();
        }));
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show sessions
            const sessions = this.historyManager.getSessions();
            return Promise.resolve(sessions.map(session => new HistoryItem(session.title || 'Untitled Session', session.id, vscode.TreeItemCollapsibleState.Collapsed, 'session', session)));
        }
        else if (element.type === 'session' && element.session) {
            // Session level - show messages
            const messages = element.session.messages.slice(-10); // Last 10 messages
            return Promise.resolve(messages.map((msg, i) => new HistoryItem(msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''), `${element.session.id}-${i}`, vscode.TreeItemCollapsibleState.None, 'message', undefined, msg.role)));
        }
        return Promise.resolve([]);
    }
    dispose() {
        this._onDidChangeTreeData.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.HistoryTreeProvider = HistoryTreeProvider;
class HistoryItem extends vscode.TreeItem {
    constructor(label, id, collapsibleState, type, session, role) {
        super(label, collapsibleState);
        this.label = label;
        this.id = id;
        this.collapsibleState = collapsibleState;
        this.type = type;
        this.session = session;
        this.role = role;
        this.tooltip = this.label;
        if (type === 'session') {
            this.iconPath = new vscode.ThemeIcon('comment-discussion');
            this.contextValue = 'session';
            this.command = {
                command: 'codebuddy.switchSession',
                title: 'Switch to Session',
                arguments: [this.id],
            };
        }
        else {
            this.iconPath = new vscode.ThemeIcon(role === 'user' ? 'account' : 'hubot');
            this.contextValue = 'message';
        }
    }
}
//# sourceMappingURL=history-tree-provider.js.map