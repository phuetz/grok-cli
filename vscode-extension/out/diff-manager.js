"use strict";
/**
 * Diff Manager
 * Handles showing diff previews and applying/rejecting changes
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
exports.DiffManager = void 0;
const vscode = __importStar(require("vscode"));
class DiffManager {
    constructor() {
        this.pendingDiff = null;
        // Create decoration types for diff highlighting
        this.deleteDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            isWholeLine: true,
            before: {
                contentText: '- ',
                color: 'rgba(255, 100, 100, 0.8)',
            },
        });
        this.insertDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
            isWholeLine: true,
            before: {
                contentText: '+ ',
                color: 'rgba(100, 255, 100, 0.8)',
            },
        });
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '$(check) Accept  $(x) Reject';
        this.statusBarItem.tooltip = 'Code Buddy: Accept (Ctrl+Enter) or Reject (Esc) changes';
        this.statusBarItem.command = 'codebuddy.acceptDiff';
    }
    /**
     * Show diff for proposed changes
     */
    async showDiff(document, selection, newContent) {
        // Clear any existing diff
        this.clearDecorations();
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        // Store pending diff
        this.pendingDiff = {
            document,
            selection,
            newContent,
            decorations: [this.deleteDecorationType, this.insertDecorationType],
        };
        // Get the original text
        const originalText = document.getText(selection);
        const originalLines = originalText.split('\n');
        // Create decorations for deleted lines (original)
        const deleteDecorations = [];
        for (let i = 0; i < originalLines.length; i++) {
            const line = selection.start.line + i;
            deleteDecorations.push({
                range: new vscode.Range(line, 0, line, originalLines[i].length),
                hoverMessage: 'This line will be removed',
            });
        }
        // Apply delete decorations
        editor.setDecorations(this.deleteDecorationType, deleteDecorations);
        // Show status bar
        this.statusBarItem.show();
        // Set context for keybindings
        await vscode.commands.executeCommand('setContext', 'codebuddy.diffVisible', true);
        // Show info message with options
        const action = await vscode.window.showInformationMessage('Code Buddy: Review proposed changes', { modal: false }, 'Accept', 'Reject', 'Show Diff');
        if (action === 'Accept') {
            await this.acceptCurrentDiff();
        }
        else if (action === 'Reject') {
            await this.rejectCurrentDiff();
        }
        else if (action === 'Show Diff') {
            await this.showSideBySideDiff(document, selection, newContent);
        }
    }
    /**
     * Show side-by-side diff view
     */
    async showSideBySideDiff(document, selection, newContent) {
        const originalText = document.getText(selection);
        // Create virtual documents for diff view
        const originalUri = vscode.Uri.parse(`codebuddy-diff:original/${document.fileName}`);
        const modifiedUri = vscode.Uri.parse(`codebuddy-diff:modified/${document.fileName}`);
        // Register content provider for virtual documents
        const provider = new (class {
            provideTextDocumentContent(uri) {
                if (uri.path.includes('original')) {
                    return originalText;
                }
                return newContent;
            }
        })();
        const disposable = vscode.workspace.registerTextDocumentContentProvider('codebuddy-diff', provider);
        // Open diff view
        await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, 'Code Buddy: Proposed Changes');
        // Dispose provider after a delay
        setTimeout(() => disposable.dispose(), 60000);
    }
    /**
     * Accept the current pending diff
     */
    async acceptCurrentDiff() {
        if (!this.pendingDiff) {
            vscode.window.showWarningMessage('No pending changes to accept');
            return;
        }
        const { document, selection, newContent } = this.pendingDiff;
        // Find the editor for this document
        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === document.uri.toString());
        if (editor) {
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, newContent);
            });
            vscode.window.showInformationMessage('Code Buddy: Changes applied!');
        }
        this.cleanup();
    }
    /**
     * Reject the current pending diff
     */
    async rejectCurrentDiff() {
        if (!this.pendingDiff) {
            vscode.window.showWarningMessage('No pending changes to reject');
            return;
        }
        vscode.window.showInformationMessage('Code Buddy: Changes rejected');
        this.cleanup();
    }
    /**
     * Clear decorations
     */
    clearDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.setDecorations(this.deleteDecorationType, []);
            editor.setDecorations(this.insertDecorationType, []);
        }
    }
    /**
     * Cleanup after accepting/rejecting
     */
    cleanup() {
        this.clearDecorations();
        this.pendingDiff = null;
        this.statusBarItem.hide();
        vscode.commands.executeCommand('setContext', 'codebuddy.diffVisible', false);
    }
    /**
     * Check if there's a pending diff
     */
    hasPendingDiff() {
        return this.pendingDiff !== null;
    }
    dispose() {
        this.deleteDecorationType.dispose();
        this.insertDecorationType.dispose();
        this.statusBarItem.dispose();
    }
}
exports.DiffManager = DiffManager;
//# sourceMappingURL=diff-manager.js.map