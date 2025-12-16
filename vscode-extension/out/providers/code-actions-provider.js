"use strict";
/**
 * Code Actions Provider
 *
 * Provides quick fix actions for code issues detected by Code Buddy.
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
exports.CodeBuddyCodeActionsProvider = void 0;
const vscode = __importStar(require("vscode"));
class CodeBuddyCodeActionsProvider {
    constructor(aiClient) {
        this.aiClient = aiClient;
    }
    provideCodeActions(document, range, context, _token) {
        const actions = [];
        // Add actions for Code Buddy diagnostics
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === 'Code Buddy') {
                // Quick fix action
                const fixAction = new vscode.CodeAction(`Fix with Code Buddy: ${diagnostic.message.slice(0, 40)}...`, vscode.CodeActionKind.QuickFix);
                fixAction.command = {
                    command: 'codebuddy.fixDiagnostic',
                    title: 'Fix with Code Buddy',
                    arguments: [document, diagnostic],
                };
                fixAction.diagnostics = [diagnostic];
                fixAction.isPreferred = true;
                actions.push(fixAction);
            }
        }
        // Add general actions when text is selected
        if (!range.isEmpty) {
            // Explain action
            const explainAction = new vscode.CodeAction('Explain with Code Buddy', vscode.CodeActionKind.Empty);
            explainAction.command = {
                command: 'codebuddy.explain',
                title: 'Explain with Code Buddy',
            };
            actions.push(explainAction);
            // Refactor action
            const refactorAction = new vscode.CodeAction('Refactor with Code Buddy', vscode.CodeActionKind.Refactor);
            refactorAction.command = {
                command: 'codebuddy.refactor',
                title: 'Refactor with Code Buddy',
            };
            actions.push(refactorAction);
            // Generate tests action
            const testAction = new vscode.CodeAction('Generate Tests with Code Buddy', vscode.CodeActionKind.Empty);
            testAction.command = {
                command: 'codebuddy.generateTests',
                title: 'Generate Tests with Code Buddy',
            };
            actions.push(testAction);
            // Optimize action
            const optimizeAction = new vscode.CodeAction('Optimize with Code Buddy', vscode.CodeActionKind.Refactor);
            optimizeAction.command = {
                command: 'codebuddy.optimize',
                title: 'Optimize with Code Buddy',
                arguments: [document, range],
            };
            actions.push(optimizeAction);
            // Add documentation action
            const docAction = new vscode.CodeAction('Add Documentation with Code Buddy', vscode.CodeActionKind.Refactor);
            docAction.command = {
                command: 'codebuddy.addDocs',
                title: 'Add Documentation with Code Buddy',
                arguments: [document, range],
            };
            actions.push(docAction);
            // Inline edit action (Cmd+K style)
            const inlineEditAction = new vscode.CodeAction('Edit with Code Buddy (Cmd+K)', vscode.CodeActionKind.Refactor);
            inlineEditAction.command = {
                command: 'codebuddy.inlineEdit',
                title: 'Edit with Code Buddy',
            };
            actions.push(inlineEditAction);
        }
        return actions;
    }
}
exports.CodeBuddyCodeActionsProvider = CodeBuddyCodeActionsProvider;
CodeBuddyCodeActionsProvider.providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
];
//# sourceMappingURL=code-actions-provider.js.map