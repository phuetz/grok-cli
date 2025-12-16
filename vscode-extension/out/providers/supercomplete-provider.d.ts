/**
 * Supercomplete Provider
 * Cursor-inspired multi-line intelligent completions
 * Predicts and suggests entire blocks of code
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
export declare class SupercompleteProvider implements vscode.InlineCompletionItemProvider, vscode.Disposable {
    private readonly aiClient;
    private disposables;
    private cache;
    private debounceTimer;
    private lastRequest;
    private config;
    constructor(aiClient: AIClient);
    private setupListeners;
    private updateConfig;
    provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<vscode.InlineCompletionList | null>;
    /**
     * Get prefix (code before cursor)
     */
    private getPrefix;
    /**
     * Get suffix (code after cursor)
     */
    private getSuffix;
    /**
     * Generate cache key
     */
    private getCacheKey;
    /**
     * Generate completion using AI
     */
    private generateCompletion;
    /**
     * Detect the context of where we're completing
     */
    private detectContext;
    /**
     * Adjust indentation to match the current context
     */
    private adjustIndentation;
    /**
     * Create completion list from generated text
     */
    private createCompletionList;
    /**
     * Clear the completion cache
     */
    clearCache(): void;
    dispose(): void;
}
/**
 * Enhanced completion that can predict entire functions
 */
export declare class FunctionPredictor {
    private readonly aiClient;
    constructor(aiClient: AIClient);
    /**
     * Predict a complete function based on its signature
     */
    predictFunction(signature: string, context: string, language: string): Promise<string | null>;
    /**
     * Suggest function signature based on name
     */
    suggestSignature(functionName: string, context: string, language: string): Promise<string | null>;
}
//# sourceMappingURL=supercomplete-provider.d.ts.map