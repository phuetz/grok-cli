"use strict";
/**
 * Code Lens Provider
 * Shows AI action buttons above functions and classes
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
exports.CodeBuddyCodeLensProvider = void 0;
exports.registerCodeLensCommands = registerCodeLensCommands;
const vscode = __importStar(require("vscode"));
class CodeBuddyCodeLensProvider {
    constructor(aiClient) {
        this.aiClient = aiClient;
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    provideCodeLenses(document, _token) {
        const codeLenses = [];
        const language = document.languageId;
        // Find functions and classes based on language
        const patterns = this.getPatternsForLanguage(language);
        for (const pattern of patterns) {
            const regex = new RegExp(pattern.regex, 'gm');
            const text = document.getText();
            let match;
            while ((match = regex.exec(text)) !== null) {
                const position = document.positionAt(match.index);
                const range = new vscode.Range(position, position);
                // Add "Explain" lens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '$(lightbulb) Explain',
                    command: 'codebuddy.explainSymbol',
                    arguments: [document, position, pattern.type],
                }));
                // Add "Generate Tests" lens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '$(beaker) Tests',
                    command: 'codebuddy.generateTestsForSymbol',
                    arguments: [document, position, pattern.type],
                }));
                // Add "Optimize" lens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '$(zap) Optimize',
                    command: 'codebuddy.optimizeSymbol',
                    arguments: [document, position, pattern.type],
                }));
                // Add "Document" lens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '$(book) Document',
                    command: 'codebuddy.documentSymbol',
                    arguments: [document, position, pattern.type],
                }));
            }
        }
        return codeLenses;
    }
    getPatternsForLanguage(language) {
        switch (language) {
            case 'typescript':
            case 'typescriptreact':
            case 'javascript':
            case 'javascriptreact':
                return [
                    { regex: '^\\s*(export\\s+)?(async\\s+)?function\\s+\\w+', type: 'function' },
                    { regex: '^\\s*(export\\s+)?class\\s+\\w+', type: 'class' },
                    { regex: '^\\s*(export\\s+)?const\\s+\\w+\\s*=\\s*(async\\s+)?\\([^)]*\\)\\s*=>', type: 'arrow' },
                    { regex: '^\\s*(public|private|protected)?\\s*(async\\s+)?\\w+\\s*\\([^)]*\\)\\s*[:{]', type: 'method' },
                ];
            case 'python':
                return [
                    { regex: '^\\s*def\\s+\\w+', type: 'function' },
                    { regex: '^\\s*class\\s+\\w+', type: 'class' },
                    { regex: '^\\s*async\\s+def\\s+\\w+', type: 'async_function' },
                ];
            case 'go':
                return [
                    { regex: '^func\\s+\\w+', type: 'function' },
                    { regex: '^func\\s+\\([^)]+\\)\\s+\\w+', type: 'method' },
                    { regex: '^type\\s+\\w+\\s+struct', type: 'struct' },
                    { regex: '^type\\s+\\w+\\s+interface', type: 'interface' },
                ];
            case 'rust':
                return [
                    { regex: '^\\s*(pub\\s+)?fn\\s+\\w+', type: 'function' },
                    { regex: '^\\s*(pub\\s+)?struct\\s+\\w+', type: 'struct' },
                    { regex: '^\\s*(pub\\s+)?impl\\s+\\w+', type: 'impl' },
                    { regex: '^\\s*(pub\\s+)?trait\\s+\\w+', type: 'trait' },
                ];
            case 'java':
            case 'kotlin':
                return [
                    { regex: '^\\s*(public|private|protected)?\\s*(static)?\\s*\\w+\\s+\\w+\\s*\\(', type: 'method' },
                    { regex: '^\\s*(public|private)?\\s*class\\s+\\w+', type: 'class' },
                    { regex: '^\\s*(public|private)?\\s*interface\\s+\\w+', type: 'interface' },
                ];
            default:
                return [
                    { regex: '^\\s*function\\s+\\w+', type: 'function' },
                    { regex: '^\\s*class\\s+\\w+', type: 'class' },
                ];
        }
    }
    resolveCodeLens(codeLens, _token) {
        return codeLens;
    }
}
exports.CodeBuddyCodeLensProvider = CodeBuddyCodeLensProvider;
// Register additional commands for code lens
function registerCodeLensCommands(context, aiClient) {
    // Explain symbol command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.explainSymbol', async (document, position, symbolType) => {
        const symbolRange = getSymbolRange(document, position);
        const symbolText = document.getText(symbolRange);
        const explanation = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Explaining...' }, async () => {
            return await aiClient.chat([
                { role: 'system', content: 'You are a helpful coding assistant.' },
                { role: 'user', content: `Explain this ${symbolType}:\n\n\`\`\`\n${symbolText}\n\`\`\`` },
            ]);
        });
        // Show in output channel
        const channel = vscode.window.createOutputChannel('Code Buddy');
        channel.clear();
        channel.appendLine(`Explanation for ${symbolType}:\n`);
        channel.appendLine(explanation);
        channel.show();
    }));
    // Generate tests for symbol command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.generateTestsForSymbol', async (document, position, symbolType) => {
        const symbolRange = getSymbolRange(document, position);
        const symbolText = document.getText(symbolRange);
        const language = document.languageId;
        const tests = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Generating tests...' }, async () => {
            return await aiClient.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer. Generate comprehensive unit tests.`,
                },
                {
                    role: 'user',
                    content: `Generate tests for this ${symbolType}:\n\n\`\`\`${language}\n${symbolText}\n\`\`\``,
                },
            ]);
        });
        // Show in new untitled document
        const doc = await vscode.workspace.openTextDocument({
            language,
            content: extractCode(tests),
        });
        await vscode.window.showTextDocument(doc);
    }));
    // Optimize symbol command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.optimizeSymbol', async (document, position, symbolType) => {
        const symbolRange = getSymbolRange(document, position);
        const symbolText = document.getText(symbolRange);
        const language = document.languageId;
        const optimized = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Optimizing...' }, async () => {
            return await aiClient.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer. Optimize the code for performance and readability. Return ONLY the optimized code.`,
                },
                {
                    role: 'user',
                    content: `Optimize this ${symbolType}:\n\n\`\`\`${language}\n${symbolText}\n\`\`\``,
                },
            ]);
        });
        // Show diff
        const optimizedCode = extractCode(optimized);
        await vscode.commands.executeCommand('codebuddy.showDiff', document, symbolRange, optimizedCode);
    }));
    // Document symbol command
    context.subscriptions.push(vscode.commands.registerCommand('codebuddy.documentSymbol', async (document, position, symbolType) => {
        const symbolRange = getSymbolRange(document, position);
        const symbolText = document.getText(symbolRange);
        const language = document.languageId;
        const documented = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Adding documentation...' }, async () => {
            return await aiClient.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer. Add comprehensive documentation comments. Return the code with documentation.`,
                },
                {
                    role: 'user',
                    content: `Add documentation to this ${symbolType}:\n\n\`\`\`${language}\n${symbolText}\n\`\`\``,
                },
            ]);
        });
        const documentedCode = extractCode(documented);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await editor.edit(editBuilder => {
                editBuilder.replace(symbolRange, documentedCode);
            });
        }
    }));
}
function getSymbolRange(document, position) {
    // Find the end of the symbol (function/class body)
    const startLine = position.line;
    let endLine = startLine;
    let braceCount = 0;
    let foundOpenBrace = false;
    for (let i = startLine; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        for (const char of line) {
            if (char === '{' || char === ':') {
                braceCount++;
                foundOpenBrace = true;
            }
            else if (char === '}') {
                braceCount--;
            }
        }
        if (foundOpenBrace && braceCount === 0) {
            endLine = i;
            break;
        }
        // For Python, use indentation
        if (!foundOpenBrace && i > startLine) {
            const currentIndent = line.length - line.trimStart().length;
            const startIndent = document.lineAt(startLine).text.length -
                document.lineAt(startLine).text.trimStart().length;
            if (line.trim() && currentIndent <= startIndent) {
                endLine = i - 1;
                break;
            }
        }
        endLine = i;
    }
    return new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
}
function extractCode(response) {
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : response.trim();
}
//# sourceMappingURL=codelens-provider.js.map