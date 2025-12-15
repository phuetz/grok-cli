/**
 * Composer View Provider
 * Multi-file editing panel (like Cursor Composer)
 */

import * as vscode from 'vscode';
import { AIClient } from '../ai-client';
import { DiffManager } from '../diff-manager';

interface FileChange {
  path: string;
  originalContent: string;
  newContent: string;
  status: 'pending' | 'applied' | 'rejected';
}

export class ComposerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codebuddy.composerView';

  private _view?: vscode.WebviewView;
  private contextFiles: string[] = [];
  private pendingChanges: FileChange[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly aiClient: AIClient,
    private readonly diffManager: DiffManager
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'compose':
          await this.handleCompose(data.instruction);
          break;
        case 'addFile':
          await this.addFileToContext();
          break;
        case 'removeFile':
          this.removeFileFromContext(data.path);
          break;
        case 'applyChange':
          await this.applyChange(data.index);
          break;
        case 'rejectChange':
          this.rejectChange(data.index);
          break;
        case 'applyAll':
          await this.applyAllChanges();
          break;
        case 'rejectAll':
          this.rejectAllChanges();
          break;
      }
    });
  }

  /**
   * Handle compose request for multi-file editing
   */
  private async handleCompose(instruction: string): Promise<void> {
    if (this.contextFiles.length === 0) {
      vscode.window.showWarningMessage('Add some files to context first');
      return;
    }

    // Read all context files
    const fileContents: { path: string; content: string; language: string }[] = [];
    for (const filePath of this.contextFiles) {
      try {
        const uri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(uri);
        const doc = await vscode.workspace.openTextDocument(uri);
        fileContents.push({
          path: filePath,
          content: new TextDecoder().decode(content),
          language: doc.languageId,
        });
      } catch {
        // Skip files that can't be read
      }
    }

    this.updateWebview({ status: 'thinking' });

    try {
      const response = await this.aiClient.chat([
        {
          role: 'system',
          content: `You are Code Buddy in Composer mode. You edit multiple files at once.

For each file that needs changes, respond with:
---FILE: path/to/file---
\`\`\`language
// Full new content of the file
\`\`\`
---END FILE---

Only include files that need changes. Provide the COMPLETE new content for each file.`,
        },
        {
          role: 'user',
          content: `Instruction: ${instruction}

Files to work with:
${fileContents.map(f => `
---FILE: ${f.path}---
\`\`\`${f.language}
${f.content}
\`\`\`
---END FILE---
`).join('\n')}

Make the requested changes:`,
        },
      ]);

      // Parse the response to extract file changes
      this.pendingChanges = this.parseFileChanges(response, fileContents);
      this.updateWebview({ status: 'ready', changes: this.pendingChanges });

      if (this.pendingChanges.length === 0) {
        vscode.window.showInformationMessage('No changes needed');
      } else {
        vscode.window.showInformationMessage(
          `${this.pendingChanges.length} file(s) will be modified. Review changes in Composer.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Composer error: ${message}`);
      this.updateWebview({ status: 'error', error: message });
    }
  }

  /**
   * Parse AI response to extract file changes
   */
  private parseFileChanges(
    response: string,
    originalFiles: { path: string; content: string }[]
  ): FileChange[] {
    const changes: FileChange[] = [];
    const fileRegex = /---FILE:\s*(.+?)---\s*```[\w]*\n([\s\S]*?)```\s*---END FILE---/g;

    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const path = match[1].trim();
      const newContent = match[2].trim();

      const original = originalFiles.find(f => f.path.includes(path) || path.includes(f.path));
      if (original) {
        changes.push({
          path: original.path,
          originalContent: original.content,
          newContent,
          status: 'pending',
        });
      }
    }

    return changes;
  }

  /**
   * Add current file to context
   */
  private async addFileToContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const filePath = editor.document.uri.fsPath;
      if (!this.contextFiles.includes(filePath)) {
        this.contextFiles.push(filePath);
        this.updateWebview({ contextFiles: this.contextFiles });
      }
    } else {
      // Let user pick a file
      const files = await vscode.window.showOpenDialog({
        canSelectMany: true,
        openLabel: 'Add to Context',
      });

      if (files) {
        for (const file of files) {
          if (!this.contextFiles.includes(file.fsPath)) {
            this.contextFiles.push(file.fsPath);
          }
        }
        this.updateWebview({ contextFiles: this.contextFiles });
      }
    }
  }

  /**
   * Remove file from context
   */
  private removeFileFromContext(path: string): void {
    this.contextFiles = this.contextFiles.filter(f => f !== path);
    this.updateWebview({ contextFiles: this.contextFiles });
  }

  /**
   * Apply a single change
   */
  private async applyChange(index: number): Promise<void> {
    const change = this.pendingChanges[index];
    if (!change || change.status !== 'pending') return;

    try {
      const uri = vscode.Uri.file(change.path);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(change.newContent));
      change.status = 'applied';
      this.updateWebview({ changes: this.pendingChanges });
      vscode.window.showInformationMessage(`Applied changes to ${vscode.workspace.asRelativePath(change.path)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to apply changes: ${message}`);
    }
  }

  /**
   * Reject a single change
   */
  private rejectChange(index: number): void {
    const change = this.pendingChanges[index];
    if (change) {
      change.status = 'rejected';
      this.updateWebview({ changes: this.pendingChanges });
    }
  }

  /**
   * Apply all pending changes
   */
  private async applyAllChanges(): Promise<void> {
    for (let i = 0; i < this.pendingChanges.length; i++) {
      if (this.pendingChanges[i].status === 'pending') {
        await this.applyChange(i);
      }
    }
  }

  /**
   * Reject all pending changes
   */
  private rejectAllChanges(): void {
    this.pendingChanges.forEach(c => {
      if (c.status === 'pending') c.status = 'rejected';
    });
    this.updateWebview({ changes: this.pendingChanges });
  }

  private updateWebview(data: Record<string, unknown>): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'update',
        contextFiles: this.contextFiles,
        changes: this.pendingChanges,
        ...data,
      });
    }
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Composer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
    }
    .section { margin-bottom: 16px; }
    .section-header {
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .file-list { display: flex; flex-direction: column; gap: 4px; }
    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
      font-size: 12px;
    }
    .file-item .remove {
      cursor: pointer;
      opacity: 0.6;
    }
    .file-item .remove:hover { opacity: 1; }
    button {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.small { padding: 2px 8px; }
    textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      resize: vertical;
      min-height: 80px;
      margin-bottom: 8px;
    }
    .change-item {
      padding: 8px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .change-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .change-path { font-weight: 600; font-size: 12px; }
    .change-actions { display: flex; gap: 4px; }
    .status { font-size: 10px; padding: 2px 6px; border-radius: 10px; }
    .status.pending { background: rgba(255, 165, 0, 0.2); color: orange; }
    .status.applied { background: rgba(0, 255, 0, 0.2); color: #00ff00; }
    .status.rejected { background: rgba(255, 0, 0, 0.2); color: #ff6666; }
    .empty { text-align: center; padding: 20px; opacity: 0.7; }
    .loading { text-align: center; padding: 20px; }
    .bulk-actions { margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end; }
  </style>
</head>
<body>
  <div class="section">
    <div class="section-header">
      <span>Context Files</span>
      <button class="small" onclick="addFile()">+ Add</button>
    </div>
    <div class="file-list" id="fileList">
      <div class="empty">No files added. Click + Add to include files.</div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">Instruction</div>
    <textarea id="instruction" placeholder="Describe the changes you want to make across files..."></textarea>
    <button onclick="compose()" id="composeBtn">Compose Changes</button>
  </div>

  <div class="section" id="changesSection" style="display: none;">
    <div class="section-header">
      <span>Proposed Changes</span>
    </div>
    <div id="changesList"></div>
    <div class="bulk-actions">
      <button class="secondary" onclick="rejectAll()">Reject All</button>
      <button onclick="applyAll()">Apply All</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function addFile() {
      vscode.postMessage({ type: 'addFile' });
    }

    function removeFile(path) {
      vscode.postMessage({ type: 'removeFile', path });
    }

    function compose() {
      const instruction = document.getElementById('instruction').value;
      if (instruction) {
        vscode.postMessage({ type: 'compose', instruction });
      }
    }

    function applyChange(index) {
      vscode.postMessage({ type: 'applyChange', index });
    }

    function rejectChange(index) {
      vscode.postMessage({ type: 'rejectChange', index });
    }

    function applyAll() {
      vscode.postMessage({ type: 'applyAll' });
    }

    function rejectAll() {
      vscode.postMessage({ type: 'rejectAll' });
    }

    window.addEventListener('message', event => {
      const data = event.data;
      if (data.type === 'update') {
        // Update file list
        const fileList = document.getElementById('fileList');
        if (data.contextFiles && data.contextFiles.length > 0) {
          fileList.innerHTML = data.contextFiles.map(f => {
            const name = f.split('/').pop() || f.split('\\\\').pop();
            return \`<div class="file-item">
              <span>\${name}</span>
              <span class="remove" onclick="removeFile('\${f}')">x</span>
            </div>\`;
          }).join('');
        } else {
          fileList.innerHTML = '<div class="empty">No files added. Click + Add to include files.</div>';
        }

        // Update changes list
        const changesSection = document.getElementById('changesSection');
        const changesList = document.getElementById('changesList');

        if (data.status === 'thinking') {
          changesSection.style.display = 'block';
          changesList.innerHTML = '<div class="loading">Thinking...</div>';
        } else if (data.changes && data.changes.length > 0) {
          changesSection.style.display = 'block';
          changesList.innerHTML = data.changes.map((c, i) => {
            const name = c.path.split('/').pop() || c.path.split('\\\\').pop();
            return \`<div class="change-item">
              <div class="change-header">
                <span class="change-path">\${name}</span>
                <span class="status \${c.status}">\${c.status}</span>
              </div>
              \${c.status === 'pending' ? \`
                <div class="change-actions">
                  <button class="small" onclick="applyChange(\${i})">Apply</button>
                  <button class="small secondary" onclick="rejectChange(\${i})">Reject</button>
                </div>
              \` : ''}
            </div>\`;
          }).join('');
        } else {
          changesSection.style.display = 'none';
        }
      }
    });
  </script>
</body>
</html>`;
  }
}
