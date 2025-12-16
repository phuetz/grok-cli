/**
 * History Tree Provider
 * Shows conversation history in the sidebar
 */
import * as vscode from 'vscode';
import { HistoryManager, ChatSession } from '../history-manager';
export declare class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryItem>, vscode.Disposable {
    private readonly historyManager;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<void | HistoryItem | null | undefined>;
    private disposables;
    constructor(historyManager: HistoryManager);
    refresh(): void;
    getTreeItem(element: HistoryItem): vscode.TreeItem;
    getChildren(element?: HistoryItem): Thenable<HistoryItem[]>;
    dispose(): void;
}
declare class HistoryItem extends vscode.TreeItem {
    readonly label: string;
    readonly id: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly type: 'session' | 'message';
    readonly session?: ChatSession | undefined;
    readonly role?: "user" | "assistant" | "system" | undefined;
    constructor(label: string, id: string, collapsibleState: vscode.TreeItemCollapsibleState, type: 'session' | 'message', session?: ChatSession | undefined, role?: "user" | "assistant" | "system" | undefined);
}
export {};
//# sourceMappingURL=history-tree-provider.d.ts.map