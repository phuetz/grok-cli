"use strict";
/**
 * Inline Edit Provider
 * Provides Cmd+K style inline editing like Cursor
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
exports.CodeBuddyInlineEditProvider = void 0;
const vscode = __importStar(require("vscode"));
class CodeBuddyInlineEditProvider {
    constructor(aiClient, diffManager) {
        this.aiClient = aiClient;
        this.diffManager = diffManager;
        this.inputBox = null;
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
    async startInlineEdit() {
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
            : new vscode.Range(selection.start.line, 0, selection.start.line, editor.document.lineAt(selection.start.line).text.length);
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
    async processInlineEdit(editor, selection, selectedText, instruction) {
        const language = editor.document.languageId;
        // Get surrounding context
        const startLine = Math.max(0, selection.start.line - 10);
        const endLine = Math.min(editor.document.lineCount - 1, selection.end.line + 10);
        const contextBefore = editor.document.getText(new vscode.Range(startLine, 0, selection.start.line, selection.start.character));
        const contextAfter = editor.document.getText(new vscode.Range(selection.end.line, selection.end.character, endLine, 1000));
        const response = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Code Buddy is thinking...' }, async () => {
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
            }
            else {
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
        });
        // Extract code from response
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
        const newCode = codeMatch ? codeMatch[1].trim() : response.trim();
        // Show diff preview
        if (selectedText) {
            await this.diffManager.showDiff(editor.document, selection, newCode);
        }
        else {
            // For new code generation, just insert with preview
            await this.diffManager.showDiff(editor.document, new vscode.Selection(selection.start, selection.start), newCode);
        }
    }
    /**
     * Cleanup after inline edit
     */
    cleanup(editor) {
        this.inputBox?.dispose();
        this.inputBox = null;
        editor.setDecorations(this.decorationType, []);
    }
    dispose() {
        this.inputBox?.dispose();
        this.decorationType.dispose();
    }
}
exports.CodeBuddyInlineEditProvider = CodeBuddyInlineEditProvider;
//# sourceMappingURL=inline-edit-provider.js.map