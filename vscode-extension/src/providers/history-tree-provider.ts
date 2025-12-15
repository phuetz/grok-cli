/**
 * History Tree Provider
 * Shows conversation history in the sidebar
 */

import * as vscode from 'vscode';
import { HistoryManager, ChatSession } from '../history-manager';

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryItem>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<HistoryItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];

  constructor(private readonly historyManager: HistoryManager) {
    // Refresh when history changes
    this.disposables.push(
      historyManager.onSessionChange(() => {
        this.refresh();
      })
    );
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HistoryItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: HistoryItem): Thenable<HistoryItem[]> {
    if (!element) {
      // Root level - show sessions
      const sessions = this.historyManager.getSessions();
      return Promise.resolve(
        sessions.map(session => new HistoryItem(
          session.title || 'Untitled Session',
          session.id,
          vscode.TreeItemCollapsibleState.Collapsed,
          'session',
          session
        ))
      );
    } else if (element.type === 'session' && element.session) {
      // Session level - show messages
      const messages = element.session.messages.slice(-10); // Last 10 messages
      return Promise.resolve(
        messages.map((msg, i) => new HistoryItem(
          msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
          `${element.session!.id}-${i}`,
          vscode.TreeItemCollapsibleState.None,
          'message',
          undefined,
          msg.role
        ))
      );
    }
    return Promise.resolve([]);
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

class HistoryItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'session' | 'message',
    public readonly session?: ChatSession,
    public readonly role?: 'user' | 'assistant' | 'system'
  ) {
    super(label, collapsibleState);

    this.tooltip = this.label;

    if (type === 'session') {
      this.iconPath = new vscode.ThemeIcon('comment-discussion');
      this.contextValue = 'session';
      this.command = {
        command: 'codebuddy.switchSession',
        title: 'Switch to Session',
        arguments: [this.id],
      };
    } else {
      this.iconPath = new vscode.ThemeIcon(
        role === 'user' ? 'account' : 'hubot'
      );
      this.contextValue = 'message';
    }
  }
}
