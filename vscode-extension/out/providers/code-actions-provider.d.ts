/**
 * Code Actions Provider
 *
 * Provides quick fix actions for code issues detected by Code Buddy.
 */
import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
export declare class CodeBuddyCodeActionsProvider implements vscode.CodeActionProvider {
    private readonly aiClient;
    static readonly providedCodeActionKinds: vscode.CodeActionKind[];
    constructor(aiClient: AIClient);
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, _token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]>;
}
//# sourceMappingURL=code-actions-provider.d.ts.map