/**
 * Code Lens Provider
 * Shows AI action buttons above functions and classes
 */

import * as vscode from 'vscode';
import { AIClient } from '../ai-client';

export class CodeBuddyCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(private readonly aiClient: AIClient) {}

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const language = document.languageId;

    // Find functions and classes based on language
    const patterns = this.getPatternsForLanguage(language);

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex, 'gm');
      const text = document.getText();
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position);

        // Add "Explain" lens
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(lightbulb) Explain',
            command: 'codebuddy.explainSymbol',
            arguments: [document, position, pattern.type],
          })
        );

        // Add "Generate Tests" lens
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(beaker) Tests',
            command: 'codebuddy.generateTestsForSymbol',
            arguments: [document, position, pattern.type],
          })
        );

        // Add "Optimize" lens
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(zap) Optimize',
            command: 'codebuddy.optimizeSymbol',
            arguments: [document, position, pattern.type],
          })
        );

        // Add "Document" lens
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(book) Document',
            command: 'codebuddy.documentSymbol',
            arguments: [document, position, pattern.type],
          })
        );
      }
    }

    return codeLenses;
  }

  private getPatternsForLanguage(language: string): Array<{ regex: string; type: string }> {
    switch (language) {
      case 'typescript':
      case 'typescriptreact':
      case 'javascript':
      case 'javascriptreact':
        return [
          { regex: '^\\s*(export\\s+)?(async\\s+)?function\\s+\\w+', type: 'function' },
          { regex: '^\\s*(export\\s+)?class\\s+\\w+', type: 'class' },
          { regex: '^\\s*(export\\s+)?const\\s+\\w+\\s*=\\s*(async\\s+)?\\([^)]*\\)\\s*=>', type: 'arrow' },
          { regex: '^\\s*(public|private|protected)?\\s*(async\\s+)?\\w+\\s*\\([^)]*\\)\\s*[:{]', type: 'method' },
        ];

      case 'python':
        return [
          { regex: '^\\s*def\\s+\\w+', type: 'function' },
          { regex: '^\\s*class\\s+\\w+', type: 'class' },
          { regex: '^\\s*async\\s+def\\s+\\w+', type: 'async_function' },
        ];

      case 'go':
        return [
          { regex: '^func\\s+\\w+', type: 'function' },
          { regex: '^func\\s+\\([^)]+\\)\\s+\\w+', type: 'method' },
          { regex: '^type\\s+\\w+\\s+struct', type: 'struct' },
          { regex: '^type\\s+\\w+\\s+interface', type: 'interface' },
        ];

      case 'rust':
        return [
          { regex: '^\\s*(pub\\s+)?fn\\s+\\w+', type: 'function' },
          { regex: '^\\s*(pub\\s+)?struct\\s+\\w+', type: 'struct' },
          { regex: '^\\s*(pub\\s+)?impl\\s+\\w+', type: 'impl' },
          { regex: '^\\s*(pub\\s+)?trait\\s+\\w+', type: 'trait' },
        ];

      case 'java':
      case 'kotlin':
        return [
          { regex: '^\\s*(public|private|protected)?\\s*(static)?\\s*\\w+\\s+\\w+\\s*\\(', type: 'method' },
          { regex: '^\\s*(public|private)?\\s*class\\s+\\w+', type: 'class' },
          { regex: '^\\s*(public|private)?\\s*interface\\s+\\w+', type: 'interface' },
        ];

      default:
        return [
          { regex: '^\\s*function\\s+\\w+', type: 'function' },
          { regex: '^\\s*class\\s+\\w+', type: 'class' },
        ];
    }
  }

  resolveCodeLens(
    codeLens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): vscode.CodeLens | Thenable<vscode.CodeLens> {
    return codeLens;
  }
}

