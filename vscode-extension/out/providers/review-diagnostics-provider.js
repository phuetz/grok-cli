"use strict";
/**
 * Review Diagnostics Provider
 *
 * Provides diagnostics from AI code review in the Problems panel.
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
exports.ReviewDiagnosticsProvider = void 0;
const vscode = __importStar(require("vscode"));
class ReviewDiagnosticsProvider {
    constructor(aiClient) {
        this.aiClient = aiClient;
        this.disposables = [];
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('Code Buddy');
        this.disposables.push(this.diagnosticCollection);
        // Register fix command
        this.disposables.push(vscode.commands.registerCommand('codebuddy.fixDiagnostic', this.fixDiagnostic.bind(this)));
    }
    /**
     * Review a document and add diagnostics
     */
    async reviewDocument(document) {
        const code = document.getText();
        const language = document.languageId;
        try {
            const issues = await this.reviewCode(code, language);
            const diagnostics = issues.map(issue => {
                const line = Math.max(0, (issue.line || 1) - 1);
                const lineText = document.lineAt(line).text;
                const range = new vscode.Range(line, 0, line, lineText.length);
                const severity = this.mapSeverity(issue.severity);
                const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
                diagnostic.source = 'Code Buddy';
                diagnostic.code = issue.suggestion ? 'fixable' : undefined;
                // Store suggestion for quick fix
                if (issue.suggestion) {
                    diagnostic.suggestion = issue.suggestion;
                }
                return diagnostic;
            });
            this.diagnosticCollection.set(document.uri, diagnostics);
        }
        catch (error) {
            console.error('Code Buddy review error:', error);
        }
    }
    /**
     * Review code and return issues
     */
    async reviewCode(code, language) {
        const response = await this.aiClient.chat([
            {
                role: 'system',
                content: `You are an expert code reviewer for ${language}. Analyze the code and return a JSON array of issues.
Each issue should have: { "line": number, "message": string, "severity": "error"|"warning"|"info", "suggestion": string }
Return ONLY the JSON array, no explanations.`,
            },
            {
                role: 'user',
                content: `Review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
            },
        ]);
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        }
        catch {
            return [];
        }
    }
    /**
     * Fix a diagnostic issue
     */
    async fixDiagnostic(document, diagnostic) {
        const suggestion = diagnostic.suggestion;
        if (!suggestion) {
            // No direct suggestion, ask AI to fix
            const line = document.lineAt(diagnostic.range.start.line);
            const code = line.text;
            const language = document.languageId;
            const response = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Code Buddy is fixing...' }, async () => {
                return await this.aiClient.chat([
                    {
                        role: 'system',
                        content: `You are an expert ${language} developer. Fix the issue and return ONLY the fixed line of code.`,
                    },
                    {
                        role: 'user',
                        content: `Fix this issue in the code: "${diagnostic.message}"\n\nCode:\n${code}\n\nReturn ONLY the fixed line.`,
                    },
                ]);
            });
            const fixedCode = response.trim().replace(/^`+|`+$/g, '');
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === document) {
                await editor.edit(editBuilder => {
                    editBuilder.replace(diagnostic.range, fixedCode);
                });
            }
        }
        else {
            // Apply the suggestion directly
            vscode.window.showInformationMessage(`Suggestion: ${suggestion}`);
        }
        // Re-review after fix
        await this.reviewDocument(document);
    }
    /**
     * Map severity string to VS Code severity
     */
    mapSeverity(severity) {
        switch (severity) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'info':
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }
    /**
     * Clear diagnostics for a document
     */
    clearDiagnostics(document) {
        this.diagnosticCollection.delete(document.uri);
    }
    /**
     * Clear all diagnostics
     */
    clearAll() {
        this.diagnosticCollection.clear();
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
exports.ReviewDiagnosticsProvider = ReviewDiagnosticsProvider;
//# sourceMappingURL=review-diagnostics-provider.js.map