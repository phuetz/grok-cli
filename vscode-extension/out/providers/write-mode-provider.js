"use strict";
/**
 * Write Mode Provider
 * Windsurf-inspired focused code generation view
 * Provides a distraction-free interface for generating new code
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
exports.WriteModeProvider = void 0;
const vscode = __importStar(require("vscode"));
const smart_context_1 = require("../smart-context");
class WriteModeProvider {
    constructor(extensionUri, aiClient, diffManager) {
        this.extensionUri = extensionUri;
        this.aiClient = aiClient;
        this.diffManager = diffManager;
        this.disposables = [];
        this.isGenerating = false;
        this.currentGeneration = null;
        this.smartContext = new smart_context_1.SmartContextManager();
    }
    resolveWebviewView(webviewView, _context, _token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };
        webviewView.webview.html = this.getWebviewContent();
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'generate':
                    await this.generateCode(message.prompt, message.options);
                    break;
                case 'apply':
                    await this.applyGeneratedCode(message.targetPath);
                    break;
                case 'copy':
                    await vscode.env.clipboard.writeText(message.code);
                    vscode.window.showInformationMessage('Code copied to clipboard');
                    break;
                case 'insertAtCursor':
                    await this.insertAtCursor(message.code);
                    break;
                case 'createFile':
                    await this.createNewFile(message.code, message.language);
                    break;
                case 'cancel':
                    this.isGenerating = false;
                    break;
            }
        }, null, this.disposables);
    }
    /**
     * Generate code based on prompt
     */
    async generateCode(prompt, options) {
        if (this.isGenerating)
            return;
        this.isGenerating = true;
        try {
            // Get context from current file
            const editor = vscode.window.activeTextEditor;
            const currentFile = editor?.document.uri.fsPath;
            const language = options.language || editor?.document.languageId || 'typescript';
            // Get smart context
            const context = await this.smartContext.getSmartContext({
                currentFile,
                query: prompt,
                maxFiles: 5,
            });
            // Build system prompt based on options
            let systemPrompt = `You are an expert ${language} developer. Generate clean, production-ready code based on the user's request.

Requirements:
- Write complete, working code (not pseudocode)
- Follow best practices and modern patterns
- Include proper error handling
- Use descriptive variable and function names`;
            if (options.framework) {
                systemPrompt += `\n- Use ${options.framework} framework conventions`;
            }
            if (options.style) {
                systemPrompt += `\n- Follow ${options.style} coding style`;
            }
            if (options.includeTests) {
                systemPrompt += `\n- Include unit tests for the generated code`;
            }
            if (options.includeTypes) {
                systemPrompt += `\n- Include full TypeScript type definitions`;
            }
            // Add context summary
            if (context.files.length > 0) {
                systemPrompt += `\n\nProject context:\n${context.summary}`;
            }
            // Build user prompt
            let userPrompt = prompt;
            if (context.files.length > 0) {
                userPrompt += `\n\nRelevant code from the project:\n`;
                for (const file of context.files.slice(0, 3)) {
                    userPrompt += `\n### ${file.relativePath}\n\`\`\`${file.language}\n${file.content.slice(0, 2000)}\n\`\`\`\n`;
                }
            }
            // Stream the response
            this.view?.webview.postMessage({ command: 'generationStart' });
            const response = await this.aiClient.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ], {
                stream: true,
                onChunk: (chunk) => {
                    if (this.isGenerating) {
                        this.view?.webview.postMessage({
                            command: 'generationChunk',
                            chunk,
                        });
                    }
                },
            });
            // Extract code blocks
            const codeBlocks = this.extractCodeBlocks(response);
            this.currentGeneration = {
                content: response,
                language,
            };
            this.view?.webview.postMessage({
                command: 'generationComplete',
                result: response,
                codeBlocks,
                language,
            });
        }
        catch (error) {
            this.view?.webview.postMessage({
                command: 'generationError',
                error: error instanceof Error ? error.message : 'Generation failed',
            });
        }
        finally {
            this.isGenerating = false;
        }
    }
    /**
     * Extract code blocks from response
     */
    extractCodeBlocks(response) {
        const blocks = [];
        const regex = /```(\w*)\n([\s\S]*?)```/g;
        let match;
        while ((match = regex.exec(response)) !== null) {
            blocks.push({
                language: match[1] || 'text',
                code: match[2].trim(),
            });
        }
        return blocks;
    }
    /**
     * Insert code at cursor position
     */
    async insertAtCursor(code) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, code);
        });
    }
    /**
     * Create new file with generated code
     */
    async createNewFile(code, language) {
        const extensions = {
            typescript: '.ts',
            javascript: '.js',
            python: '.py',
            go: '.go',
            rust: '.rs',
            java: '.java',
            typescriptreact: '.tsx',
            javascriptreact: '.jsx',
        };
        const ext = extensions[language] || '.txt';
        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter file name',
            value: `new-file${ext}`,
        });
        if (!fileName)
            return;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
        }
        const filePath = vscode.Uri.joinPath(workspaceFolders[0].uri, fileName);
        await vscode.workspace.fs.writeFile(filePath, Buffer.from(code, 'utf-8'));
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
    }
    /**
     * Apply generated code to a target file
     */
    async applyGeneratedCode(_targetPath) {
        if (!this.currentGeneration)
            return;
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        const codeBlocks = this.extractCodeBlocks(this.currentGeneration.content);
        if (codeBlocks.length === 0) {
            vscode.window.showWarningMessage('No code blocks found in generation');
            return;
        }
        // If multiple code blocks, let user choose
        if (codeBlocks.length > 1) {
            const items = codeBlocks.map((block, i) => ({
                label: `Block ${i + 1} (${block.language})`,
                description: block.code.split('\n')[0].slice(0, 50),
                code: block.code,
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select code block to apply',
            });
            if (selected) {
                await this.diffManager.showDiff(editor.document, editor.selection, selected.code);
            }
        }
        else {
            await this.diffManager.showDiff(editor.document, editor.selection, codeBlocks[0].code);
        }
    }
    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Write Mode</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 12px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .header h2 {
      font-size: 14px;
      font-weight: 500;
    }

    .input-section {
      margin-bottom: 12px;
    }

    .prompt-input {
      width: 100%;
      min-height: 100px;
      padding: 10px;
      font-family: inherit;
      font-size: 13px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      resize: vertical;
    }

    .prompt-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin: 12px 0;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .option label {
      font-size: 12px;
    }

    .option select, .option input {
      flex: 1;
      padding: 4px 8px;
      font-size: 12px;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 3px;
    }

    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .btn {
      padding: 8px 16px;
      font-size: 13px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .output-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .output-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .output-actions {
      display: flex;
      gap: 6px;
    }

    .output-actions .btn {
      padding: 4px 8px;
      font-size: 11px;
    }

    .output {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .output code {
      display: block;
      padding: 8px;
      margin: 8px 0;
      background: var(--vscode-editor-background);
      border-radius: 4px;
      overflow-x: auto;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      padding: 8px;
      background: var(--vscode-inputValidation-infoBackground);
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .status.error {
      background: var(--vscode-inputValidation-errorBackground);
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--vscode-foreground);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .hidden {
      display: none !important;
    }

    .templates {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .template {
      padding: 4px 8px;
      font-size: 11px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 12px;
      cursor: pointer;
      border: none;
    }

    .template:hover {
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="header">
    <span>$(edit)</span>
    <h2>Write Mode</h2>
  </div>

  <div class="input-section">
    <div class="templates">
      <button class="template" data-prompt="Create a React component that">Component</button>
      <button class="template" data-prompt="Write a function that">Function</button>
      <button class="template" data-prompt="Create an API endpoint that">API</button>
      <button class="template" data-prompt="Write a class that">Class</button>
      <button class="template" data-prompt="Create a test suite for">Tests</button>
      <button class="template" data-prompt="Write a hook that">Hook</button>
    </div>

    <textarea
      class="prompt-input"
      id="prompt"
      placeholder="Describe what code you want to generate...

Examples:
• Create a React hook for managing form state with validation
• Write a function that parses CSV files and returns JSON
• Create an Express middleware for rate limiting"></textarea>
  </div>

  <div class="options">
    <div class="option">
      <label>Language:</label>
      <select id="language">
        <option value="typescript">TypeScript</option>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="go">Go</option>
        <option value="rust">Rust</option>
        <option value="java">Java</option>
      </select>
    </div>
    <div class="option">
      <label>Framework:</label>
      <input type="text" id="framework" placeholder="React, Express, etc.">
    </div>
  </div>

  <div style="display: flex; gap: 16px; margin-bottom: 12px;">
    <label class="checkbox-option">
      <input type="checkbox" id="includeTests">
      Include Tests
    </label>
    <label class="checkbox-option">
      <input type="checkbox" id="includeTypes" checked>
      Include Types
    </label>
  </div>

  <div class="actions">
    <button class="btn btn-primary" id="generateBtn">
      <span>$(sparkle)</span>
      Generate Code
    </button>
    <button class="btn btn-secondary hidden" id="cancelBtn">
      Cancel
    </button>
  </div>

  <div class="status hidden" id="status">
    <div class="spinner"></div>
    <span id="statusText">Generating...</span>
  </div>

  <div class="output-section">
    <div class="output-header">
      <span style="font-size: 12px; font-weight: 500;">Output</span>
      <div class="output-actions hidden" id="outputActions">
        <button class="btn btn-secondary" id="copyBtn">Copy</button>
        <button class="btn btn-secondary" id="insertBtn">Insert at Cursor</button>
        <button class="btn btn-primary" id="applyBtn">Apply to File</button>
        <button class="btn btn-secondary" id="newFileBtn">New File</button>
      </div>
    </div>
    <div class="output" id="output">
      <span style="color: var(--vscode-descriptionForeground);">Generated code will appear here...</span>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const promptInput = document.getElementById('prompt');
    const languageSelect = document.getElementById('language');
    const frameworkInput = document.getElementById('framework');
    const includeTests = document.getElementById('includeTests');
    const includeTypes = document.getElementById('includeTypes');
    const generateBtn = document.getElementById('generateBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const status = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const output = document.getElementById('output');
    const outputActions = document.getElementById('outputActions');
    const copyBtn = document.getElementById('copyBtn');
    const insertBtn = document.getElementById('insertBtn');
    const applyBtn = document.getElementById('applyBtn');
    const newFileBtn = document.getElementById('newFileBtn');

    let generatedCode = '';
    let currentLanguage = 'typescript';

    // Template buttons
    document.querySelectorAll('.template').forEach(btn => {
      btn.addEventListener('click', () => {
        promptInput.value = btn.dataset.prompt + ' ';
        promptInput.focus();
      });
    });

    generateBtn.addEventListener('click', () => {
      const prompt = promptInput.value.trim();
      if (!prompt) return;

      vscode.postMessage({
        command: 'generate',
        prompt,
        options: {
          language: languageSelect.value,
          framework: frameworkInput.value,
          includeTests: includeTests.checked,
          includeTypes: includeTypes.checked,
        },
      });
    });

    cancelBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'cancel' });
    });

    copyBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'copy', code: generatedCode });
    });

    insertBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'insertAtCursor', code: generatedCode });
    });

    applyBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'apply' });
    });

    newFileBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'createFile', code: generatedCode, language: currentLanguage });
    });

    // Handle Ctrl+Enter to generate
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        generateBtn.click();
      }
    });

    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.command) {
        case 'generationStart':
          status.classList.remove('hidden', 'error');
          cancelBtn.classList.remove('hidden');
          generateBtn.disabled = true;
          output.textContent = '';
          outputActions.classList.add('hidden');
          generatedCode = '';
          break;

        case 'generationChunk':
          output.textContent += message.chunk;
          generatedCode += message.chunk;
          output.scrollTop = output.scrollHeight;
          break;

        case 'generationComplete':
          status.classList.add('hidden');
          cancelBtn.classList.add('hidden');
          generateBtn.disabled = false;
          outputActions.classList.remove('hidden');
          generatedCode = message.result;
          currentLanguage = message.language;

          // Format output with syntax highlighting hint
          output.innerHTML = formatCode(message.result);
          break;

        case 'generationError':
          status.classList.remove('hidden');
          status.classList.add('error');
          statusText.textContent = message.error;
          cancelBtn.classList.add('hidden');
          generateBtn.disabled = false;
          break;
      }
    });

    function formatCode(text) {
      // Simple code block formatting
      return text.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, '<code>$2</code>');
    }
  </script>
</body>
</html>`;
    }
    dispose() {
        this.smartContext.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.WriteModeProvider = WriteModeProvider;
WriteModeProvider.viewType = 'codebuddy.writeMode';
//# sourceMappingURL=write-mode-provider.js.map