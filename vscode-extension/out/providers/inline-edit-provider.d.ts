/**
 * Inline Edit Provider
 * Provides Cmd+K style inline editing like Cursor
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
import { DiffManager } from '../diff-manager';
export declare class CodeBuddyInlineEditProvider implements vscode.Disposable {
    private readonly aiClient;
    private readonly diffManager;
    private inputBox;
    private decorationType;
    constructor(aiClient: AIClient, diffManager: DiffManager);
    /**
     * Start inline edit mode
     */
    startInlineEdit(): Promise<void>;
    /**
     * Process the inline edit request
     */
    private processInlineEdit;
    /**
     * Cleanup after inline edit
     */
    private cleanup;
    dispose(): void;
}
//# sourceMappingURL=inline-edit-provider.d.ts.map