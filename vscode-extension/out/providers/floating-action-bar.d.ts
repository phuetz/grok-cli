/**
 * Floating Action Bar
 * Cursor/Windsurf-inspired quick action bar that appears on selection
 * Provides one-click access to AI actions
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
import { DiffManager } from '../diff-manager';
export declare class FloatingActionBar implements vscode.Disposable {
    private readonly aiClient;
    private readonly diffManager;
    private disposables;
    private decorationType;
    private statusBarItem;
    private currentEditor;
    private showTimeout;
    private readonly actions;
    constructor(aiClient: AIClient, diffManager: DiffManager);
    private setupListeners;
    private registerCommands;
    private onSelectionChange;
    private showActionBar;
    private hideActionBar;
    private showQuickPick;
    private executeQuickAction;
    /**
     * Show inline action buttons (experimental)
     * Uses decorations to show clickable buttons
     */
    showInlineActions(editor: vscode.TextEditor, range: vscode.Range): Promise<void>;
    dispose(): void;
}
/**
 * Action Bar WebView Panel (for more sophisticated UI)
 * Could be used for a floating toolbar overlay
 */
export declare class ActionBarPanel {
    private static panel;
    static show(extensionUri: vscode.Uri, _selection: vscode.Selection): void;
    private static getContent;
}
//# sourceMappingURL=floating-action-bar.d.ts.map