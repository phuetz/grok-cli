"use strict";
/**
 * Smart Context Manager
 * Automatically includes relevant files in AI context
 * Windsurf-inspired intelligent context gathering
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
exports.SmartContextManager = void 0;
const vscode = __importStar(require("vscode"));
class SmartContextManager {
    constructor() {
        this.disposables = [];
        this.fileCache = new Map();
        this.importGraph = new Map();
        this.symbolIndex = new Map();
        this.setupListeners();
    }
    setupListeners() {
        // Update cache on file changes
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.scheme === 'file') {
                this.invalidateCache(e.document.uri.fsPath);
            }
        }));
        // Build import graph on workspace open
        this.buildImportGraph();
    }
    /**
     * Get smart context for a query or current file
     */
    async getSmartContext(options) {
        const maxFiles = options.maxFiles || 10;
        const relevantFiles = [];
        // 1. Start with current file if provided
        if (options.currentFile) {
            const currentContext = await this.getFileContext(options.currentFile, 'Current file', 1.0);
            if (currentContext) {
                relevantFiles.push(currentContext);
            }
            // 2. Add imported files
            const imports = await this.getImports(options.currentFile);
            for (const importPath of imports.slice(0, 5)) {
                const importContext = await this.getFileContext(importPath, 'Imported by current file', 0.8);
                if (importContext) {
                    relevantFiles.push(importContext);
                }
            }
            // 3. Add files that import current file
            const importers = this.getImporters(options.currentFile);
            for (const importer of importers.slice(0, 3)) {
                const importerContext = await this.getFileContext(importer, 'Imports current file', 0.6);
                if (importerContext) {
                    relevantFiles.push(importerContext);
                }
            }
        }
        // 4. Search for relevant files based on query
        if (options.query) {
            const searchResults = await this.searchRelevantFiles(options.query, maxFiles);
            for (const result of searchResults) {
                if (!relevantFiles.find(f => f.path === result.path)) {
                    relevantFiles.push(result);
                }
            }
        }
        // 5. Search for symbols related to selection
        if (options.selection) {
            const symbolFiles = await this.findSymbolDefinitions(options.selection);
            for (const file of symbolFiles.slice(0, 3)) {
                if (!relevantFiles.find(f => f.path === file.path)) {
                    relevantFiles.push(file);
                }
            }
        }
        // 6. Add related test files
        if (options.currentFile) {
            const testFile = await this.findTestFile(options.currentFile);
            if (testFile && !relevantFiles.find(f => f.path === testFile.path)) {
                relevantFiles.push(testFile);
            }
        }
        // Sort by relevance and limit
        const sortedFiles = relevantFiles
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, maxFiles);
        // Extract symbols from files
        const symbols = await this.extractSymbols(sortedFiles);
        // Get all imports/exports
        const allImports = new Set();
        const allExports = new Set();
        for (const file of sortedFiles) {
            const { imports, exports } = this.parseImportsExports(file.content, file.language);
            imports.forEach(i => allImports.add(i));
            exports.forEach(e => allExports.add(e));
        }
        return {
            files: sortedFiles,
            symbols,
            imports: Array.from(allImports),
            exports: Array.from(allExports),
            summary: this.generateContextSummary(sortedFiles),
        };
    }
    /**
     * Get context for a specific file
     */
    async getFileContext(filePath, reason, relevance) {
        try {
            const uri = vscode.Uri.file(filePath);
            // Check cache
            const cached = this.fileCache.get(filePath);
            let content;
            if (cached) {
                content = cached.content;
            }
            else {
                const doc = await vscode.workspace.openTextDocument(uri);
                content = doc.getText();
                this.fileCache.set(filePath, { content, mtime: Date.now() });
            }
            const doc = await vscode.workspace.openTextDocument(uri);
            const relativePath = vscode.workspace.asRelativePath(uri);
            return {
                path: filePath,
                relativePath,
                content,
                language: doc.languageId,
                relevance,
                reason,
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Get imports from a file
     */
    async getImports(filePath) {
        const cached = this.importGraph.get(filePath);
        if (cached) {
            return cached;
        }
        try {
            const doc = await vscode.workspace.openTextDocument(filePath);
            const content = doc.getText();
            const imports = this.extractImportPaths(content, doc.languageId, filePath);
            this.importGraph.set(filePath, imports);
            return imports;
        }
        catch {
            return [];
        }
    }
    /**
     * Get files that import the given file
     */
    getImporters(filePath) {
        const importers = [];
        for (const [file, imports] of this.importGraph) {
            if (imports.includes(filePath)) {
                importers.push(file);
            }
        }
        return importers;
    }
    /**
     * Extract import paths from file content
     */
    extractImportPaths(content, language, currentFile) {
        const imports = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || '';
        const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
        // TypeScript/JavaScript imports
        if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(language)) {
            const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];
                // Resolve relative imports
                if (importPath.startsWith('.')) {
                    const resolved = this.resolveRelativePath(currentDir, importPath, workspaceRoot);
                    if (resolved) {
                        imports.push(resolved);
                    }
                }
            }
        }
        // Python imports
        if (language === 'python') {
            const importRegex = /^(?:from|import)\s+([a-zA-Z0-9_.]+)/gm;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                const modulePath = match[1].replace(/\./g, '/');
                const possiblePath = `${workspaceRoot}/${modulePath}.py`;
                imports.push(possiblePath);
            }
        }
        return imports;
    }
    /**
     * Resolve relative import path to absolute
     */
    resolveRelativePath(currentDir, importPath, _workspaceRoot) {
        // Remove leading ./
        let resolved = importPath.replace(/^\.\//, '');
        // Handle ../
        const parts = currentDir.split('/');
        while (resolved.startsWith('../')) {
            parts.pop();
            resolved = resolved.substring(3);
        }
        const basePath = `${parts.join('/')}/${resolved}`;
        // Try different extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
        for (const ext of extensions) {
            const fullPath = basePath + ext;
            // In a real implementation, we'd check if file exists
            return fullPath;
        }
        return basePath;
    }
    /**
     * Search for files relevant to a query
     */
    async searchRelevantFiles(query, maxFiles) {
        const results = [];
        // Search for files by name
        const filePattern = `**/*${query}*`;
        const files = await vscode.workspace.findFiles(filePattern, '**/node_modules/**', maxFiles);
        for (const file of files.slice(0, 5)) {
            const context = await this.getFileContext(file.fsPath, `Name matches "${query}"`, 0.7);
            if (context) {
                results.push(context);
            }
        }
        // Search for files containing the query
        const contentFiles = await vscode.workspace.findFiles('**/*.{ts,js,py,go,rs,java,tsx,jsx}', '**/node_modules/**', 100);
        for (const file of contentFiles) {
            try {
                const doc = await vscode.workspace.openTextDocument(file);
                const content = doc.getText();
                if (content.toLowerCase().includes(query.toLowerCase())) {
                    const context = await this.getFileContext(file.fsPath, `Contains "${query}"`, 0.5);
                    if (context && !results.find(r => r.path === context.path)) {
                        results.push(context);
                    }
                }
                if (results.length >= maxFiles)
                    break;
            }
            catch {
                // Skip files that can't be read
            }
        }
        return results;
    }
    /**
     * Find symbol definitions
     */
    async findSymbolDefinitions(text) {
        const results = [];
        // Extract identifiers from text
        const identifiers = text.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        const uniqueIdentifiers = [...new Set(identifiers)].filter(id => id.length > 2);
        for (const identifier of uniqueIdentifiers.slice(0, 5)) {
            // Search for definition patterns
            const patterns = [
                `function ${identifier}`,
                `class ${identifier}`,
                `const ${identifier}`,
                `def ${identifier}`,
                `interface ${identifier}`,
                `type ${identifier}`,
            ];
            for (const pattern of patterns) {
                const files = await vscode.workspace.findFiles('**/*.{ts,js,py,tsx,jsx}', '**/node_modules/**', 50);
                for (const file of files) {
                    try {
                        const doc = await vscode.workspace.openTextDocument(file);
                        const content = doc.getText();
                        if (content.includes(pattern)) {
                            const context = await this.getFileContext(file.fsPath, `Defines ${identifier}`, 0.9);
                            if (context && !results.find(r => r.path === context.path)) {
                                results.push(context);
                                break;
                            }
                        }
                    }
                    catch {
                        // Skip
                    }
                }
            }
        }
        return results;
    }
    /**
     * Find test file for a source file
     */
    async findTestFile(sourcePath) {
        const baseName = sourcePath.replace(/\.(ts|js|tsx|jsx)$/, '');
        const testPatterns = [
            `${baseName}.test.ts`,
            `${baseName}.test.js`,
            `${baseName}.spec.ts`,
            `${baseName}.spec.js`,
            baseName.replace('/src/', '/tests/') + '.test.ts',
            baseName.replace('/src/', '/__tests__/') + '.test.ts',
        ];
        for (const pattern of testPatterns) {
            try {
                await vscode.workspace.openTextDocument(pattern);
                return await this.getFileContext(pattern, 'Test file', 0.7);
            }
            catch {
                // File doesn't exist
            }
        }
        return null;
    }
    /**
     * Extract symbols from files
     */
    async extractSymbols(files) {
        const symbols = [];
        for (const file of files) {
            try {
                const uri = vscode.Uri.file(file.path);
                const docSymbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
                if (docSymbols) {
                    const extractSymbol = (sym, depth = 0) => {
                        if (depth < 2) {
                            symbols.push({
                                name: sym.name,
                                kind: vscode.SymbolKind[sym.kind],
                                file: file.relativePath,
                                line: sym.range.start.line + 1,
                            });
                            for (const child of sym.children || []) {
                                extractSymbol(child, depth + 1);
                            }
                        }
                    };
                    for (const sym of docSymbols) {
                        extractSymbol(sym);
                    }
                }
            }
            catch {
                // Skip files without symbols
            }
        }
        return symbols;
    }
    /**
     * Parse imports and exports from file content
     */
    parseImportsExports(content, language) {
        const imports = [];
        const exports = [];
        if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(language)) {
            // Import patterns
            const importMatches = content.matchAll(/import\s+(?:\{([^}]+)\}|(\w+))\s+from/g);
            for (const match of importMatches) {
                if (match[1]) {
                    imports.push(...match[1].split(',').map(s => s.trim()));
                }
                else if (match[2]) {
                    imports.push(match[2]);
                }
            }
            // Export patterns
            const exportMatches = content.matchAll(/export\s+(?:const|function|class|interface|type)\s+(\w+)/g);
            for (const match of exportMatches) {
                exports.push(match[1]);
            }
        }
        return { imports, exports };
    }
    /**
     * Generate a summary of the context
     */
    generateContextSummary(files) {
        if (files.length === 0) {
            return 'No relevant context files found';
        }
        const summary = [`Context includes ${files.length} file(s):`];
        for (const file of files.slice(0, 5)) {
            summary.push(`- ${file.relativePath} (${file.reason})`);
        }
        if (files.length > 5) {
            summary.push(`... and ${files.length - 5} more`);
        }
        return summary.join('\n');
    }
    /**
     * Build import graph for the workspace
     */
    async buildImportGraph() {
        const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx,py}', '**/node_modules/**', 500);
        for (const file of files) {
            await this.getImports(file.fsPath);
        }
    }
    /**
     * Invalidate cache for a file
     */
    invalidateCache(filePath) {
        this.fileCache.delete(filePath);
        this.importGraph.delete(filePath);
    }
    /**
     * Format context for AI prompt
     */
    formatForPrompt(context, maxLength = 50000) {
        const parts = [];
        parts.push(`## Context Summary\n${context.summary}\n`);
        if (context.symbols.length > 0) {
            parts.push(`## Key Symbols\n${context.symbols.slice(0, 20).map(s => `- ${s.kind} ${s.name} (${s.file}:${s.line})`).join('\n')}\n`);
        }
        parts.push(`## Files\n`);
        let totalLength = parts.join('').length;
        for (const file of context.files) {
            const fileContent = `### ${file.relativePath}\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n`;
            if (totalLength + fileContent.length > maxLength) {
                // Truncate file content
                const availableSpace = maxLength - totalLength - 100;
                if (availableSpace > 500) {
                    parts.push(`### ${file.relativePath} (truncated)\n\`\`\`${file.language}\n${file.content.slice(0, availableSpace)}\n...\n\`\`\`\n\n`);
                }
                break;
            }
            parts.push(fileContent);
            totalLength += fileContent.length;
        }
        return parts.join('');
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
exports.SmartContextManager = SmartContextManager;
//# sourceMappingURL=smart-context.js.map