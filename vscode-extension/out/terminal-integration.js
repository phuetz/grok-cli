"use strict";
/**
 * Terminal Integration
 * Provides AI-powered terminal assistance like Windsurf
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
exports.TerminalIntegration = void 0;
const vscode = __importStar(require("vscode"));
class TerminalIntegration {
    constructor(aiClient) {
        this.aiClient = aiClient;
        this.disposables = [];
        this.suggestionsPanel = null;
        this.recentCommands = [];
        this.recentErrors = [];
        this.setupTerminalListeners();
        this.registerCommands();
    }
    setupTerminalListeners() {
        // Listen for terminal creation
        this.disposables.push(vscode.window.onDidOpenTerminal(_terminal => {
            // Track terminal for context
        }));
        // Listen for terminal close
        this.disposables.push(vscode.window.onDidCloseTerminal(_terminal => {
            // Cleanup
        }));
    }
    registerCommands() {
        // Suggest command
        this.disposables.push(vscode.commands.registerCommand('codebuddy.suggestCommand', async () => {
            await this.suggestCommand();
        }));
        // Explain terminal error
        this.disposables.push(vscode.commands.registerCommand('codebuddy.explainTerminal', async () => {
            await this.explainTerminalContent();
        }));
        // Run suggested command
        this.disposables.push(vscode.commands.registerCommand('codebuddy.runCommand', async (command) => {
            await this.runCommand(command);
        }));
        // Generate command from description
        this.disposables.push(vscode.commands.registerCommand('codebuddy.generateCommand', async () => {
            await this.generateCommand();
        }));
    }
    /**
     * Suggest a terminal command based on context
     */
    async suggestCommand() {
        const context = await this.gatherContext();
        const input = await vscode.window.showInputBox({
            prompt: 'What do you want to do?',
            placeHolder: 'e.g., "run tests", "install dependencies", "start the dev server"',
        });
        if (!input)
            return;
        const suggestions = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Generating command suggestions...' }, async () => {
            return await this.generateSuggestions(input, context);
        });
        if (suggestions.length === 0) {
            vscode.window.showInformationMessage('Could not generate command suggestions');
            return;
        }
        // Show quick pick with suggestions
        const items = suggestions.map(s => ({
            label: s.command,
            description: s.description,
            detail: `Confidence: ${Math.round(s.confidence * 100)}%`,
            command: s.command,
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a command to run',
            title: 'Code Buddy: Command Suggestions',
        });
        if (selected) {
            const action = await vscode.window.showQuickPick(['Run', 'Copy to Clipboard', 'Edit Before Running'], { placeHolder: 'What do you want to do with this command?' });
            switch (action) {
                case 'Run':
                    await this.runCommand(selected.command);
                    break;
                case 'Copy to Clipboard':
                    await vscode.env.clipboard.writeText(selected.command);
                    vscode.window.showInformationMessage('Command copied to clipboard');
                    break;
                case 'Edit Before Running':
                    const edited = await vscode.window.showInputBox({
                        value: selected.command,
                        prompt: 'Edit the command',
                    });
                    if (edited) {
                        await this.runCommand(edited);
                    }
                    break;
            }
        }
    }
    /**
     * Generate command suggestions
     */
    async generateSuggestions(task, context) {
        const response = await this.aiClient.chat([
            {
                role: 'system',
                content: `You are a terminal command expert. Generate 3 command suggestions for the task.
Return JSON array: [{"command": "...", "description": "...", "confidence": 0.0-1.0}]

Consider:
- The user's OS and shell
- Project type (Node.js, Python, Go, etc.)
- Common best practices
- Safety (warn about destructive commands)`,
            },
            {
                role: 'user',
                content: `Task: ${task}\n\nContext:\n${context}\n\nGenerate command suggestions:`,
            },
        ]);
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
        catch {
            // Parse failed
        }
        return [];
    }
    /**
     * Explain terminal content (error or output)
     */
    async explainTerminalContent() {
        const content = await vscode.window.showInputBox({
            prompt: 'Paste the terminal output or error to explain',
            placeHolder: 'Paste error message or command output here...',
        });
        if (!content)
            return;
        const explanation = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Analyzing terminal output...' }, async () => {
            return await this.aiClient.chat([
                {
                    role: 'system',
                    content: `You are a terminal and debugging expert. Explain the terminal output or error clearly.
Include:
- What happened
- Why it happened
- How to fix it (if it's an error)
- Relevant commands to run`,
                },
                {
                    role: 'user',
                    content: `Explain this terminal output:\n\n\`\`\`\n${content}\n\`\`\``,
                },
            ]);
        });
        // Show in output channel
        const channel = vscode.window.createOutputChannel('Code Buddy - Terminal');
        channel.clear();
        channel.appendLine('Terminal Analysis\n');
        channel.appendLine('='.repeat(50));
        channel.appendLine(explanation);
        channel.show();
    }
    /**
     * Generate command from natural language
     */
    async generateCommand() {
        const description = await vscode.window.showInputBox({
            prompt: 'Describe what command you need',
            placeHolder: 'e.g., "find all TypeScript files modified in the last week"',
        });
        if (!description)
            return;
        const context = await this.gatherContext();
        const response = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Generating command...' }, async () => {
            return await this.aiClient.chat([
                {
                    role: 'system',
                    content: `You are a terminal command expert. Generate the exact command for the request.
Return the command followed by a brief explanation.
Consider the user's OS and common tools.`,
                },
                {
                    role: 'user',
                    content: `Generate a command for: ${description}\n\nContext:\n${context}`,
                },
            ]);
        });
        // Extract command (usually in code block or first line)
        const codeMatch = response.match(/```(?:bash|sh|shell)?\n?(.*?)```/s);
        const command = codeMatch ? codeMatch[1].trim() : response.split('\n')[0].trim();
        const action = await vscode.window.showQuickPick([
            { label: 'Run Command', description: command },
            { label: 'Copy to Clipboard', description: 'Copy the command' },
            { label: 'Show Full Response', description: 'See explanation' },
        ], { placeHolder: `Generated: ${command}` });
        if (action?.label === 'Run Command') {
            await this.runCommand(command);
        }
        else if (action?.label === 'Copy to Clipboard') {
            await vscode.env.clipboard.writeText(command);
            vscode.window.showInformationMessage('Command copied');
        }
        else if (action?.label === 'Show Full Response') {
            const channel = vscode.window.createOutputChannel('Code Buddy - Command');
            channel.clear();
            channel.appendLine(response);
            channel.show();
        }
    }
    /**
     * Run a command in the terminal
     */
    async runCommand(command) {
        let terminal = vscode.window.activeTerminal;
        if (!terminal) {
            terminal = vscode.window.createTerminal('Code Buddy');
        }
        terminal.show();
        terminal.sendText(command);
        this.recentCommands.push(command);
        if (this.recentCommands.length > 50) {
            this.recentCommands.shift();
        }
    }
    /**
     * Gather context for command generation
     */
    async gatherContext() {
        const context = [];
        // OS info
        context.push(`OS: ${process.platform}`);
        // Workspace info
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            context.push(`Workspace: ${workspaceFolders[0].name}`);
            // Detect project type
            const packageJson = await vscode.workspace.findFiles('package.json', null, 1);
            if (packageJson.length > 0) {
                context.push('Project type: Node.js');
                try {
                    const doc = await vscode.workspace.openTextDocument(packageJson[0]);
                    const pkg = JSON.parse(doc.getText());
                    if (pkg.scripts) {
                        context.push(`npm scripts: ${Object.keys(pkg.scripts).join(', ')}`);
                    }
                }
                catch {
                    // Skip
                }
            }
            const pyproject = await vscode.workspace.findFiles('pyproject.toml', null, 1);
            if (pyproject.length > 0) {
                context.push('Project type: Python');
            }
            const goMod = await vscode.workspace.findFiles('go.mod', null, 1);
            if (goMod.length > 0) {
                context.push('Project type: Go');
            }
            const cargoToml = await vscode.workspace.findFiles('Cargo.toml', null, 1);
            if (cargoToml.length > 0) {
                context.push('Project type: Rust');
            }
        }
        // Recent commands
        if (this.recentCommands.length > 0) {
            context.push(`Recent commands: ${this.recentCommands.slice(-5).join(', ')}`);
        }
        // Current file
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            context.push(`Current file: ${vscode.workspace.asRelativePath(editor.document.uri)}`);
            context.push(`Language: ${editor.document.languageId}`);
        }
        return context.join('\n');
    }
    /**
     * Get command history
     */
    getRecentCommands() {
        return [...this.recentCommands];
    }
    dispose() {
        this.suggestionsPanel?.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.TerminalIntegration = TerminalIntegration;
//# sourceMappingURL=terminal-integration.js.map