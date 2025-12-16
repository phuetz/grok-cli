"use strict";
/**
 * Issues Tree Provider
 * Shows code issues detected by AI review in the sidebar
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
exports.IssuesTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class IssuesTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.issues = new Map();
        this.disposables = [];
        // Listen for diagnostics changes
        this.disposables.push(vscode.languages.onDidChangeDiagnostics(e => {
            for (const uri of e.uris) {
                this.updateIssuesFromDiagnostics(uri);
            }
            this.refresh();
        }));
    }
    updateIssuesFromDiagnostics(uri) {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        const codeBuddyIssues = diagnostics
            .filter(d => d.source === 'Code Buddy')
            .map((d, i) => ({
            id: `${uri.fsPath}-${d.range.start.line}-${i}`,
            file: uri.fsPath,
            line: d.range.start.line + 1,
            severity: this.mapSeverity(d.severity),
            message: d.message,
            timestamp: Date.now(),
        }));
        if (codeBuddyIssues.length > 0) {
            this.issues.set(uri.fsPath, codeBuddyIssues);
        }
        else {
            this.issues.delete(uri.fsPath);
        }
    }
    mapSeverity(severity) {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'error';
            case vscode.DiagnosticSeverity.Warning:
                return 'warning';
            default:
                return 'info';
        }
    }
    addIssues(file, issues) {
        this.issues.set(file, issues);
        this.refresh();
    }
    clearIssues(file) {
        if (file) {
            this.issues.delete(file);
        }
        else {
            this.issues.clear();
        }
        this.refresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show files with issues
            const files = Array.from(this.issues.keys());
            if (files.length === 0) {
                return Promise.resolve([
                    new IssueItem('No issues detected', '', vscode.TreeItemCollapsibleState.None, 'empty'),
                ]);
            }
            return Promise.resolve(files.map(file => {
                const fileIssues = this.issues.get(file) || [];
                const errorCount = fileIssues.filter(i => i.severity === 'error').length;
                const warnCount = fileIssues.filter(i => i.severity === 'warning').length;
                const relativePath = vscode.workspace.asRelativePath(file);
                return new IssueItem(relativePath, file, vscode.TreeItemCollapsibleState.Expanded, 'file', undefined, `${errorCount} errors, ${warnCount} warnings`);
            }));
        }
        else if (element.type === 'file') {
            // File level - show individual issues
            const fileIssues = this.issues.get(element.filePath) || [];
            return Promise.resolve(fileIssues.map(issue => new IssueItem(`Line ${issue.line}: ${issue.message}`, element.filePath, vscode.TreeItemCollapsibleState.None, 'issue', issue)));
        }
        return Promise.resolve([]);
    }
    getTotalIssueCount() {
        let errors = 0;
        let warnings = 0;
        let info = 0;
        for (const issues of this.issues.values()) {
            for (const issue of issues) {
                if (issue.severity === 'error')
                    errors++;
                else if (issue.severity === 'warning')
                    warnings++;
                else
                    info++;
            }
        }
        return { errors, warnings, info };
    }
    dispose() {
        this._onDidChangeTreeData.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.IssuesTreeProvider = IssuesTreeProvider;
class IssueItem extends vscode.TreeItem {
    constructor(label, filePath, collapsibleState, type, issue, description) {
        super(label, collapsibleState);
        this.label = label;
        this.filePath = filePath;
        this.collapsibleState = collapsibleState;
        this.type = type;
        this.issue = issue;
        this.description = description;
        this.tooltip = issue?.suggestion || this.label;
        this.description = description;
        if (type === 'file') {
            this.iconPath = new vscode.ThemeIcon('file');
            this.contextValue = 'issueFile';
        }
        else if (type === 'issue' && issue) {
            this.iconPath = new vscode.ThemeIcon(issue.severity === 'error' ? 'error' :
                issue.severity === 'warning' ? 'warning' : 'info');
            this.contextValue = 'issue';
            this.command = {
                command: 'codebuddy.goToIssue',
                title: 'Go to Issue',
                arguments: [this.filePath, issue.line],
            };
        }
        else if (type === 'empty') {
            this.iconPath = new vscode.ThemeIcon('check');
        }
    }
}
//# sourceMappingURL=issues-tree-provider.js.map