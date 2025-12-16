"use strict";
/**
 * Inline Completion Provider
 *
 * Provides AI-powered code completions inline in the editor.
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
exports.CodeBuddyCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
class CodeBuddyCompletionProvider {
    constructor(aiClient) {
        this.aiClient = aiClient;
        this.lastRequest = null;
        this.cache = new Map();
        this.debounceTimer = null;
        this.debounceMs = 300;
    }
    async provideInlineCompletionItems(document, position, context, token) {
        // Cancel previous request
        if (this.lastRequest) {
            this.lastRequest.abort();
        }
        this.lastRequest = new AbortController();
        // Get context around cursor
        const prefix = this.getPrefix(document, position);
        const suffix = this.getSuffix(document, position);
        const language = document.languageId;
        // Skip if minimal context
        if (prefix.trim().length < 3) {
            return null;
        }
        // Check cache
        const cacheKey = `${prefix.slice(-100)}|${suffix.slice(0, 50)}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            return [new vscode.InlineCompletionItem(cached, new vscode.Range(position, position))];
        }
        // Debounce
        await this.debounce();
        if (token.isCancellationRequested) {
            return null;
        }
        try {
            const completion = await this.getCompletion(prefix, suffix, language);
            if (token.isCancellationRequested || !completion) {
                return null;
            }
            // Cache result
            this.cache.set(cacheKey, completion);
            // Clear old cache entries
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                if (firstKey) {
                    this.cache.delete(firstKey);
                }
            }
            return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
        }
        catch (error) {
            console.error('Code Buddy completion error:', error);
            return null;
        }
    }
    /**
     * Get completion from AI
     */
    async getCompletion(prefix, suffix, language) {
        const prompt = `Complete the following ${language} code. Return ONLY the completion text, nothing else.

Code before cursor:
\`\`\`${language}
${prefix}
\`\`\`

Code after cursor:
\`\`\`${language}
${suffix}
\`\`\`

Complete the code at the cursor position:`;
        try {
            const response = await this.aiClient.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer. Complete code naturally and concisely. Return ONLY the completion, no explanations or code fences.`,
                },
                { role: 'user', content: prompt },
            ]);
            // Clean up the response
            let completion = response.trim();
            // Remove code fences if present
            if (completion.startsWith('```')) {
                completion = completion.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
            }
            return completion || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Get text before cursor
     */
    getPrefix(document, position) {
        const startLine = Math.max(0, position.line - 50);
        const range = new vscode.Range(startLine, 0, position.line, position.character);
        return document.getText(range);
    }
    /**
     * Get text after cursor
     */
    getSuffix(document, position) {
        const endLine = Math.min(document.lineCount - 1, position.line + 20);
        const range = new vscode.Range(position.line, position.character, endLine, 1000);
        return document.getText(range);
    }
    /**
     * Debounce requests
     */
    debounce() {
        return new Promise(resolve => {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
            this.debounceTimer = setTimeout(resolve, this.debounceMs);
        });
    }
}
exports.CodeBuddyCompletionProvider = CodeBuddyCompletionProvider;
//# sourceMappingURL=completion-provider.js.map