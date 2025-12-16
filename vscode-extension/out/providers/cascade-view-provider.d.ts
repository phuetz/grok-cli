/**
 * Cascade View Provider
 * Agentic mode for multi-step autonomous tasks (like Windsurf Cascade)
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
export declare class CascadeViewProvider implements vscode.WebviewViewProvider {
    private readonly _extensionUri;
    private readonly aiClient;
    static readonly viewType = "codebuddy.cascadeView";
    private _view?;
    private steps;
    private isRunning;
    private abortController;
    constructor(_extensionUri: vscode.Uri, aiClient: AIClient);
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    /**
     * Start a cascade task
     */
    startCascade(task: string): Promise<void>;
    /**
     * Stop the current cascade
     */
    stopCascade(): void;
    /**
     * Execute a cascade action
     */
    private executeAction;
    /**
     * Get workspace context for the AI
     */
    private getWorkspaceContext;
    private addStep;
    private updateLastStep;
    private updateWebview;
    private _getHtmlForWebview;
}
//# sourceMappingURL=cascade-view-provider.d.ts.map