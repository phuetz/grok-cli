"use strict";
/**
 * Context Tree Provider
 * Shows files added to AI context in the sidebar
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
exports.ContextTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class ContextTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.contextFiles = [];
    }
    /**
     * Add a file to context
     */
    addFile(uri) {
        if (!this.contextFiles.find(f => f.toString() === uri.toString())) {
            this.contextFiles.push(uri);
            this._onDidChangeTreeData.fire();
        }
    }
    /**
     * Remove a file from context
     */
    removeFile(uri) {
        this.contextFiles = this.contextFiles.filter(f => f.toString() !== uri.toString());
        this._onDidChangeTreeData.fire();
    }
    /**
     * Clear all context files
     */
    clear() {
        this.contextFiles = [];
        this._onDidChangeTreeData.fire();
    }
    /**
     * Get all context files
     */
    getFiles() {
        return [...this.contextFiles];
    }
    /**
     * Get context as text for AI
     */
    async getContextText() {
        const contents = [];
        for (const uri of this.contextFiles) {
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                const relativePath = vscode.workspace.asRelativePath(uri);
                contents.push(`--- ${relativePath} ---\n\`\`\`${doc.languageId}\n${doc.getText()}\n\`\`\`\n`);
            }
            catch {
                // Skip files that can't be read
            }
        }
        return contents.join('\n');
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        if (this.contextFiles.length === 0) {
            return Promise.resolve([
                new ContextFileItem('No files in context', vscode.Uri.parse('empty'), 'empty', vscode.TreeItemCollapsibleState.None),
            ]);
        }
        return Promise.resolve(this.contextFiles.map(uri => new ContextFileItem(vscode.workspace.asRelativePath(uri), uri, 'file', vscode.TreeItemCollapsibleState.None)));
    }
}
exports.ContextTreeProvider = ContextTreeProvider;
class ContextFileItem extends vscode.TreeItem {
    constructor(label, fileUri, type, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.fileUri = fileUri;
        this.type = type;
        this.collapsibleState = collapsibleState;
        if (type === 'file') {
            this.tooltip = fileUri.fsPath;
            this.iconPath = new vscode.ThemeIcon('file');
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [fileUri],
            };
            this.contextValue = 'contextFile';
        }
        else {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }
}
//# sourceMappingURL=context-tree-provider.js.map