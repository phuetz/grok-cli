/**
 * Chat View Provider for VS Code Sidebar
 * Enhanced with slash commands, @mentions, and history
 * Inspired by GitHub Copilot and Windsurf
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
export declare class CodeBuddyChatViewProvider implements vscode.WebviewViewProvider {
    private readonly _extensionUri;
    private readonly _aiClient;
    static readonly viewType = "codebuddy.chatView";
    private _view?;
    private _messages;
    private slashHandler;
    private mentionsHandler;
    private historyManager?;
    constructor(_extensionUri: vscode.Uri, _aiClient: AIClient, context?: vscode.ExtensionContext);
    private loadCurrentSession;
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    /**
     * Send a message programmatically
     */
    sendMessage(message: string): Promise<void>;
    /**
     * Handle user message with slash commands and mentions
     */
    private handleUserMessage;
    /**
     * Handle regular chat (non-command) with streaming
     */
    private handleRegularChat;
    /**
     * Build command context from editor and mentions
     */
    private buildCommandContext;
    /**
     * Get workspace file list
     */
    private getWorkspaceFiles;
    /**
     * Insert code into the active editor
     */
    private insertCodeToEditor;
    /**
     * Apply code to editor (replace selection or insert)
     */
    private applyCodeToEditor;
    /**
     * Update webview with current messages
     */
    private updateWebview;
    /**
     * Update webview with partial response (streaming)
     */
    private updateWebviewWithPartial;
    /**
     * Send available sessions to webview
     */
    private sendSessions;
    /**
     * Send available commands to webview
     */
    private sendCommands;
    /**
     * Send mention suggestions to webview
     */
    private sendMentions;
    /**
     * Get HTML for webview
     */
    private _getHtmlForWebview;
}
//# sourceMappingURL=chat-view-provider.d.ts.map