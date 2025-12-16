"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const chat_view_provider_1 = require("./providers/chat-view-provider");
const code_actions_provider_1 = require("./providers/code-actions-provider");
const completion_provider_1 = require("./providers/completion-provider");
const codelens_provider_1 = require("./providers/codelens-provider");
const inline_edit_provider_1 = require("./providers/inline-edit-provider");
const composer_view_provider_1 = require("./providers/composer-view-provider");
const cascade_view_provider_1 = require("./providers/cascade-view-provider");
const context_tree_provider_1 = require("./providers/context-tree-provider");
const ai_client_1 = require("./ai-client");
const review_diagnostics_provider_1 = require("./providers/review-diagnostics-provider");
const diff_manager_1 = require("./diff-manager");
const git_integration_1 = require("./git-integration");
const terminal_integration_1 = require("./terminal-integration");
const flow_state_1 = require("./flow-state");
const smart_context_1 = require("./smart-context");
const project_indexer_1 = require("./project-indexer");
const write_mode_provider_1 = require("./providers/write-mode-provider");
const floating_action_bar_1 = require("./providers/floating-action-bar");
const knowledge_base_1 = require("./knowledge-base");
const supercomplete_provider_1 = require("./providers/supercomplete-provider");
const history_tree_provider_1 = require("./providers/history-tree-provider");
const issues_tree_provider_1 = require("./providers/issues-tree-provider");
const history_manager_1 = require("./history-manager");
const utils_1 = require("./utils");
let aiClient;
let chatViewProvider;
let composerViewProvider;
let cascadeViewProvider;
let diagnosticsProvider;
let diffManager;
let gitIntegration;
let terminalIntegration;
let contextTreeProvider;
let flowStateDetector;
let smartContextManager;
let projectIndexer;
let writeModeProvider;
let floatingActionBar;
let knowledgeBase;
let historyManager;
let historyTreeProvider;
let issuesTreeProvider;
function activate(context) {
    utils_1.logger.info('Code Buddy extension is activating...', 'Extension');
    // Validate configuration
    const configResult = (0, utils_1.validateStartupConfig)();
    if (!configResult.valid) {
        (0, utils_1.showConfigurationWizard)();
    }
    // Initialize configuration
    const config = vscode.workspace.getConfiguration('codebuddy');
    const provider = config.get('provider') || 'grok';
    const apiKey = config.get('apiKey') || (0, utils_1.getApiKey)(provider);
    const model = config.get('model') || (0, utils_1.getDefaultModel)(provider);
    const baseUrl = config.get('baseUrl');
    if (!apiKey && provider !== 'ollama') {
        vscode.window.showWarningMessage('Code Buddy: API key not configured. Please set it in settings.', 'Open Settings', 'Configure Now').then(selection => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'codebuddy.apiKey');
            }
            else if (selection === 'Configure Now') {
                (0, utils_1.showConfigurationWizard)();
            }
        });
    }
    // Initialize AI client
    aiClient = new ai_client_1.AIClient({
        provider,
        apiKey,
        model,
        baseUrl,
        maxTokens: config.get('maxTokens') || 4096,
    });
    // Initialize managers
    diffManager = new diff_manager_1.DiffManager();
    gitIntegration = new git_integration_1.GitIntegration(aiClient);
    terminalIntegration = new terminal_integration_1.TerminalIntegration(aiClient);
    context.subscriptions.push(terminalIntegration);
    // Initialize Windsurf-inspired features
    flowStateDetector = new flow_state_1.FlowStateDetector(aiClient);
    smartContextManager = new smart_context_1.SmartContextManager();
    projectIndexer = new project_indexer_1.ProjectIndexer(aiClient);
    context.subscriptions.push(flowStateDetector, smartContextManager, projectIndexer);
    // Start project indexing in background
    projectIndexer.indexProject().then(index => {
        if (index) {
            utils_1.logger.info(`Indexed ${index.files.size} files, ${index.symbols.size} symbols`, 'ProjectIndexer');
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
    knowledgeBase = new knowledge_base_1.KnowledgeBase(context);
    context.subscriptions.push(knowledgeBase);
    // Initialize Floating Action Bar
    floatingActionBar = new floating_action_bar_1.FloatingActionBar(aiClient, diffManager);
    context.subscriptions.push(floatingActionBar);
    // Register Write Mode Provider
    writeModeProvider = new write_mode_provider_1.WriteModeProvider(context.extensionUri, aiClient, diffManager);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codebuddy.writeMode', writeModeProvider));
    // Register Supercomplete provider (enhanced multi-line completions)
    if (config.get('inlineCompletions')) {
        const supercompleteProvider = new supercomplete_provider_1.SupercompleteProvider(aiClient);
        context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ scheme: 'file' }, supercompleteProvider), supercompleteProvider);
    }
    // Register Chat View Provider (with history support)
    chatViewProvider = new chat_view_provider_1.CodeBuddyChatViewProvider(context.extensionUri, aiClient, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codebuddy.chatView', chatViewProvider));
    // Register Composer View Provider
    composerViewProvider = new composer_view_provider_1.ComposerViewProvider(context.extensionUri, aiClient, diffManager);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codebuddy.composerView', composerViewProvider));
    // Register Cascade View Provider
    cascadeViewProvider = new cascade_view_provider_1.CascadeViewProvider(context.extensionUri, aiClient);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codebuddy.cascadeView', cascadeViewProvider));
    // Register Context Tree Provider
    contextTreeProvider = new context_tree_provider_1.ContextTreeProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider('codebuddy.contextView', contextTreeProvider));
    // Initialize History Manager and Tree Provider
    historyManager = new history_manager_1.HistoryManager(context);
    historyTreeProvider = new history_tree_provider_1.HistoryTreeProvider(historyManager);
    context.subscriptions.push(historyManager, historyTreeProvider, vscode.window.registerTreeDataProvider('codebuddy.historyView', historyTreeProvider));
    // Initialize Issues Tree Provider
    issuesTreeProvider = new issues_tree_provider_1.IssuesTreeProvider();
    context.subscriptions.push(issuesTreeProvider, vscode.window.registerTreeDataProvider('codebuddy.issuesView', issuesTreeProvider));
    // Register history-related commands
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.switchSession', (sessionId) => {
        historyManager.switchSession(sessionId);
        vscode.window.showInformationMessage('Switched to session');
    }), vscode.commands.registerCommand('codebuddy.goToIssue', async (file, line) => {
        const doc = await vscode.workspace.openTextDocument(file);
        const editor = await vscode.window.showTextDocument(doc);
        const position = new vscode.Position(line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }), vscode.commands.registerCommand('codebuddy.clearIssues', () => {
        issuesTreeProvider.clearIssues();
    }), vscode.commands.registerCommand('codebuddy.showOutput', () => {
        utils_1.logger.show();
    }));
    // Register diagnostics provider for code review
    diagnosticsProvider = new review_diagnostics_provider_1.ReviewDiagnosticsProvider(aiClient);
    context.subscriptions.push(diagnosticsProvider);
    // Register code actions provider
    const codeActionsProvider = new code_actions_provider_1.CodeBuddyCodeActionsProvider(aiClient);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, codeActionsProvider, { providedCodeActionKinds: code_actions_provider_1.CodeBuddyCodeActionsProvider.providedCodeActionKinds }));
    // Register inline completion provider (ghost text)
    if (config.get('inlineCompletions')) {
        const completionProvider = new completion_provider_1.CodeBuddyCompletionProvider(aiClient);
        context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ scheme: 'file' }, completionProvider));
    }
    // Register Code Lens provider
    if (config.get('showCodeLens')) {
        const codeLensProvider = new codelens_provider_1.CodeBuddyCodeLensProvider(aiClient);
        context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider));
        // Register Code Lens commands
        (0, codelens_provider_1.registerCodeLensCommands)(context, aiClient);
    }
    // Register Inline Edit Provider
    const inlineEditProvider = new inline_edit_provider_1.CodeBuddyInlineEditProvider(aiClient, diffManager);
    context.subscriptions.push(inlineEditProvider);
    // Register commands
    registerCommands(context, inlineEditProvider);
    // Auto-review on save (if enabled)
    if (config.get('autoReview')) {
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
            await diagnosticsProvider.reviewDocument(document);
        }));
    }
    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('codebuddy')) {
            const newConfig = vscode.workspace.getConfiguration('codebuddy');
            const newProvider = newConfig.get('provider') || 'grok';
            aiClient.updateConfig({
                provider: newProvider,
                apiKey: newConfig.get('apiKey') || (0, utils_1.getApiKey)(newProvider),
                model: newConfig.get('model') || (0, utils_1.getDefaultModel)(newProvider),
                baseUrl: newConfig.get('baseUrl'),
                maxTokens: newConfig.get('maxTokens') || 4096,
            });
        }
    }));
    // Set context for keybindings
    vscode.commands.executeCommand('setContext', 'codebuddy.diffVisible', false);
    // Show welcome message on first install
    const hasShownWelcome = context.globalState.get('codebuddy.hasShownWelcome');
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage('Welcome to Code Buddy! Open the sidebar to start chatting with your AI assistant.', 'Open Chat', 'Open Settings').then(selection => {
            if (selection === 'Open Chat') {
                vscode.commands.executeCommand('codebuddy.chatView.focus');
            }
            else if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'codebuddy');
            }
        });
        context.globalState.update('codebuddy.hasShownWelcome', true);
    }
}
function registerCommands(context, inlineEditProvider) {
    // Open chat command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.chat', async () => {
        await vscode.commands.executeCommand('codebuddy.chatView.focus');
    }));
    // Open composer command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.composer', async () => {
        await vscode.commands.executeCommand('codebuddy.composerView.focus');
    }));
    // Start cascade command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.cascade', async () => {
        const task = await vscode.window.showInputBox({
            prompt: 'What would you like Code Buddy to do?',
            placeHolder: 'e.g., "Add authentication to the API", "Refactor the database layer"',
        });
        if (task) {
            await cascadeViewProvider.startCascade(task);
            await vscode.commands.executeCommand('codebuddy.cascadeView.focus');
        }
    }));
    // Explain selection command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.explain', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text) {
            vscode.window.showInformationMessage('Please select some code to explain');
            return;
        }
        await chatViewProvider.sendMessage(`/explain ${text}`);
        await vscode.commands.executeCommand('codebuddy.chatView.focus');
    }));
    // Refactor selection command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.refactor', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
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
    }));
    // Fix selection command with diff preview
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.fix', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        const language = editor.document.languageId;
        if (!text) {
            vscode.window.showInformationMessage('Please select some code to fix');
            return;
        }
        const response = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Code Buddy is fixing...' }, async () => {
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
        });
        // Extract code from response
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
        const fixedCode = codeMatch ? codeMatch[1].trim() : response.trim();
        // Show diff and ask for confirmation
        await diffManager.showDiff(editor.document, selection, fixedCode);
    }));
    // Generate tests command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.generateTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        const language = editor.document.languageId;
        if (!text) {
            vscode.window.showInformationMessage('Please select some code to generate tests for');
            return;
        }
        await chatViewProvider.sendMessage(`/tests\n\n\`\`\`${language}\n${text}\n\`\`\``);
        await vscode.commands.executeCommand('codebuddy.chatView.focus');
    }));
    // Review code command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.review', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        await chatViewProvider.sendMessage(`/review\n\n\`\`\`${editor.document.languageId}\n${text}\n\`\`\``);
        await vscode.commands.executeCommand('codebuddy.chatView.focus');
    }));
    // Open terminal command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.terminal', async () => {
        const terminal = vscode.window.createTerminal({
            name: 'Code Buddy CLI',
            shellPath: 'npx',
            shellArgs: ['@phuetz/code-buddy'],
        });
        terminal.show();
    }));
    // Inline edit command (Cmd+K style)
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.inlineEdit', async () => {
        await inlineEditProvider.startInlineEdit();
    }));
    // Accept diff command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.acceptDiff', async () => {
        await diffManager.acceptCurrentDiff();
    }));
    // Reject diff command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.rejectDiff', async () => {
        await diffManager.rejectCurrentDiff();
    }));
    // Add file to context command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.addContext', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            contextTreeProvider.addFile(editor.document.uri);
            vscode.window.showInformationMessage(`Added ${editor.document.fileName} to context`);
        }
    }));
    // Generate commit message command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.generateCommit', async () => {
        await gitIntegration.generateCommitMessage();
    }));
    // Add documentation command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.addDocs', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text) {
            vscode.window.showInformationMessage('Please select some code to document');
            return;
        }
        await chatViewProvider.sendMessage(`/doc\n\n\`\`\`${editor.document.languageId}\n${text}\n\`\`\``);
        await vscode.commands.executeCommand('codebuddy.chatView.focus');
    }));
    // Optimize command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.optimize', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text) {
            vscode.window.showInformationMessage('Please select some code to optimize');
            return;
        }
        await chatViewProvider.sendMessage(`/optimize\n\n\`\`\`${editor.document.languageId}\n${text}\n\`\`\``);
        await vscode.commands.executeCommand('codebuddy.chatView.focus');
    }));
    // Show diff command (for Code Lens)
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.showDiff', async (document, range, newCode) => {
        const selection = new vscode.Selection(range.start, range.end);
        await diffManager.showDiff(document, selection, newCode);
    }));
    // Write mode command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.writeMode', async () => {
        await vscode.commands.executeCommand('codebuddy.writeMode.focus');
    }));
}
function deactivate() {
    utils_1.logger.info('Code Buddy extension deactivating...', 'Extension');
    diffManager?.dispose();
    utils_1.logger.dispose();
}
//# sourceMappingURL=extension.js.map