// Register additional commands for code lens
export function registerCodeLensCommands(
  context: vscode.ExtensionContext,
  aiClient: AIClient
): void {
  // Explain symbol command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codebuddy.explainSymbol',
      async (document: vscode.TextDocument, position: vscode.Position, symbolType: string) => {
        const symbolRange = getSymbolRange(document, position);
        const symbolText = document.getText(symbolRange);

        const explanation = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Explaining...' },
          async () => {
            return await aiClient.chat([
              { role: 'system', content: 'You are a helpful coding assistant.' },
              { role: 'user', content: `Explain this ${symbolType}:\n\n\`\`\`\n${symbolText}\n\`\`\`` },
            ]);
          }
        );

        // Show in output channel
        const channel = vscode.window.createOutputChannel('Code Buddy');
        channel.clear();
        channel.appendLine(`Explanation for ${symbolType}:\n`);
        channel.appendLine(explanation);
        channel.show();
      }
    )
  );

  // Generate tests for symbol command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codebuddy.generateTestsForSymbol',
      async (document: vscode.TextDocument, position: vscode.Position, symbolType: string) => {
        const symbolRange = getSymbolRange(document, position);
        const symbolText = document.getText(symbolRange);
        const language = document.languageId;

        const tests = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Generating tests...' },
          async () => {
            return await aiClient.chat([
              {
                role: 'system',
                content: `You are an expert ${language} developer. Generate comprehensive unit tests.`,
              },
              {
                role: 'user',
                content: `Generate tests for this ${symbolType}:\n\n\`\`\`${language}\n${symbolText}\n\`\`\``,
              },
            ]);
          }
        );

        // Show in new untitled document
        const doc = await vscode.workspace.openTextDocument({
          language,
          content: extractCode(tests),
        });
        await vscode.window.showTextDocument(doc);
      }
    )
  );

  // Optimize symbol command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codebuddy.optimizeSymbol',
      async (document: vscode.TextDocument, position: vscode.Position, symbolType: string) => {
        const symbolRange = getSymbolRange(document, position);
        const symbolText = document.getText(symbolRange);
        const language = document.languageId;

        const optimized = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Optimizing...' },
          async () => {
            return await aiClient.chat([
              {
                role: 'system',
                content: `You are an expert ${language} developer. Optimize the code for performance and readability. Return ONLY the optimized code.`,
              },
              {
                role: 'user',
                content: `Optimize this ${symbolType}:\n\n\`\`\`${language}\n${symbolText}\n\`\`\``,
              },
            ]);
          }
        );

        // Show diff
        const optimizedCode = extractCode(optimized);
        await vscode.commands.executeCommand(
          'codebuddy.showDiff',
          document,
          symbolRange,
          optimizedCode
        );
      }
    )
  );

  // Document symbol command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codebuddy.documentSymbol',
      async (document: vscode.TextDocument, position: vscode.Position, symbolType: string) => {
        const symbolRange = getSymbolRange(document, position);
        const symbolText = document.getText(symbolRange);
        const language = document.languageId;

        const documented = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Adding documentation...' },
          async () => {
            return await aiClient.chat([
              {
                role: 'system',
                content: `You are an expert ${language} developer. Add comprehensive documentation comments. Return the code with documentation.`,
              },
              {
                role: 'user',
                content: `Add documentation to this ${symbolType}:\n\n\`\`\`${language}\n${symbolText}\n\`\`\``,
              },
            ]);
          }
        );

        const documentedCode = extractCode(documented);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          await editor.edit(editBuilder => {
            editBuilder.replace(symbolRange, documentedCode);
          });
        }
      }
    )
  );
}

function getSymbolRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
  // Find the end of the symbol (function/class body)
  const startLine = position.line;
  let endLine = startLine;
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let i = startLine; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;
    for (const char of line) {
      if (char === '{' || char === ':') {
        braceCount++;
        foundOpenBrace = true;
      } else if (char === '}') {
        braceCount--;
      }
    }

    if (foundOpenBrace && braceCount === 0) {
      endLine = i;
      break;
    }

    // For Python, use indentation
    if (!foundOpenBrace && i > startLine) {
      const currentIndent = line.length - line.trimStart().length;
      const startIndent =
        document.lineAt(startLine).text.length -
        document.lineAt(startLine).text.trimStart().length;
      if (line.trim() && currentIndent <= startIndent) {
        endLine = i - 1;
        break;
      }
    }

    endLine = i;
  }

  return new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
}

function extractCode(response: string): string {
  const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
  return codeMatch ? codeMatch[1].trim() : response.trim();
}
