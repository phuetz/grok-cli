/**
 * Issues Tree Provider
 * Shows code issues detected by AI review in the sidebar
 */
import * as vscode from 'vscode';
export interface CodeIssue {
    id: string;
    file: string;
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
    timestamp: number;
}
export declare class IssuesTreeProvider implements vscode.TreeDataProvider<IssueItem>, vscode.Disposable {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<void | IssueItem | null | undefined>;
    private issues;
    private disposables;
    constructor();
    private updateIssuesFromDiagnostics;
    private mapSeverity;
    addIssues(file: string, issues: CodeIssue[]): void;
    clearIssues(file?: string): void;
    refresh(): void;
    getTreeItem(element: IssueItem): vscode.TreeItem;
    getChildren(element?: IssueItem): Thenable<IssueItem[]>;
    getTotalIssueCount(): {
        errors: number;
        warnings: number;
        info: number;
    };
    dispose(): void;
}
declare class IssueItem extends vscode.TreeItem {
    readonly label: string;
    readonly filePath: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly type: 'file' | 'issue' | 'empty';
    readonly issue?: CodeIssue | undefined;
    readonly description?: string | undefined;
    constructor(label: string, filePath: string, collapsibleState: vscode.TreeItemCollapsibleState, type: 'file' | 'issue' | 'empty', issue?: CodeIssue | undefined, description?: string | undefined);
}
export {};
//# sourceMappingURL=issues-tree-provider.d.ts.map