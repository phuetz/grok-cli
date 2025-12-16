/**
 * Smart Context Manager
 * Automatically includes relevant files in AI context
 * Windsurf-inspired intelligent context gathering
 */
import * as vscode from 'vscode';
export interface ContextFile {
    path: string;
    relativePath: string;
    content: string;
    language: string;
    relevance: number;
    reason: string;
}
export interface SmartContext {
    files: ContextFile[];
    symbols: SymbolInfo[];
    imports: string[];
    exports: string[];
    summary: string;
}
export interface SymbolInfo {
    name: string;
    kind: string;
    file: string;
    line: number;
}
export declare class SmartContextManager implements vscode.Disposable {
    private disposables;
    private fileCache;
    private importGraph;
    private symbolIndex;
    constructor();
    private setupListeners;
    /**
     * Get smart context for a query or current file
     */
    getSmartContext(options: {
        currentFile?: string;
        query?: string;
        selection?: string;
        maxFiles?: number;
        maxTokens?: number;
    }): Promise<SmartContext>;
    /**
     * Get context for a specific file
     */
    private getFileContext;
    /**
     * Get imports from a file
     */
    private getImports;
    /**
     * Get files that import the given file
     */
    private getImporters;
    /**
     * Extract import paths from file content
     */
    private extractImportPaths;
    /**
     * Resolve relative import path to absolute
     */
    private resolveRelativePath;
    /**
     * Search for files relevant to a query
     */
    private searchRelevantFiles;
    /**
     * Find symbol definitions
     */
    private findSymbolDefinitions;
    /**
     * Find test file for a source file
     */
    private findTestFile;
    /**
     * Extract symbols from files
     */
    private extractSymbols;
    /**
     * Parse imports and exports from file content
     */
    private parseImportsExports;
    /**
     * Generate a summary of the context
     */
    private generateContextSummary;
    /**
     * Build import graph for the workspace
     */
    private buildImportGraph;
    /**
     * Invalidate cache for a file
     */
    private invalidateCache;
    /**
     * Format context for AI prompt
     */
    formatForPrompt(context: SmartContext, maxLength?: number): string;
    dispose(): void;
}
//# sourceMappingURL=smart-context.d.ts.map