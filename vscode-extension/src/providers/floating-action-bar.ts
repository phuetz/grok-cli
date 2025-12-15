/**
 * Floating Action Bar
 * Cursor/Windsurf-inspired quick action bar that appears on selection
 * Provides one-click access to AI actions
 */

import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
import { DiffManager } from '../diff-manager';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  tooltip: string;
  command: string;
  args?: unknown[];
}

export class FloatingActionBar implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private decorationType: vscode.TextEditorDecorationType;
  private statusBarItem: vscode.StatusBarItem;
  private currentEditor: vscode.TextEditor | undefined;
  private showTimeout: NodeJS.Timeout | null = null;

  private readonly actions: QuickAction[] = [
    {
      id: 'explain',
      icon: '$(question)',
      label: 'Explain',
      tooltip: 'Explain this code',
      command: 'codebuddy.explain',
    },
    {
      id: 'refactor',
      icon: '$(symbol-misc)',
      label: 'Refactor',
      tooltip: 'Refactor this code',
      command: 'codebuddy.refactor',
    },
    {
      id: 'fix',
      icon: '$(wrench)',
      label: 'Fix',
      tooltip: 'Fix issues in this code',
      command: 'codebuddy.fix',
    },
    {
      id: 'tests',
      icon: '$(beaker)',
      label: 'Test',
      tooltip: 'Generate tests',
      command: 'codebuddy.generateTests',
    },
    {
      id: 'doc',
      icon: '$(book)',
      label: 'Doc',
      tooltip: 'Add documentation',
      command: 'codebuddy.addDocs',
    },
    {
      id: 'edit',
      icon: '$(edit)',
      label: 'Edit',
      tooltip: 'Inline edit (Cmd+K)',
      command: 'codebuddy.inlineEdit',
    },
  ];

  constructor(
    private readonly aiClient: AIClient,
    private readonly diffManager: DiffManager
  ) {
    // Create decoration type for visual indicator
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: ' ⚡',
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
      },
    });

    // Create status bar for action menu
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      1000
    );

    this.setupListeners();
    this.registerCommands();
  }

  private setupListeners(): void {
    // Listen for selection changes
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(e => {
        this.onSelectionChange(e);
      })
    );

    // Listen for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        this.currentEditor = editor;
        this.hideActionBar();
      })
    );
  }

  private registerCommands(): void {
    // Register the floating action bar menu command
    this.disposables.push(
      vscode.commands.registerCommand('codebuddy.showActionBar', async () => {
        await this.showQuickPick();
      })
    );

    // Register quick action commands
    this.disposables.push(
      vscode.commands.registerCommand('codebuddy.quickExplain', async () => {
        await this.executeQuickAction('explain');
      }),
      vscode.commands.registerCommand('codebuddy.quickRefactor', async () => {
        await this.executeQuickAction('refactor');
      }),
      vscode.commands.registerCommand('codebuddy.quickFix', async () => {
        await this.executeQuickAction('fix');
      }),
      vscode.commands.registerCommand('codebuddy.quickTests', async () => {
        await this.executeQuickAction('tests');
      }),
      vscode.commands.registerCommand('codebuddy.quickDoc', async () => {
        await this.executeQuickAction('doc');
      })
    );
  }

  private onSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
    const editor = event.textEditor;
    const selection = editor.selection;

    // Clear any pending timeout
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }

    // Hide if no selection
    if (selection.isEmpty) {
      this.hideActionBar();
      return;
    }

    // Only show for meaningful selections (at least 10 characters)
    const selectedText = editor.document.getText(selection);
    if (selectedText.length < 10) {
      this.hideActionBar();
      return;
    }

    // Debounce showing the action bar
    this.showTimeout = setTimeout(() => {
      this.showActionBar(editor, selection);
    }, 500);
  }

  private showActionBar(editor: vscode.TextEditor, selection: vscode.Selection): void {
    this.currentEditor = editor;

    // Update status bar with action buttons
    const selectedLines = selection.end.line - selection.start.line + 1;
    const selectedChars = editor.document.getText(selection).length;

    this.statusBarItem.text = `$(sparkle) AI Actions (${selectedLines}L, ${selectedChars}c)`;
    this.statusBarItem.tooltip = 'Click for AI actions on selection';
    this.statusBarItem.command = 'codebuddy.showActionBar';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    this.statusBarItem.show();

    // Add decoration at end of selection
    const decorations: vscode.DecorationOptions[] = [
      {
        range: new vscode.Range(selection.end, selection.end),
      },
    ];
    editor.setDecorations(this.decorationType, decorations);
  }

  private hideActionBar(): void {
    this.statusBarItem.hide();
    if (this.currentEditor) {
      this.currentEditor.setDecorations(this.decorationType, []);
    }
  }

  private async showQuickPick(): Promise<void> {
    const items = this.actions.map(action => ({
      label: `${action.icon} ${action.label}`,
      description: action.tooltip,
      action,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an AI action',
      matchOnDescription: true,
    });

    if (selected) {
      await vscode.commands.executeCommand(selected.action.command, ...(selected.action.args || []));
    }
  }

  private async executeQuickAction(actionId: string): Promise<void> {
    const action = this.actions.find(a => a.id === actionId);
    if (action) {
      await vscode.commands.executeCommand(action.command, ...(action.args || []));
    }
  }

  /**
   * Show inline action buttons (experimental)
   * Uses decorations to show clickable buttons
   */
  async showInlineActions(editor: vscode.TextEditor, range: vscode.Range): Promise<void> {
    // This is a simplified version - full implementation would use
    // WebView overlays for proper click handling

    const hoverMessage = new vscode.MarkdownString();
    hoverMessage.isTrusted = true;
    hoverMessage.supportHtml = true;

    hoverMessage.appendMarkdown('**Code Buddy Actions**\n\n');
    hoverMessage.appendMarkdown(
      '[Explain](command:codebuddy.explain) | ' +
      '[Refactor](command:codebuddy.refactor) | ' +
      '[Fix](command:codebuddy.fix) | ' +
      '[Test](command:codebuddy.generateTests) | ' +
      '[Doc](command:codebuddy.addDocs) | ' +
      '[Edit](command:codebuddy.inlineEdit)'
    );

    const decoration = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: '',
      },
    });

    const decorations: vscode.DecorationOptions[] = [
      {
        range,
        hoverMessage,
      },
    ];

    editor.setDecorations(decoration, decorations);
  }

  dispose(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
    this.decorationType.dispose();
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

/**
 * Action Bar WebView Panel (for more sophisticated UI)
 * Could be used for a floating toolbar overlay
 */
export class ActionBarPanel {
  private static panel: vscode.WebviewPanel | undefined;

  static show(extensionUri: vscode.Uri, selection: vscode.Selection): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // Calculate position near selection
    const position = editor.selection.active;

    if (ActionBarPanel.panel) {
      ActionBarPanel.panel.reveal(vscode.ViewColumn.Beside);
    } else {
      ActionBarPanel.panel = vscode.window.createWebviewPanel(
        'codebuddyActions',
        'Quick Actions',
        {
          viewColumn: vscode.ViewColumn.Beside,
          preserveFocus: true,
        },
        {
          enableScripts: true,
          localResourceRoots: [extensionUri],
        }
      );

      ActionBarPanel.panel.webview.html = ActionBarPanel.getContent();

      ActionBarPanel.panel.onDidDispose(() => {
        ActionBarPanel.panel = undefined;
      });

      ActionBarPanel.panel.webview.onDidReceiveMessage(async message => {
        switch (message.command) {
          case 'action':
            await vscode.commands.executeCommand(`codebuddy.${message.action}`);
            ActionBarPanel.panel?.dispose();
            break;
        }
      });
    }
  }

  private static getContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    button {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <button onclick="action('explain')">$(question) Explain</button>
  <button onclick="action('refactor')">$(symbol-misc) Refactor</button>
  <button onclick="action('fix')">$(wrench) Fix</button>
  <button onclick="action('generateTests')">$(beaker) Tests</button>
  <button onclick="action('addDocs')">$(book) Docs</button>
  <button onclick="action('inlineEdit')">$(edit) Edit</button>

  <script>
    const vscode = acquireVsCodeApi();
    function action(name) {
      vscode.postMessage({ command: 'action', action: name });
    }
  </script>
</body>
</html>`;
  }
}
