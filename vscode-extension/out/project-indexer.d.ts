/**
 * Project Indexer
 * Deep codebase understanding and indexing
 * Creates a semantic map of the project for intelligent suggestions
 */
import * as vscode from 'vscode';
import { AIClient } from './ai-client';
export interface ProjectFile {
    path: string;
    relativePath: string;
    language: string;
    size: number;
    lastModified: number;
    symbols: ProjectSymbol[];
    imports: string[];
    exports: string[];
    summary?: string;
}
export interface ProjectSymbol {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'method' | 'property';
    signature?: string;
    line: number;
    documentation?: string;
}
export interface ProjectIndex {
    name: string;
    rootPath: string;
    files: Map<string, ProjectFile>;
    symbols: Map<string, ProjectSymbol & {
        file: string;
    }>;
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
    projectType: ProjectType;
    lastIndexed: number;
    summary?: string;
}
export type ProjectType = 'nodejs' | 'python' | 'go' | 'rust' | 'java' | 'unknown';
export declare class ProjectIndexer implements vscode.Disposable {
    private readonly aiClient;
    private disposables;
    private index;
    private indexingInProgress;
    private statusBarItem;
    private _onIndexUpdate;
    readonly onIndexUpdate: vscode.Event<ProjectIndex>;
    constructor(aiClient: AIClient);
    private setupListeners;
    private reindexTimeout;
    private scheduleReindex;
    /**
     * Index the entire project
     */
    indexProject(forceReindex?: boolean): Promise<ProjectIndex | null>;
    /**
     * Detect project type
     */
    private detectProjectType;
    /**
     * Get all source files in the workspace
     */
    private getAllSourceFiles;
    /**
     * Index a single file
     */
    private indexFile;
    /**
     * Extract symbols from a file
     */
    private extractSymbols;
    /**
     * Map VS Code symbol kind to our symbol kind
     */
    private mapSymbolKind;
    /**
     * Fallback regex-based symbol extraction
     */
    private extractSymbolsWithRegex;
    /**
     * Extract imports and exports from file
     */
    private extractDependencies;
    /**
     * Get package info (dependencies, scripts)
     */
    private getPackageInfo;
    /**
     * Generate project summary using AI
     */
    private generateProjectSummary;
    /**
     * Search symbols in the index
     */
    searchSymbols(query: string): Array<ProjectSymbol & {
        file: string;
    }>;
    /**
     * Get files related to a symbol
     */
    getRelatedFiles(symbolName: string): string[];
    /**
     * Get the current index
     */
    getIndex(): ProjectIndex | null;
    dispose(): void;
}
//# sourceMappingURL=project-indexer.d.ts.map