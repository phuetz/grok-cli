/**
 * Composer View Provider
 * Multi-file editing panel (like Cursor Composer)
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
import { DiffManager } from '../diff-manager';
export declare class ComposerViewProvider implements vscode.WebviewViewProvider {
    private readonly _extensionUri;
    private readonly aiClient;
    private readonly diffManager;
    static readonly viewType = "codebuddy.composerView";
    private _view?;
    private contextFiles;
    private pendingChanges;
    constructor(_extensionUri: vscode.Uri, aiClient: AIClient, diffManager: DiffManager);
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    /**
     * Handle compose request for multi-file editing
     */
    private handleCompose;
    /**
     * Parse AI response to extract file changes
     */
    private parseFileChanges;
    /**
     * Add current file to context
     */
    private addFileToContext;
    /**
     * Remove file from context
     */
    private removeFileFromContext;
    /**
     * Apply a single change
     */
    private applyChange;
    /**
     * Reject a single change
     */
    private rejectChange;
    /**
     * Apply all pending changes
     */
    private applyAllChanges;
    /**
     * Reject all pending changes
     */
    private rejectAllChanges;
    private updateWebview;
    private _getHtmlForWebview;
}
//# sourceMappingURL=composer-view-provider.d.ts.map