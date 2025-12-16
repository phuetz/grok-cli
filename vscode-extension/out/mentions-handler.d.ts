/**
 * Mentions Handler
 * GitHub Copilot-style @mentions for context injection
 */
export interface MentionResult {
    type: string;
    content: string;
    label: string;
}
export interface ResolvedMentions {
    mentions: MentionResult[];
    cleanedMessage: string;
}
export declare class MentionsHandler {
    private terminalBuffer;
    private maxTerminalLines;
    constructor();
    private setupTerminalListener;
    /**
     * Capture terminal selection or recent output
     */
    captureTerminalContent(): Promise<string>;
    /**
     * Parse and resolve all @mentions in a message
     */
    resolveMentions(message: string): Promise<ResolvedMentions>;
    /**
     * Resolve a file path to its content
     */
    private resolveFile;
    /**
     * Get current editor selection
     */
    private resolveSelection;
    /**
     * Search workspace for files matching query
     */
    private searchWorkspace;
    /**
     * Get general workspace context
     */
    private getWorkspaceContext;
    /**
     * Get git status and diff
     */
    private resolveGit;
    /**
     * Get current errors/diagnostics
     */
    private resolveErrors;
    /**
     * Search codebase for relevant code
     */
    private searchCodebase;
    /**
     * Get symbols in current file
     */
    private resolveSymbols;
    /**
     * Get mention suggestions for autocomplete
     */
    getMentionSuggestions(): Array<{
        label: string;
        description: string;
        insertText: string;
    }>;
}
//# sourceMappingURL=mentions-handler.d.ts.map