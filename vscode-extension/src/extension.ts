/**
 * Code Buddy VS Code Extension
 *
 * AI-powered coding assistant inspired by GitHub Copilot, Windsurf, and Cursor
 * Features:
 * - Chat with slash commands (/explain, /fix, /tests, /doc, /review)
 * - @mentions for context (@file, @workspace, @selection, @terminal, @git)
 * - Inline edit (Cmd+K style)
 * - Composer for multi-file editing
 * - Cascade (agentic mode)
 * - Diff preview before applying changes
 * - Code Lens for quick AI actions
 * - Git integration
 * - Terminal command suggestions
 * - Conversation history persistence
 */

import * as vscode from 'vscode';
import { CodeBuddyChatViewProvider } from './providers/chat-view-provider';
import { CodeBuddyCodeActionsProvider } from './providers/code-actions-provider';
import { CodeBuddyCompletionProvider } from './providers/completion-provider';
import { CodeBuddyCodeLensProvider, registerCodeLensCommands } from './providers/codelens-provider';
import { CodeBuddyInlineEditProvider } from './providers/inline-edit-provider';
import { ComposerViewProvider } from './providers/composer-view-provider';
import { CascadeViewProvider } from './providers/cascade-view-provider';
import { ContextTreeProvider } from './providers/context-tree-provider';
import { AIClient } from './ai-client';
import { ReviewDiagnosticsProvider } from './providers/review-diagnostics-provider';
import { DiffManager } from './diff-manager';
import { GitIntegration } from './git-integration';
import { TerminalIntegration } from './terminal-integration';
import { FlowStateDetector } from './flow-state';
import { SmartContextManager } from './smart-context';
import { ProjectIndexer } from './project-indexer';
import { WriteModeProvider } from './providers/write-mode-provider';
import { FloatingActionBar } from './providers/floating-action-bar';
import { KnowledgeBase } from './knowledge-base';
import { SupercompleteProvider } from './providers/supercomplete-provider';
import { HistoryTreeProvider } from './providers/history-tree-provider';
import { IssuesTreeProvider } from './providers/issues-tree-provider';
import { HistoryManager } from './history-manager';
import { logger, validateStartupConfig, showConfigurationWizard, getApiKey, getDefaultModel, getDefaultBaseUrl } from './utils';

let aiClient: AIClient;
let chatViewProvider: CodeBuddyChatViewProvider;
let composerViewProvider: ComposerViewProvider;
let cascadeViewProvider: CascadeViewProvider;
let diagnosticsProvider: ReviewDiagnosticsProvider;
let diffManager: DiffManager;
let gitIntegration: GitIntegration;
let terminalIntegration: TerminalIntegration;
let contextTreeProvider: ContextTreeProvider;
let flowStateDetector: FlowStateDetector;
let smartContextManager: SmartContextManager;
let projectIndexer: ProjectIndexer;
let writeModeProvider: WriteModeProvider;
let floatingActionBar: FloatingActionBar;
let knowledgeBase: KnowledgeBase;
let historyManager: HistoryManager;
let historyTreeProvider: HistoryTreeProvider;
let issuesTreeProvider: IssuesTreeProvider;

