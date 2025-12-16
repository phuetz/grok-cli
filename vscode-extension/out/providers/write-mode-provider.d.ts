/**
 * Write Mode Provider
 * Windsurf-inspired focused code generation view
 * Provides a distraction-free interface for generating new code
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
import { DiffManager } from '../diff-manager';
export declare class WriteModeProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    private readonly extensionUri;
    private readonly aiClient;
    private readonly diffManager;
    static readonly viewType = "codebuddy.writeMode";
    private view?;
    private disposables;
    private isGenerating;
    private currentGeneration;
    private smartContext;
    constructor(extensionUri: vscode.Uri, aiClient: AIClient, diffManager: DiffManager);
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    /**
     * Generate code based on prompt
     */
    private generateCode;
    /**
     * Extract code blocks from response
     */
    private extractCodeBlocks;
    /**
     * Insert code at cursor position
     */
    private insertAtCursor;
    /**
     * Create new file with generated code
     */
    private createNewFile;
    /**
     * Apply generated code to a target file
     */
    private applyGeneratedCode;
    private getWebviewContent;
    dispose(): void;
}
//# sourceMappingURL=write-mode-provider.d.ts.map