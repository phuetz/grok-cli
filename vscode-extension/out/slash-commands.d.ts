/**
 * Slash Commands System
 * GitHub Copilot-style slash commands for the chat
 */
import * as vscode from 'vscode';
import { AIClient } from './ai-client';
export interface SlashCommand {
    name: string;
    description: string;
    icon: string;
    execute: (args: string, context: CommandContext) => Promise<string>;
}
export interface CommandContext {
    editor?: vscode.TextEditor;
    selection?: string;
    document?: vscode.TextDocument;
    workspaceFiles?: string[];
    terminalOutput?: string;
}
export declare class SlashCommandHandler {
    private readonly aiClient;
    private commands;
    constructor(aiClient: AIClient);
    private registerBuiltinCommands;
    register(command: SlashCommand): void;
    getCommands(): SlashCommand[];
    getCommand(name: string): SlashCommand | undefined;
    parseMessage(message: string): {
        command?: string;
        args: string;
    };
    execute(command: string, args: string, context: CommandContext): Promise<string>;
    private detectTestFramework;
    private getDocStyle;
}
//# sourceMappingURL=slash-commands.d.ts.map