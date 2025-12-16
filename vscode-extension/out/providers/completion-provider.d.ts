/**
 * Inline Completion Provider
 *
 * Provides AI-powered code completions inline in the editor.
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
export declare class CodeBuddyCompletionProvider implements vscode.InlineCompletionItemProvider {
    private readonly aiClient;
    private lastRequest;
    private cache;
    private debounceTimer;
    private readonly debounceMs;
    constructor(aiClient: AIClient);
    provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null>;
    /**
     * Get completion from AI
     */
    private getCompletion;
    /**
     * Get text before cursor
     */
    private getPrefix;
    /**
     * Get text after cursor
     */
    private getSuffix;
    /**
     * Debounce requests
     */
    private debounce;
}
//# sourceMappingURL=completion-provider.d.ts.map