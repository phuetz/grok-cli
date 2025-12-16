/**
 * Context Tree Provider
 * Shows files added to AI context in the sidebar
 */
import * as vscode from 'vscode';
export declare class ContextTreeProvider implements vscode.TreeDataProvider<ContextFileItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ContextFileItem | undefined | void>;
    private contextFiles;
    /**
     * Add a file to context
     */
    addFile(uri: vscode.Uri): void;
    /**
     * Remove a file from context
     */
    removeFile(uri: vscode.Uri): void;
    /**
     * Clear all context files
     */
    clear(): void;
    /**
     * Get all context files
     */
    getFiles(): vscode.Uri[];
    /**
     * Get context as text for AI
     */
    getContextText(): Promise<string>;
    getTreeItem(element: ContextFileItem): vscode.TreeItem;
    getChildren(element?: ContextFileItem): Thenable<ContextFileItem[]>;
}
declare class ContextFileItem extends vscode.TreeItem {
    readonly label: string;
    readonly fileUri: vscode.Uri;
    readonly type: 'file' | 'empty';
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    constructor(label: string, fileUri: vscode.Uri, type: 'file' | 'empty', collapsibleState: vscode.TreeItemCollapsibleState);
}
export {};
//# sourceMappingURL=context-tree-provider.d.ts.map