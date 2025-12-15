/**
 * Code Actions Provider
 *
 * Provides quick fix actions for code issues detected by Code Buddy.
 */

import * as vscode from 'vscode';
import { AIClient } from '../ai-client';

export class CodeBuddyCodeActionsProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
  ];

  constructor(private readonly aiClient: AIClient) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const actions: vscode.CodeAction[] = [];

    // Add actions for Code Buddy diagnostics
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === 'Code Buddy') {
        // Quick fix action
        const fixAction = new vscode.CodeAction(
          `Fix with Code Buddy: ${diagnostic.message.slice(0, 40)}...`,
          vscode.CodeActionKind.QuickFix
        );
        fixAction.command = {
          command: 'codebuddy.fixDiagnostic',
          title: 'Fix with Code Buddy',
          arguments: [document, diagnostic],
        };
        fixAction.diagnostics = [diagnostic];
        fixAction.isPreferred = true;
        actions.push(fixAction);
      }
    }

    // Add general actions when text is selected
    if (!range.isEmpty) {
      // Explain action
      const explainAction = new vscode.CodeAction(
        'Explain with Code Buddy',
        vscode.CodeActionKind.Empty
      );
      explainAction.command = {
        command: 'codebuddy.explain',
        title: 'Explain with Code Buddy',
      };
      actions.push(explainAction);

      // Refactor action
      const refactorAction = new vscode.CodeAction(
        'Refactor with Code Buddy',
        vscode.CodeActionKind.Refactor
      );
      refactorAction.command = {
        command: 'codebuddy.refactor',
        title: 'Refactor with Code Buddy',
      };
      actions.push(refactorAction);

      // Generate tests action
      const testAction = new vscode.CodeAction(
        'Generate Tests with Code Buddy',
        vscode.CodeActionKind.Empty
      );
      testAction.command = {
        command: 'codebuddy.generateTests',
        title: 'Generate Tests with Code Buddy',
      };
      actions.push(testAction);

      // Optimize action
      const optimizeAction = new vscode.CodeAction(
        'Optimize with Code Buddy',
        vscode.CodeActionKind.Refactor
      );
      optimizeAction.command = {
        command: 'codebuddy.optimize',
        title: 'Optimize with Code Buddy',
        arguments: [document, range],
      };
      actions.push(optimizeAction);

      // Add documentation action
      const docAction = new vscode.CodeAction(
        'Add Documentation with Code Buddy',
        vscode.CodeActionKind.Refactor
      );
      docAction.command = {
        command: 'codebuddy.addDocs',
        title: 'Add Documentation with Code Buddy',
        arguments: [document, range],
      };
      actions.push(docAction);

      // Inline edit action (Cmd+K style)
      const inlineEditAction = new vscode.CodeAction(
        'Edit with Code Buddy (Cmd+K)',
        vscode.CodeActionKind.Refactor
      );
      inlineEditAction.command = {
        command: 'codebuddy.inlineEdit',
        title: 'Edit with Code Buddy',
      };
      actions.push(inlineEditAction);
    }

    return actions;
  }
}
