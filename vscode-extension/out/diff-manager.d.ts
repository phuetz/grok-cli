/**
 * Diff Manager
 * Handles showing diff previews and applying/rejecting changes
 */
import * as vscode from 'vscode';
export declare class DiffManager implements vscode.Disposable {
    private pendingDiff;
    private deleteDecorationType;
    private insertDecorationType;
    private statusBarItem;
    constructor();
    /**
     * Show diff for proposed changes
     */
    showDiff(document: vscode.TextDocument, selection: vscode.Selection, newContent: string): Promise<void>;
    /**
     * Show side-by-side diff view
     */
    showSideBySideDiff(document: vscode.TextDocument, selection: vscode.Selection, newContent: string): Promise<void>;
    /**
     * Accept the current pending diff
     */
    acceptCurrentDiff(): Promise<void>;
    /**
     * Reject the current pending diff
     */
    rejectCurrentDiff(): Promise<void>;
    /**
     * Clear decorations
     */
    private clearDecorations;
    /**
     * Cleanup after accepting/rejecting
     */
    private cleanup;
    /**
     * Check if there's a pending diff
     */
    hasPendingDiff(): boolean;
    dispose(): void;
}
//# sourceMappingURL=diff-manager.d.ts.map