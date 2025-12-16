/**
 * Review Diagnostics Provider
 *
 * Provides diagnostics from AI code review in the Problems panel.
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
export declare class ReviewDiagnosticsProvider implements vscode.Disposable {
    private readonly aiClient;
    private diagnosticCollection;
    private disposables;
    constructor(aiClient: AIClient);
    /**
     * Review a document and add diagnostics
     */
    reviewDocument(document: vscode.TextDocument): Promise<void>;
    /**
     * Review code and return issues
     */
    private reviewCode;
    /**
     * Fix a diagnostic issue
     */
    private fixDiagnostic;
    /**
     * Map severity string to VS Code severity
     */
    private mapSeverity;
    /**
     * Clear diagnostics for a document
     */
    clearDiagnostics(document: vscode.TextDocument): void;
    /**
     * Clear all diagnostics
     */
    clearAll(): void;
    dispose(): void;
}
//# sourceMappingURL=review-diagnostics-provider.d.ts.map