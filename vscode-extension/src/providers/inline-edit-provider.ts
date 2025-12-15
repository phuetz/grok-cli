/**
 * Inline Edit Provider
 * Provides Cmd+K style inline editing like Cursor
 */

import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
import { DiffManager } from '../diff-manager';

export class CodeBuddyInlineEditProvider implements vscode.Disposable {
  private inputBox: vscode.InputBox | null = null;
  private decorationType: vscode.TextEditorDecorationType;

  constructor(
    private readonly aiClient: AIClient,
    private readonly diffManager: DiffManager
  ) {
    // Create decoration for highlighting the editing region
    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(100, 100, 255, 0.1)',
      border: '1px solid rgba(100, 100, 255, 0.5)',
      borderRadius: '4px',
    });
  }

  /**
   * Start inline edit mode
   */
  async startInlineEdit(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const hasSelection = !selection.isEmpty;
    const selectedText = hasSelection ? editor.document.getText(selection) : '';

    // Highlight the selection or current line
    const highlightRange = hasSelection
      ? selection
      : new vscode.Range(
          selection.start.line,
          0,
          selection.start.line,
          editor.document.lineAt(selection.start.line).text.length
        );

    editor.setDecorations(this.decorationType, [highlightRange]);

    // Create input box
    this.inputBox = vscode.window.createInputBox();
    this.inputBox.placeholder = hasSelection
      ? 'Describe how to modify this code...'
      : 'Describe what code to write...';
    this.inputBox.prompt = hasSelection
      ? 'Code Buddy: Edit selected code'
      : 'Code Buddy: Generate code';
    this.inputBox.title = '$(edit) Code Buddy Inline Edit';

    // Handle input
    this.inputBox.onDidAccept(async () => {
      const instruction = this.inputBox?.value;
      if (!instruction) {
        this.cleanup(editor);
        return;
      }

      this.inputBox?.hide();

      await this.processInlineEdit(editor, selection, selectedText, instruction);
      this.cleanup(editor);
    });

    this.inputBox.onDidHide(() => {
      this.cleanup(editor);
    });

    this.inputBox.show();
  }

  /**
   * Process the inline edit request
   */
  private async processInlineEdit(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    selectedText: string,
    instruction: string
  ): Promise<void> {
    const language = editor.document.languageId;

    // Get surrounding context
    const startLine = Math.max(0, selection.start.line - 10);
    const endLine = Math.min(editor.document.lineCount - 1, selection.end.line + 10);
    const contextBefore = editor.document.getText(
      new vscode.Range(startLine, 0, selection.start.line, selection.start.character)
    );
    const contextAfter = editor.document.getText(
      new vscode.Range(selection.end.line, selection.end.character, endLine, 1000)
    );

    const response = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Code Buddy is thinking...' },
      async () => {
        if (selectedText) {
          // Edit existing code
          return await this.aiClient.chat([
            {
              role: 'system',
              content: `You are an expert ${language} developer. Modify the code according to the instruction. Return ONLY the modified code, no explanations.

Context before:
\`\`\`${language}
${contextBefore}
\`\`\`

Context after:
\`\`\`${language}
${contextAfter}
\`\`\``,
            },
            {
              role: 'user',
              content: `Instruction: ${instruction}

Code to modify:
\`\`\`${language}
${selectedText}
\`\`\`

Return ONLY the modified code:`,
            },
          ]);
        } else {
          // Generate new code
          return await this.aiClient.chat([
            {
              role: 'system',
              content: `You are an expert ${language} developer. Write code according to the instruction. Return ONLY the code, no explanations.

Context before:
\`\`\`${language}
${contextBefore}
\`\`\`

Context after:
\`\`\`${language}
${contextAfter}
\`\`\``,
            },
            {
              role: 'user',
              content: `Instruction: ${instruction}

Write the code to insert:`,
            },
          ]);
        }
      }
    );

    // Extract code from response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    const newCode = codeMatch ? codeMatch[1].trim() : response.trim();

    // Show diff preview
    if (selectedText) {
      await this.diffManager.showDiff(editor.document, selection, newCode);
    } else {
      // For new code generation, just insert with preview
      await this.diffManager.showDiff(
        editor.document,
        new vscode.Selection(selection.start, selection.start),
        newCode
      );
    }
  }

  /**
   * Cleanup after inline edit
   */
  private cleanup(editor: vscode.TextEditor): void {
    this.inputBox?.dispose();
    this.inputBox = null;
    editor.setDecorations(this.decorationType, []);
  }

  dispose(): void {
    this.inputBox?.dispose();
    this.decorationType.dispose();
  }
}
