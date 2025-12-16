/**
 * Code Lens Provider
 * Shows AI action buttons above functions and classes
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
export declare class CodeBuddyCodeLensProvider implements vscode.CodeLensProvider {
    private readonly aiClient;
    private _onDidChangeCodeLenses;
    readonly onDidChangeCodeLenses: vscode.Event<void>;
    constructor(aiClient: AIClient);
    provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]>;
    private getPatternsForLanguage;
    resolveCodeLens(codeLens: vscode.CodeLens, _token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens>;
}
export declare function registerCodeLensCommands(context: vscode.ExtensionContext, aiClient: AIClient): void;
//# sourceMappingURL=codelens-provider.d.ts.map