/**
 * Cascade View Provider
 * Agentic mode for multi-step autonomous tasks (like Windsurf Cascade)
 */

import * as vscode from 'vscode';
import { AIClient } from '../ai-client';

interface CascadeStep {
  id: string;
  type: 'thinking' | 'action' | 'result' | 'error';
  content: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: Date;
}

export class CascadeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codebuddy.cascadeView';

  private _view?: vscode.WebviewView;
  private steps: CascadeStep[] = [];
  private isRunning = false;
  private abortController: AbortController | null = null;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly aiClient: AIClient
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
        case 'start':
          await this.startCascade(data.task);
          break;
        case 'stop':
          this.stopCascade();
          break;
        case 'clear':
          this.steps = [];
          this.updateWebview();
          break;
      }
    });
  }

  /**
   * Start a cascade task
   */
  async startCascade(task: string): Promise<void> {
    if (this.isRunning) {
      vscode.window.showWarningMessage('Cascade is already running');
      return;
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.steps = [];

    // Add initial step
    this.addStep({
      type: 'thinking',
      content: `Understanding task: "${task}"`,
      status: 'running',
    });

    try {
      const config = vscode.workspace.getConfiguration('codebuddy');
      const maxSteps = config.get<number>('cascadeMaxSteps') || 20;
      const autonomyLevel = config.get<string>('autonomyLevel') || 'confirm';

      // Get workspace context
      const workspaceContext = await this.getWorkspaceContext();

      let currentStep = 0;
      let previousResults: string[] = [];

      while (currentStep < maxSteps && this.isRunning) {
        currentStep++;

        // Generate next action
        const action = await this.aiClient.chat([
          {
            role: 'system',
            content: `You are Code Buddy in Cascade mode - an autonomous AI developer.

Your task: ${task}

Workspace context:
${workspaceContext}

${previousResults.length > 0 ? `Previous results:\n${previousResults.join('\n')}` : ''}

Available actions:
- READ_FILE: Read a file's contents
- WRITE_FILE: Write/create a file
- EDIT_FILE: Edit part of a file
- RUN_COMMAND: Run a terminal command
- SEARCH_FILES: Search for files
- SEARCH_CODE: Search for code patterns
- COMPLETE: Task is complete

Respond with JSON:
{
  "thinking": "your reasoning",
  "action": "ACTION_NAME",
  "params": { ... },
  "explanation": "what you're doing and why"
}

If task is complete, use action "COMPLETE".`,
          },
          {
            role: 'user',
            content: `Step ${currentStep}/${maxSteps}: What's the next action?`,
          },
        ]);

        // Parse action
        let actionData;
        try {
          const jsonMatch = action.match(/\{[\s\S]*\}/);
          actionData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          actionData = null;
        }

        if (!actionData) {
          this.addStep({
            type: 'error',
            content: 'Failed to parse action',
            status: 'failed',
          });
          break;
        }

        // Update thinking step
        this.updateLastStep({
          type: 'thinking',
          content: actionData.thinking || 'Analyzing...',
          status: 'completed',
        });

        // Check if complete
        if (actionData.action === 'COMPLETE') {
          this.addStep({
            type: 'result',
            content: actionData.explanation || 'Task completed!',
            status: 'completed',
          });
          break;
        }

        // Add action step
        this.addStep({
          type: 'action',
          content: `${actionData.action}: ${actionData.explanation}`,
          status: 'running',
        });

        // Execute action (with confirmation if needed)
        const result = await this.executeAction(actionData, autonomyLevel);

        if (result.success) {
          this.updateLastStep({
            type: 'action',
            content: `${actionData.action}: ${actionData.explanation}`,
            status: 'completed',
          });

          this.addStep({
            type: 'result',
            content: result.output || 'Action completed',
            status: 'completed',
          });

          previousResults.push(`Step ${currentStep}: ${result.output}`);
        } else {
          this.updateLastStep({
            type: 'action',
            content: `${actionData.action}: ${actionData.explanation}`,
            status: 'failed',
          });

          this.addStep({
            type: 'error',
            content: result.error || 'Action failed',
            status: 'failed',
          });

          previousResults.push(`Step ${currentStep}: ERROR - ${result.error}`);
        }

        // Add thinking step for next iteration
        if (currentStep < maxSteps && this.isRunning) {
          this.addStep({
            type: 'thinking',
            content: 'Analyzing results...',
            status: 'running',
          });
        }
      }

      if (currentStep >= maxSteps) {
        this.addStep({
          type: 'error',
          content: `Reached maximum steps (${maxSteps})`,
          status: 'failed',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.addStep({
        type: 'error',
        content: `Cascade error: ${message}`,
        status: 'failed',
      });
    } finally {
      this.isRunning = false;
      this.abortController = null;
      this.updateWebview();
    }
  }

  /**
   * Stop the current cascade
   */
  stopCascade(): void {
    this.isRunning = false;
    this.abortController?.abort();
    this.addStep({
      type: 'error',
      content: 'Cascade stopped by user',
      status: 'failed',
    });
  }

  /**
   * Execute a cascade action
   */
  private async executeAction(
    actionData: { action: string; params: Record<string, unknown>; explanation: string },
    autonomyLevel: string
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    const { action, params } = actionData;

    // Confirm destructive actions if not in full autonomy
    if (autonomyLevel !== 'full') {
      const destructiveActions = ['WRITE_FILE', 'EDIT_FILE', 'RUN_COMMAND'];
      if (destructiveActions.includes(action)) {
        const confirm = await vscode.window.showWarningMessage(
          `Code Buddy wants to: ${actionData.explanation}`,
          { modal: autonomyLevel === 'confirm' },
          'Allow',
          'Skip',
          'Stop Cascade'
        );

        if (confirm === 'Stop Cascade') {
          this.stopCascade();
          return { success: false, error: 'Stopped by user' };
        }
        if (confirm !== 'Allow') {
          return { success: false, error: 'Skipped by user' };
        }
      }
    }

    try {
      switch (action) {
        case 'READ_FILE': {
          const filePath = params.path as string;
          const uri = vscode.Uri.file(filePath);
          const content = await vscode.workspace.fs.readFile(uri);
          return { success: true, output: new TextDecoder().decode(content) };
        }

        case 'WRITE_FILE': {
          const filePath = params.path as string;
          const content = params.content as string;
          const uri = vscode.Uri.file(filePath);
          await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
          return { success: true, output: `Wrote ${filePath}` };
        }

        case 'EDIT_FILE': {
          const filePath = params.path as string;
          const oldText = params.oldText as string;
          const newText = params.newText as string;
          const doc = await vscode.workspace.openTextDocument(filePath);
          const text = doc.getText();
          const newContent = text.replace(oldText, newText);
          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            doc.uri,
            new vscode.Range(0, 0, doc.lineCount, 0),
            newContent
          );
          await vscode.workspace.applyEdit(edit);
          return { success: true, output: `Edited ${filePath}` };
        }

        case 'RUN_COMMAND': {
          const command = params.command as string;
          const terminal = vscode.window.createTerminal('Cascade');
          terminal.sendText(command);
          terminal.show();
          // Wait a bit for command to start
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { success: true, output: `Running: ${command}` };
        }

        case 'SEARCH_FILES': {
          const pattern = params.pattern as string;
          const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 50);
          return {
            success: true,
            output: files.map(f => f.fsPath).join('\n'),
          };
        }

        case 'SEARCH_CODE': {
          const pattern = params.pattern as string;
          // Use grep-like search
          const results = await vscode.commands.executeCommand(
            'workbench.action.findInFiles',
            { query: pattern }
          );
          return { success: true, output: `Searching for: ${pattern}` };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Get workspace context for the AI
   */
  private async getWorkspaceContext(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      return 'No workspace open';
    }

    const root = workspaceFolders[0].uri.fsPath;
    const files = await vscode.workspace.findFiles('**/*.{ts,js,py,go,rs,java}', '**/node_modules/**', 20);

    return `Workspace: ${root}
Files (sample):
${files.slice(0, 10).map(f => `- ${vscode.workspace.asRelativePath(f)}`).join('\n')}`;
  }

  private addStep(step: Omit<CascadeStep, 'id' | 'timestamp'>): void {
    this.steps.push({
      ...step,
      id: `step-${this.steps.length}`,
      timestamp: new Date(),
    });
    this.updateWebview();
  }

  private updateLastStep(step: Omit<CascadeStep, 'id' | 'timestamp'>): void {
    if (this.steps.length > 0) {
      const last = this.steps[this.steps.length - 1];
      this.steps[this.steps.length - 1] = {
        ...step,
        id: last.id,
        timestamp: last.timestamp,
      };
      this.updateWebview();
    }
  }

  private updateWebview(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'update',
        steps: this.steps,
        isRunning: this.isRunning,
      });
    }
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cascade</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-panel-background);
      padding: 12px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .header h3 { font-size: 14px; font-weight: 600; }
    .controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    input {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .steps { display: flex; flex-direction: column; gap: 8px; }
    .step {
      padding: 8px 12px;
      border-radius: 4px;
      border-left: 3px solid;
    }
    .step.thinking {
      background: rgba(100, 100, 255, 0.1);
      border-color: #6464ff;
    }
    .step.action {
      background: rgba(255, 165, 0, 0.1);
      border-color: orange;
    }
    .step.result {
      background: rgba(0, 255, 0, 0.1);
      border-color: #00ff00;
    }
    .step.error {
      background: rgba(255, 0, 0, 0.1);
      border-color: #ff0000;
    }
    .step-header {
      font-size: 10px;
      opacity: 0.7;
      margin-bottom: 4px;
    }
    .step.running { animation: pulse 1s infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .empty {
      text-align: center;
      padding: 40px;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>$(rocket) Cascade</h3>
    <button class="secondary" onclick="clearSteps()">Clear</button>
  </div>
  <div class="controls">
    <input type="text" id="taskInput" placeholder="Describe what you want to do..." />
    <button id="startBtn" onclick="startCascade()">Start</button>
    <button id="stopBtn" onclick="stopCascade()" style="display: none;">Stop</button>
  </div>
  <div class="steps" id="steps">
    <div class="empty">Enter a task to start Cascade mode</div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();

    function startCascade() {
      const task = document.getElementById('taskInput').value;
      if (task) {
        vscode.postMessage({ type: 'start', task });
      }
    }

    function stopCascade() {
      vscode.postMessage({ type: 'stop' });
    }

    function clearSteps() {
      vscode.postMessage({ type: 'clear' });
    }

    document.getElementById('taskInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startCascade();
    });

    window.addEventListener('message', event => {
      const { type, steps, isRunning } = event.data;
      if (type === 'update') {
        document.getElementById('startBtn').style.display = isRunning ? 'none' : 'block';
        document.getElementById('stopBtn').style.display = isRunning ? 'block' : 'none';
        document.getElementById('taskInput').disabled = isRunning;

        const stepsEl = document.getElementById('steps');
        if (steps.length === 0) {
          stepsEl.innerHTML = '<div class="empty">Enter a task to start Cascade mode</div>';
        } else {
          stepsEl.innerHTML = steps.map(step => \`
            <div class="step \${step.type} \${step.status}">
              <div class="step-header">\${step.type.toUpperCase()} - \${step.status}</div>
              <div>\${step.content}</div>
            </div>
          \`).join('');
          stepsEl.scrollTop = stepsEl.scrollHeight;
        }
      }
    });
  </script>
</body>
</html>`;
  }
}
