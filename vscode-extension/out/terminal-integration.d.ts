/**
 * Terminal Integration
 * Provides AI-powered terminal assistance like Windsurf
 */
import * as vscode from 'vscode';
import { AIClient } from './ai-client';
export declare class TerminalIntegration implements vscode.Disposable {
    private readonly aiClient;
    private disposables;
    private suggestionsPanel;
    private recentCommands;
    private recentErrors;
    constructor(aiClient: AIClient);
    private setupTerminalListeners;
    private registerCommands;
    /**
     * Suggest a terminal command based on context
     */
    suggestCommand(): Promise<void>;
    /**
     * Generate command suggestions
     */
    private generateSuggestions;
    /**
     * Explain terminal content (error or output)
     */
    explainTerminalContent(): Promise<void>;
    /**
     * Generate command from natural language
     */
    generateCommand(): Promise<void>;
    /**
     * Run a command in the terminal
     */
    runCommand(command: string): Promise<void>;
    /**
     * Gather context for command generation
     */
    private gatherContext;
    /**
     * Get command history
     */
    getRecentCommands(): string[];
    dispose(): void;
}
//# sourceMappingURL=terminal-integration.d.ts.map