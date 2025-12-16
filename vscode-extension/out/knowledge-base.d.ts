/**
 * Knowledge Base
 * Windsurf-inspired persistent project memory
 * Stores and retrieves context about the project for better AI assistance
 */
import * as vscode from 'vscode';
export interface Memory {
    id: string;
    type: 'fact' | 'preference' | 'pattern' | 'decision' | 'context';
    content: string;
    source: string;
    createdAt: number;
    lastUsed: number;
    useCount: number;
    tags: string[];
    relevance: number;
}
export interface ProjectKnowledge {
    projectId: string;
    projectName: string;
    rootPath: string;
    memories: Memory[];
    preferences: Record<string, string>;
    patterns: string[];
    techStack: string[];
    lastUpdated: number;
}
export declare class KnowledgeBase implements vscode.Disposable {
    private readonly context;
    private disposables;
    private knowledge;
    private storageUri;
    private autoSaveTimer;
    private _onKnowledgeUpdate;
    readonly onKnowledgeUpdate: vscode.Event<ProjectKnowledge>;
    constructor(context: vscode.ExtensionContext);
    private setupListeners;
    /**
     * Load knowledge from storage
     */
    private loadKnowledge;
    /**
     * Save knowledge to storage
     */
    saveKnowledge(): Promise<void>;
    private scheduleAutoSave;
    /**
     * Get project ID from path
     */
    private getProjectId;
    /**
     * Add a memory to the knowledge base
     */
    addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'lastUsed' | 'useCount' | 'relevance'>): void;
    /**
     * Get relevant memories for a query
     */
    getRelevantMemories(query: string, maxResults?: number): Memory[];
    /**
     * Set a preference
     */
    setPreference(key: string, value: string): void;
    /**
     * Get a preference
     */
    getPreference(key: string): string | undefined;
    /**
     * Get all preferences
     */
    getPreferences(): Record<string, string>;
    /**
     * Add a coding pattern
     */
    addPattern(pattern: string): void;
    /**
     * Get coding patterns
     */
    getPatterns(): string[];
    /**
     * Get tech stack
     */
    getTechStack(): string[];
    /**
     * Auto-detect tech stack from project files
     */
    private detectTechStack;
    /**
     * Learn from a document (extract patterns and facts)
     */
    private learnFromDocument;
    /**
     * Format knowledge for AI context
     */
    formatForContext(): string;
    /**
     * Get knowledge summary
     */
    getSummary(): {
        memoriesCount: number;
        preferencesCount: number;
        patternsCount: number;
        techStack: string[];
    };
    /**
     * Clear all knowledge
     */
    clearKnowledge(): Promise<void>;
    dispose(): void;
}
//# sourceMappingURL=knowledge-base.d.ts.map