export function activate(context: vscode.ExtensionContext) {
  logger.info('Code Buddy extension is activating...', 'Extension');

  // Validate configuration
  const configResult = validateStartupConfig();
  if (!configResult.valid) {
    showConfigurationWizard();
  }

  // Initialize configuration
  const config = vscode.workspace.getConfiguration('codebuddy');
  const provider = config.get<string>('provider') || 'grok';
  const apiKey = config.get<string>('apiKey') || getApiKey(provider);
  const model = config.get<string>('model') || getDefaultModel(provider);
  const baseUrl = config.get<string>('baseUrl');

  if (!apiKey && provider !== 'ollama') {
    vscode.window.showWarningMessage(
      'Code Buddy: API key not configured. Please set it in settings.',
      'Open Settings',
      'Configure Now'
    ).then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'codebuddy.apiKey');
      } else if (selection === 'Configure Now') {
        showConfigurationWizard();
      }
    });
  }

  // Initialize AI client
  aiClient = new AIClient({
    provider,
    apiKey,
    model,
    baseUrl,
    maxTokens: config.get<number>('maxTokens') || 4096,
  });

  // Initialize managers
  diffManager = new DiffManager();
  gitIntegration = new GitIntegration(aiClient);
  terminalIntegration = new TerminalIntegration(aiClient);
  context.subscriptions.push(terminalIntegration);

  // Initialize Windsurf-inspired features
  flowStateDetector = new FlowStateDetector(aiClient);
  smartContextManager = new SmartContextManager();
  projectIndexer = new ProjectIndexer(aiClient);
  context.subscriptions.push(flowStateDetector, smartContextManager, projectIndexer);

  // Start project indexing in background
  projectIndexer.indexProject().then(index => {
    if (index) {
      logger.info(`Indexed ${index.files.size} files, ${index.symbols.size} symbols`, 'ProjectIndexer');
    }
  });

  // Listen for flow state changes
  flowStateDetector.onFlowChange(flow => {
    if (flow.confidence > 0.7) {
      // Show status bar item with current task
      const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
      statusItem.text = `$(lightbulb) ${flow.currentTask.slice(0, 30)}...`;
      statusItem.tooltip = `Code Buddy detected: ${flow.currentTask}`;
      statusItem.show();
      setTimeout(() => statusItem.dispose(), 10000);
    }
  });

  // Initialize Knowledge Base (persistent project memory)
  knowledgeBase = new KnowledgeBase(context);
  context.subscriptions.push(knowledgeBase);

  // Initialize Floating Action Bar
  floatingActionBar = new FloatingActionBar(aiClient, diffManager);
  context.subscriptions.push(floatingActionBar);

  // Register Write Mode Provider
  writeModeProvider = new WriteModeProvider(context.extensionUri, aiClient, diffManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codebuddy.writeMode', writeModeProvider)
  );

  // Register Supercomplete provider (enhanced multi-line completions)
  if (config.get<boolean>('inlineCompletions')) {
    const supercompleteProvider = new SupercompleteProvider(aiClient);
    context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        { scheme: 'file' },
        supercompleteProvider
      ),
      supercompleteProvider
    );
  }

  // Register Chat View Provider (with history support)
  chatViewProvider = new CodeBuddyChatViewProvider(context.extensionUri, aiClient, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codebuddy.chatView', chatViewProvider)
  );

  // Register Composer View Provider
  composerViewProvider = new ComposerViewProvider(context.extensionUri, aiClient, diffManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codebuddy.composerView', composerViewProvider)
  );

  // Register Cascade View Provider
  cascadeViewProvider = new CascadeViewProvider(context.extensionUri, aiClient);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codebuddy.cascadeView', cascadeViewProvider)
  );

  // Register Context Tree Provider
  contextTreeProvider = new ContextTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codebuddy.contextView', contextTreeProvider)
  );

  // Initialize History Manager and Tree Provider
  historyManager = new HistoryManager(context);
  historyTreeProvider = new HistoryTreeProvider(historyManager);
  context.subscriptions.push(
    historyManager,
    historyTreeProvider,
    vscode.window.registerTreeDataProvider('codebuddy.historyView', historyTreeProvider)
  );

  // Initialize Issues Tree Provider
  issuesTreeProvider = new IssuesTreeProvider();
  context.subscriptions.push(
    issuesTreeProvider,
    vscode.window.registerTreeDataProvider('codebuddy.issuesView', issuesTreeProvider)
  );

  // Register history-related commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.switchSession', (sessionId: string) => {
      historyManager.switchSession(sessionId);
      vscode.window.showInformationMessage('Switched to session');
    }),
    vscode.commands.registerCommand('codebuddy.goToIssue', async (file: string, line: number) => {
      const doc = await vscode.workspace.openTextDocument(file);
      const editor = await vscode.window.showTextDocument(doc);
      const position = new vscode.Position(line - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }),
    vscode.commands.registerCommand('codebuddy.clearIssues', () => {
      issuesTreeProvider.clearIssues();
    }),
    vscode.commands.registerCommand('codebuddy.showOutput', () => {
      logger.show();
    })
  );

  // Register diagnostics provider for code review
  diagnosticsProvider = new ReviewDiagnosticsProvider(aiClient);
  context.subscriptions.push(diagnosticsProvider);

  // Register code actions provider
  const codeActionsProvider = new CodeBuddyCodeActionsProvider(aiClient);
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      codeActionsProvider,
      { providedCodeActionKinds: CodeBuddyCodeActionsProvider.providedCodeActionKinds }
    )
  );

  // Register inline completion provider (ghost text)
  if (config.get<boolean>('inlineCompletions')) {
    const completionProvider = new CodeBuddyCompletionProvider(aiClient);
    context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        { scheme: 'file' },
        completionProvider
      )
    );
  }

  // Register Code Lens provider
  if (config.get<boolean>('showCodeLens')) {
    const codeLensProvider = new CodeBuddyCodeLensProvider(aiClient);
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        { scheme: 'file' },
        codeLensProvider
      )
    );
    // Register Code Lens commands
    registerCodeLensCommands(context, aiClient);
  }

  // Register Inline Edit Provider
  const inlineEditProvider = new CodeBuddyInlineEditProvider(aiClient, diffManager);
  context.subscriptions.push(inlineEditProvider);

  // Register commands
  registerCommands(context, inlineEditProvider);

  // Auto-review on save (if enabled)
  if (config.get<boolean>('autoReview')) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        await diagnosticsProvider.reviewDocument(document);
      })
    );
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('codebuddy')) {
        const newConfig = vscode.workspace.getConfiguration('codebuddy');
        const newProvider = newConfig.get<string>('provider') || 'grok';
        aiClient.updateConfig({
          provider: newProvider,
          apiKey: newConfig.get<string>('apiKey') || getApiKey(newProvider),
          model: newConfig.get<string>('model') || getDefaultModel(newProvider),
          baseUrl: newConfig.get<string>('baseUrl'),
          maxTokens: newConfig.get<number>('maxTokens') || 4096,
        });
      }
    })
  );

  // Set context for keybindings
  vscode.commands.executeCommand('setContext', 'codebuddy.diffVisible', false);

  // Show welcome message on first install
  const hasShownWelcome = context.globalState.get('codebuddy.hasShownWelcome');
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      'Welcome to Code Buddy! Open the sidebar to start chatting with your AI assistant.',
      'Open Chat',
      'Open Settings'
    ).then(selection => {
      if (selection === 'Open Chat') {
        vscode.commands.executeCommand('codebuddy.chatView.focus');
      } else if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'codebuddy');
      }
    });
    context.globalState.update('codebuddy.hasShownWelcome', true);
  }
}

