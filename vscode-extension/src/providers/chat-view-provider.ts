/**
 * Chat View Provider for VS Code Sidebar
 * Enhanced with slash commands, @mentions, and history
 * Inspired by GitHub Copilot and Windsurf
 */

import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
import { SlashCommandHandler, CommandContext } from '../slash-commands';
import { MentionsHandler, ResolvedMentions } from '../mentions-handler';
import { HistoryManager } from '../history-manager';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mentions?: string[];
  command?: string;
}

export class CodeBuddyChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codebuddy.chatView';

  private _view?: vscode.WebviewView;
  private _messages: ChatMessage[] = [];
  private slashHandler: SlashCommandHandler;
  private mentionsHandler: MentionsHandler;
  private historyManager?: HistoryManager;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _aiClient: AIClient,
    context?: vscode.ExtensionContext
  ) {
    this.slashHandler = new SlashCommandHandler(_aiClient);
    this.mentionsHandler = new MentionsHandler();
    if (context) {
      this.historyManager = new HistoryManager(context);
      this.loadCurrentSession();
    }
  }

  private loadCurrentSession(): void {
    if (this.historyManager) {
      const session = this.historyManager.getCurrentSession();
      this._messages = session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp),
        mentions: m.mentions,
        command: m.command,
      }));
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage':
          await this.handleUserMessage(data.message);
          break;
        case 'clearHistory':
          this._messages = [];
          this.historyManager?.clearCurrentSession();
          this.updateWebview();
          break;
        case 'insertCode':
          await this.insertCodeToEditor(data.code);
          break;
        case 'copyCode':
          await vscode.env.clipboard.writeText(data.code);
          vscode.window.showInformationMessage('Code copied to clipboard');
          break;
        case 'newSession':
          this.historyManager?.createSession();
          this._messages = [];
          this.updateWebview();
          break;
        case 'loadSession':
          const session = this.historyManager?.switchSession(data.sessionId);
          if (session) {
            this._messages = session.messages.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: new Date(m.timestamp),
            }));
            this.updateWebview();
          }
          break;
        case 'getSessions':
          this.sendSessions();
          break;
        case 'getCommands':
          this.sendCommands();
          break;
        case 'getMentions':
          this.sendMentions();
          break;
        case 'applyCode':
          await this.applyCodeToEditor(data.code);
          break;
      }
    });

    // Initial update
    this.updateWebview();
  }

  /**
   * Send a message programmatically
   */
  public async sendMessage(message: string): Promise<void> {
    await this.handleUserMessage(message);
  }

  /**
   * Handle user message with slash commands and mentions
   */
  private async handleUserMessage(message: string): Promise<void> {
    // Parse slash command
    const { command, args } = this.slashHandler.parseMessage(message);

    // Resolve @mentions
    const { mentions, cleanedMessage } = await this.mentionsHandler.resolveMentions(
      command ? args : message
    );

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      mentions: mentions.map(m => m.label),
      command,
    };
    this._messages.push(userMessage);
    this.historyManager?.addMessage({
      role: 'user',
      content: message,
      mentions: mentions.map(m => m.label),
      command,
    });
    this.updateWebview();

    try {
      let response: string;

      if (command) {
        // Execute slash command
        const context = await this.buildCommandContext(mentions);
        response = await this.slashHandler.execute(command, cleanedMessage, context);
      } else {
        // Regular chat with mentions context
        response = await this.handleRegularChat(cleanedMessage, mentions);
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      this._messages.push(assistantMessage);
      this.historyManager?.addMessage({
        role: 'assistant',
        content: response,
      });
      this.updateWebview();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorResponse: ChatMessage = {
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      this._messages.push(errorResponse);
      this.updateWebview();
    }
  }

  /**
   * Handle regular chat (non-command) with streaming
   */
  private async handleRegularChat(message: string, mentions: ResolvedMentions['mentions']): Promise<string> {
    // Build context from mentions
    let contextPrefix = '';
    if (mentions.length > 0) {
      contextPrefix = 'Context:\n' + mentions.map(m => m.content).join('\n\n') + '\n\n---\n\n';
    }

    // Build system prompt
    const systemPrompt = {
      role: 'system' as const,
      content: `You are Code Buddy, an AI coding assistant in VS Code. You help developers with:
- Code explanation and understanding
- Bug fixing and debugging
- Refactoring and optimization
- Test generation
- Best practices and patterns

Be concise but thorough. Use code blocks with language specifiers.
When showing code changes, use clear markdown formatting.
If the user provides context via @mentions, use that context in your response.`,
    };

    // Get conversation history (last 10 messages for context)
    const historyMessages = this._messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const userMessage = contextPrefix + message;

    let response = '';

    // Stream the response
    for await (const chunk of this._aiClient.chatStream([
      systemPrompt,
      ...historyMessages.slice(0, -1), // Exclude the message we just added
      { role: 'user', content: userMessage },
    ])) {
      response += chunk;
      this.updateWebviewWithPartial(response);
    }

    return response;
  }

  /**
   * Build command context from editor and mentions
   */
  private async buildCommandContext(mentions: ResolvedMentions['mentions']): Promise<CommandContext> {
    const editor = vscode.window.activeTextEditor;

    return {
      editor,
      selection: editor && !editor.selection.isEmpty
        ? editor.document.getText(editor.selection)
        : undefined,
      document: editor?.document,
      workspaceFiles: await this.getWorkspaceFiles(),
      terminalOutput: mentions.find(m => m.type === 'terminal')?.content,
    };
  }

  /**
   * Get workspace file list
   */
  private async getWorkspaceFiles(): Promise<string[]> {
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,js,py,go,rs,java,tsx,jsx}',
      '**/node_modules/**',
      50
    );
    return files.map(f => vscode.workspace.asRelativePath(f));
  }

  /**
   * Insert code into the active editor
   */
  private async insertCodeToEditor(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, code);
      });
    }
  }

  /**
   * Apply code to editor (replace selection or insert)
   */
  private async applyCodeToEditor(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selection = editor.selection;
      await editor.edit(editBuilder => {
        if (selection.isEmpty) {
          editBuilder.insert(selection.active, code);
        } else {
          editBuilder.replace(selection, code);
        }
      });
      vscode.window.showInformationMessage('Code applied');
    }
  }

  /**
   * Update webview with current messages
   */
  private updateWebview(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'updateMessages',
        messages: this._messages,
      });
    }
  }

  /**
   * Update webview with partial response (streaming)
   */
  private updateWebviewWithPartial(content: string): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'partialResponse',
        content,
      });
    }
  }

  /**
   * Send available sessions to webview
   */
  private sendSessions(): void {
    if (this._view && this.historyManager) {
      const sessions = this.historyManager.getSessions().map(s => ({
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
      }));
      this._view.webview.postMessage({
        type: 'sessions',
        sessions,
        currentId: this.historyManager.getCurrentSession().id,
      });
    }
  }

  /**
   * Send available commands to webview
   */
  private sendCommands(): void {
    if (this._view) {
      const commands = this.slashHandler.getCommands().map(c => ({
        name: c.name,
        description: c.description,
        icon: c.icon,
      }));
      this._view.webview.postMessage({
        type: 'commands',
        commands,
      });
    }
  }

  /**
   * Send mention suggestions to webview
   */
  private sendMentions(): void {
    if (this._view) {
      const mentions = this.mentionsHandler.getMentionSuggestions();
      this._view.webview.postMessage({
        type: 'mentions',
        mentions,
      });
    }
  }

  /**
   * Get HTML for webview
   */
  private _getHtmlForWebview(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Buddy Chat</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.1/marked.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      padding: 10px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-sideBar-background);
    }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .header h3 { font-size: 13px; font-weight: 600; }
    .header-actions { display: flex; gap: 4px; }
    .icon-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      opacity: 0.7;
    }
    .icon-btn:hover { background: var(--vscode-toolbar-hoverBackground); opacity: 1; }
    .chat-container { flex: 1; overflow-y: auto; padding: 12px; }
    .message {
      margin-bottom: 16px;
      padding: 10px 14px;
      border-radius: 8px;
      max-width: 95%;
      line-height: 1.5;
    }
    .message.user {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      margin-left: auto;
      border-bottom-right-radius: 4px;
    }
    .message.assistant {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-bottom-left-radius: 4px;
    }
    .message-meta {
      font-size: 10px;
      opacity: 0.6;
      margin-bottom: 6px;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .mention-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 9px;
    }
    .command-badge {
      background: var(--vscode-statusBarItem-warningBackground);
      color: var(--vscode-statusBarItem-warningForeground);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 9px;
    }
    .message pre {
      margin: 12px 0;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }
    .message pre code {
      display: block;
      padding: 12px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      line-height: 1.4;
    }
    .code-actions {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .message pre:hover .code-actions { opacity: 1; }
    .code-actions button {
      padding: 3px 8px;
      font-size: 10px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .code-actions button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .message code:not(pre code) {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family);
    }
    .message p { margin-bottom: 8px; }
    .message p:last-child { margin-bottom: 0; }
    .message ul, .message ol { margin: 8px 0; padding-left: 20px; }
    .message li { margin-bottom: 4px; }
    .message h1, .message h2, .message h3 { margin: 16px 0 8px 0; font-weight: 600; }
    .message h1 { font-size: 1.3em; }
    .message h2 { font-size: 1.15em; }
    .message h3 { font-size: 1.05em; }
    .input-container {
      padding: 12px;
      border-top: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
    }
    .input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    #messageInput {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 6px;
      font-size: var(--vscode-font-size);
      font-family: var(--vscode-font-family);
      resize: none;
      min-height: 40px;
      max-height: 150px;
    }
    #messageInput:focus { outline: 1px solid var(--vscode-focusBorder); }
    .send-btn {
      padding: 10px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }
    .send-btn:hover { background: var(--vscode-button-hoverBackground); }
    .quick-actions {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .quick-action {
      padding: 4px 10px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 14px;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.2s;
    }
    .quick-action:hover {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }
    .autocomplete {
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 6px;
      margin-bottom: 4px;
      max-height: 200px;
      overflow-y: auto;
      display: none;
    }
    .autocomplete.visible { display: block; }
    .autocomplete-item {
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .autocomplete-item:hover { background: var(--vscode-list-hoverBackground); }
    .autocomplete-item.selected { background: var(--vscode-list-activeSelectionBackground); }
    .autocomplete-label { font-weight: 500; }
    .autocomplete-desc { font-size: 11px; opacity: 0.7; }
    .typing { display: inline-block; animation: blink 1s infinite; }
    @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
    .welcome {
      text-align: center;
      padding: 30px;
      opacity: 0.8;
    }
    .welcome h2 { margin-bottom: 12px; }
    .welcome p { margin-bottom: 16px; }
    .help-text {
      font-size: 11px;
      opacity: 0.6;
      margin-top: 8px;
    }
    .sessions-dropdown {
      position: relative;
    }
    .sessions-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 6px;
      margin-top: 4px;
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
      display: none;
      z-index: 100;
    }
    .sessions-menu.visible { display: block; }
    .session-item {
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .session-item:hover { background: var(--vscode-list-hoverBackground); }
    .session-item.active { background: var(--vscode-list-activeSelectionBackground); }
    .session-item:last-child { border-bottom: none; }
    .session-title { font-weight: 500; font-size: 12px; }
    .session-meta { font-size: 10px; opacity: 0.6; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h3>Code Buddy</h3>
    </div>
    <div class="header-actions">
      <button class="icon-btn" onclick="newSession()" title="New Chat">+</button>
      <button class="icon-btn" onclick="toggleSessions()" title="History">H</button>
      <button class="icon-btn" onclick="clearHistory()" title="Clear">C</button>
      <div class="sessions-dropdown">
        <div class="sessions-menu" id="sessionsMenu"></div>
      </div>
    </div>
  </div>

  <div class="chat-container" id="chatContainer">
    <div class="welcome">
      <h2>Code Buddy</h2>
      <p>Your AI coding assistant</p>
      <div class="quick-actions">
        <span class="quick-action" onclick="insertCommand('/explain')">Explain</span>
        <span class="quick-action" onclick="insertCommand('/fix')">Fix</span>
        <span class="quick-action" onclick="insertCommand('/tests')">Tests</span>
        <span class="quick-action" onclick="insertCommand('/review')">Review</span>
        <span class="quick-action" onclick="insertCommand('/doc')">Document</span>
      </div>
      <p class="help-text">Type /help for all commands, or use @file, @selection, @workspace for context</p>
    </div>
  </div>

  <div class="input-container">
    <div class="quick-actions" id="quickActions">
      <span class="quick-action" onclick="insertMention('@selection')">@selection</span>
      <span class="quick-action" onclick="insertMention('@file:')">@file</span>
      <span class="quick-action" onclick="insertMention('@workspace')">@workspace</span>
      <span class="quick-action" onclick="insertMention('@git')">@git</span>
    </div>
    <div class="input-wrapper" style="position: relative;">
      <div class="autocomplete" id="autocomplete"></div>
      <textarea
        id="messageInput"
        placeholder="Ask Code Buddy... (/ for commands, @ for context)"
        rows="1"
        onkeydown="handleKeyDown(event)"
        oninput="handleInput(event)"
      ></textarea>
      <button class="send-btn" onclick="sendMessage()">Send</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const autocomplete = document.getElementById('autocomplete');
    const sessionsMenu = document.getElementById('sessionsMenu');
    let isStreaming = false;
    let commands = [];
    let mentions = [];
    let autocompleteItems = [];
    let selectedAutocompleteIndex = -1;

    // Configure marked
    marked.setOptions({
      highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true
    });

    // Request commands and mentions
    vscode.postMessage({ type: 'getCommands' });
    vscode.postMessage({ type: 'getMentions' });

    function sendMessage() {
      const message = messageInput.value.trim();
      if (!message || isStreaming) return;
      vscode.postMessage({ type: 'sendMessage', message });
      messageInput.value = '';
      messageInput.style.height = 'auto';
      hideAutocomplete();
    }

    function clearHistory() {
      vscode.postMessage({ type: 'clearHistory' });
    }

    function newSession() {
      vscode.postMessage({ type: 'newSession' });
    }

    function toggleSessions() {
      vscode.postMessage({ type: 'getSessions' });
      sessionsMenu.classList.toggle('visible');
    }

    function loadSession(id) {
      vscode.postMessage({ type: 'loadSession', sessionId: id });
      sessionsMenu.classList.remove('visible');
    }

    function insertCommand(cmd) {
      messageInput.value = cmd + ' ';
      messageInput.focus();
      handleInput({ target: messageInput });
    }

    function insertMention(mention) {
      const value = messageInput.value;
      const pos = messageInput.selectionStart;
      messageInput.value = value.slice(0, pos) + mention + value.slice(pos);
      messageInput.focus();
      messageInput.selectionStart = messageInput.selectionEnd = pos + mention.length;
    }

    function handleKeyDown(event) {
      if (autocomplete.classList.contains('visible')) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          selectAutocompleteItem(selectedAutocompleteIndex + 1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          selectAutocompleteItem(selectedAutocompleteIndex - 1);
        } else if (event.key === 'Enter' && selectedAutocompleteIndex >= 0) {
          event.preventDefault();
          applyAutocomplete(autocompleteItems[selectedAutocompleteIndex]);
        } else if (event.key === 'Escape') {
          hideAutocomplete();
        }
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    }

    function handleInput(event) {
      const value = event.target.value;
      const cursorPos = event.target.selectionStart;

      // Auto-resize
      event.target.style.height = 'auto';
      event.target.style.height = Math.min(event.target.scrollHeight, 150) + 'px';

      // Check for autocomplete triggers
      const textBeforeCursor = value.slice(0, cursorPos);

      // Slash commands
      if (textBeforeCursor.match(/^\\/[a-z]*$/)) {
        const prefix = textBeforeCursor.slice(1).toLowerCase();
        const filtered = commands.filter(c => c.name.startsWith(prefix));
        showAutocomplete(filtered.map(c => ({
          label: '/' + c.name,
          description: c.description,
          value: '/' + c.name + ' '
        })));
      }
      // @ mentions
      else if (textBeforeCursor.match(/@[a-z:]*$/)) {
        const prefix = textBeforeCursor.match(/@([a-z:]*)$/)[1].toLowerCase();
        const filtered = mentions.filter(m => m.label.slice(1).startsWith(prefix));
        showAutocomplete(filtered.map(m => ({
          label: m.label,
          description: m.description,
          value: m.insertText
        })));
      } else {
        hideAutocomplete();
      }
    }

    function showAutocomplete(items) {
      if (items.length === 0) {
        hideAutocomplete();
        return;
      }

      autocompleteItems = items;
      selectedAutocompleteIndex = 0;

      autocomplete.innerHTML = items.map((item, i) => \`
        <div class="autocomplete-item \${i === 0 ? 'selected' : ''}"
             onclick="applyAutocomplete(autocompleteItems[\${i}])">
          <span class="autocomplete-label">\${item.label}</span>
          <span class="autocomplete-desc">\${item.description}</span>
        </div>
      \`).join('');

      autocomplete.classList.add('visible');
    }

    function hideAutocomplete() {
      autocomplete.classList.remove('visible');
      autocompleteItems = [];
      selectedAutocompleteIndex = -1;
    }

    function selectAutocompleteItem(index) {
      if (index < 0) index = autocompleteItems.length - 1;
      if (index >= autocompleteItems.length) index = 0;
      selectedAutocompleteIndex = index;

      const items = autocomplete.querySelectorAll('.autocomplete-item');
      items.forEach((item, i) => {
        item.classList.toggle('selected', i === index);
      });
    }

    function applyAutocomplete(item) {
      const value = messageInput.value;
      const cursorPos = messageInput.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);

      // Find the trigger start
      let triggerStart = cursorPos;
      if (item.label.startsWith('/')) {
        triggerStart = textBeforeCursor.lastIndexOf('/');
      } else if (item.label.startsWith('@')) {
        triggerStart = textBeforeCursor.lastIndexOf('@');
      }

      messageInput.value = value.slice(0, triggerStart) + item.value + value.slice(cursorPos);
      messageInput.selectionStart = messageInput.selectionEnd = triggerStart + item.value.length;
      messageInput.focus();
      hideAutocomplete();
    }

    function copyCode(button) {
      const pre = button.closest('pre');
      const code = pre.querySelector('code').textContent;
      vscode.postMessage({ type: 'copyCode', code });
    }

    function insertCode(button) {
      const pre = button.closest('pre');
      const code = pre.querySelector('code').textContent;
      vscode.postMessage({ type: 'insertCode', code });
    }

    function applyCode(button) {
      const pre = button.closest('pre');
      const code = pre.querySelector('code').textContent;
      vscode.postMessage({ type: 'applyCode', code });
    }

    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.type) {
        case 'updateMessages':
          renderMessages(message.messages);
          isStreaming = false;
          break;
        case 'partialResponse':
          updatePartialResponse(message.content);
          isStreaming = true;
          break;
        case 'commands':
          commands = message.commands;
          break;
        case 'mentions':
          mentions = message.mentions;
          break;
        case 'sessions':
          renderSessions(message.sessions, message.currentId);
          break;
      }
    });

    function renderSessions(sessions, currentId) {
      if (sessions.length === 0) {
        sessionsMenu.innerHTML = '<div class="session-item">No chat history</div>';
        return;
      }

      sessionsMenu.innerHTML = sessions.slice(0, 20).map(s => \`
        <div class="session-item \${s.id === currentId ? 'active' : ''}"
             onclick="loadSession('\${s.id}')">
          <div class="session-title">\${escapeHtml(s.title)}</div>
          <div class="session-meta">\${s.messageCount} messages - \${new Date(s.updatedAt).toLocaleDateString()}</div>
        </div>
      \`).join('');
    }

    function renderMessages(messages) {
      if (messages.length === 0) {
        chatContainer.innerHTML = \`
          <div class="welcome">
            <h2>Code Buddy</h2>
            <p>Your AI coding assistant</p>
            <div class="quick-actions">
              <span class="quick-action" onclick="insertCommand('/explain')">Explain</span>
              <span class="quick-action" onclick="insertCommand('/fix')">Fix</span>
              <span class="quick-action" onclick="insertCommand('/tests')">Tests</span>
              <span class="quick-action" onclick="insertCommand('/review')">Review</span>
              <span class="quick-action" onclick="insertCommand('/doc')">Document</span>
            </div>
            <p class="help-text">Type /help for all commands, or use @file, @selection, @workspace for context</p>
          </div>
        \`;
        return;
      }

      chatContainer.innerHTML = messages.map(msg => {
        const meta = [];
        if (msg.command) meta.push(\`<span class="command-badge">/\${msg.command}</span>\`);
        if (msg.mentions) msg.mentions.forEach(m => meta.push(\`<span class="mention-badge">\${m}</span>\`));

        return \`
          <div class="message \${msg.role}">
            \${meta.length > 0 ? \`<div class="message-meta">\${meta.join('')}</div>\` : ''}
            <div>\${formatContent(msg.content, msg.role)}</div>
          </div>
        \`;
      }).join('');
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function updatePartialResponse(content) {
      let streamingMsg = document.querySelector('.message.streaming');
      if (!streamingMsg) {
        streamingMsg = document.createElement('div');
        streamingMsg.className = 'message assistant streaming';
        chatContainer.appendChild(streamingMsg);
      }
      streamingMsg.innerHTML = formatContent(content, 'assistant') + '<span class="typing">|</span>';
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function formatContent(content, role) {
      if (role === 'user') {
        return escapeHtml(content).replace(/\\n/g, '<br>');
      }

      let html = marked.parse(content);

      // Add code actions
      html = html.replace(/<pre><code([^>]*)>/g,
        '<pre><div class="code-actions">' +
        '<button onclick="copyCode(this)">Copy</button>' +
        '<button onclick="insertCode(this)">Insert</button>' +
        '<button onclick="applyCode(this)">Apply</button>' +
        '</div><code$1>');

      return html;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
  }
}