function registerCommands(
  context: vscode.ExtensionContext,
  inlineEditProvider: CodeBuddyInlineEditProvider
) {
  // Open chat command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.chat', async () => {
      await vscode.commands.executeCommand('codebuddy.chatView.focus');
    })
  );

  // Open composer command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.composer', async () => {
      await vscode.commands.executeCommand('codebuddy.composerView.focus');
    })
  );

  // Start cascade command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.cascade', async () => {
      const task = await vscode.window.showInputBox({
        prompt: 'What would you like Code Buddy to do?',
        placeHolder: 'e.g., "Add authentication to the API", "Refactor the database layer"',
      });

      if (task) {
        await cascadeViewProvider.startCascade(task);
        await vscode.commands.executeCommand('codebuddy.cascadeView.focus');
      }
    })
  );

  // Explain selection command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.explain', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showInformationMessage('Please select some code to explain');
        return;
      }

      await chatViewProvider.sendMessage(`/explain ${text}`);
      await vscode.commands.executeCommand('codebuddy.chatView.focus');
    })
  );

  // Refactor selection command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.refactor', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showInformationMessage('Please select some code to refactor');
        return;
      }

      const instruction = await vscode.window.showInputBox({
        prompt: 'How would you like to refactor this code?',
        placeHolder: 'e.g., "make it more readable", "use async/await", "add error handling"',
      });

      if (instruction) {
        await chatViewProvider.sendMessage(`/refactor ${instruction}\n\n${text}`);
        await vscode.commands.executeCommand('codebuddy.chatView.focus');
      }
    })
  );

  // Fix selection command with diff preview
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.fix', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      const language = editor.document.languageId;

      if (!text) {
        vscode.window.showInformationMessage('Please select some code to fix');
        return;
      }

      const response = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Code Buddy is fixing...' },
        async () => {
          return await aiClient.chat([
            {
              role: 'system',
              content: `You are an expert ${language} developer. Fix the code and return ONLY the fixed code, no explanations.`,
            },
            {
              role: 'user',
              content: `Fix this code:\n\`\`\`${language}\n${text}\n\`\`\``,
            },
          ]);
        }
      );

      // Extract code from response
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      const fixedCode = codeMatch ? codeMatch[1].trim() : response.trim();

      // Show diff and ask for confirmation
      await diffManager.showDiff(editor.document, selection, fixedCode);
    })
  );

  // Generate tests command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.generateTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      const language = editor.document.languageId;

      if (!text) {
        vscode.window.showInformationMessage('Please select some code to generate tests for');
        return;
      }

      await chatViewProvider.sendMessage(`/tests\n\n\`\`\`${language}\n${text}\n\`\`\``);
      await vscode.commands.executeCommand('codebuddy.chatView.focus');
    })
  );

  // Review code command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.review', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);

      await chatViewProvider.sendMessage(`/review\n\n\`\`\`${editor.document.languageId}\n${text}\n\`\`\``);
      await vscode.commands.executeCommand('codebuddy.chatView.focus');
    })
  );

  // Open terminal command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.terminal', async () => {
      const terminal = vscode.window.createTerminal({
        name: 'Code Buddy CLI',
        shellPath: 'npx',
        shellArgs: ['@phuetz/code-buddy'],
      });
      terminal.show();
    })
  );

  // Inline edit command (Cmd+K style)
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.inlineEdit', async () => {
      await inlineEditProvider.startInlineEdit();
    })
  );

  // Accept diff command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.acceptDiff', async () => {
      await diffManager.acceptCurrentDiff();
    })
  );

  // Reject diff command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.rejectDiff', async () => {
      await diffManager.rejectCurrentDiff();
    })
  );

  // Add file to context command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.addContext', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        contextTreeProvider.addFile(editor.document.uri);
        vscode.window.showInformationMessage(`Added ${editor.document.fileName} to context`);
      }
    })
  );

  // Generate commit message command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.generateCommit', async () => {
      await gitIntegration.generateCommitMessage();
    })
  );

  // Add documentation command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.addDocs', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showInformationMessage('Please select some code to document');
        return;
      }

      await chatViewProvider.sendMessage(`/doc\n\n\`\`\`${editor.document.languageId}\n${text}\n\`\`\``);
      await vscode.commands.executeCommand('codebuddy.chatView.focus');
    })
  );

  // Optimize command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.optimize', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showInformationMessage('Please select some code to optimize');
        return;
      }

      await chatViewProvider.sendMessage(`/optimize\n\n\`\`\`${editor.document.languageId}\n${text}\n\`\`\``);
      await vscode.commands.executeCommand('codebuddy.chatView.focus');
    })
  );

  // Show diff command (for Code Lens)
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.showDiff', async (
      document: vscode.TextDocument,
      range: vscode.Range,
      newCode: string
    ) => {
      const selection = new vscode.Selection(range.start, range.end);
      await diffManager.showDiff(document, selection, newCode);
    })
  );

  // Write mode command
  context.subscriptions.push(
    vscode.commands.registerCommand('codebuddy.writeMode', async () => {
      await vscode.commands.executeCommand('codebuddy.writeMode.focus');
    })
  );
}

export function deactivate() {
  logger.info('Code Buddy extension deactivating...', 'Extension');
  diffManager?.dispose();
  logger.dispose();
}
