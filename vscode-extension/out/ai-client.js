"use strict";
/**
 * AI Client for VS Code Extension
 * Supports multiple providers: Grok, Claude, OpenAI, Ollama
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIClient = void 0;
const openai_1 = __importDefault(require("openai"));
class AIClient {
    constructor(config) {
        this.config = config;
        this.client = this.createClient(config);
    }
    createClient(config) {
        const baseURL = config.baseUrl || this.getDefaultBaseUrl(config.provider);
        return new openai_1.default({
            apiKey: config.apiKey,
            baseURL,
        });
    }
    getDefaultBaseUrl(provider) {
        switch (provider) {
            case 'grok':
                return 'https://api.x.ai/v1';
            case 'claude':
                return 'https://api.anthropic.com/v1';
            case 'openai':
                return 'https://api.openai.com/v1';
            case 'ollama':
                return 'http://localhost:11434/v1';
            default:
                return 'https://api.x.ai/v1';
        }
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        if (config.provider || config.apiKey || config.baseUrl) {
            this.client = this.createClient(this.config);
        }
    }
    async chat(messages, options) {
        try {
            // If streaming requested with onChunk callback
            if (options?.stream && options.onChunk) {
                const stream = await this.client.chat.completions.create({
                    model: this.config.model,
                    messages,
                    max_tokens: options.maxTokens || this.config.maxTokens || 4096,
                    temperature: 0.7,
                    stream: true,
                });
                let fullResponse = '';
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        fullResponse += content;
                        options.onChunk(content);
                    }
                }
                return fullResponse;
            }
            // Non-streaming request
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages,
                max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
                temperature: 0.7,
            });
            return response.choices[0]?.message?.content || '';
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`AI API error: ${message}`);
        }
    }
    async *chatStream(messages) {
        try {
            const stream = await this.client.chat.completions.create({
                model: this.config.model,
                messages,
                max_tokens: this.config.maxTokens || 4096,
                temperature: 0.7,
                stream: true,
            });
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    yield content;
                }
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`AI API error: ${message}`);
        }
    }
    async getCompletion(prefix, suffix, language) {
        const response = await this.chat([
            {
                role: 'system',
                content: `You are an expert ${language} developer. Complete the code naturally. Return ONLY the completion, nothing else.`,
            },
            {
                role: 'user',
                content: `Complete this ${language} code:\n\n${prefix}<CURSOR>${suffix}\n\nProvide ONLY the text that should be inserted at <CURSOR>.`,
            },
        ]);
        return response.trim();
    }
    async reviewCode(code, language) {
        const response = await this.chat([
            {
                role: 'system',
                content: `You are an expert code reviewer. Analyze the code for bugs, security issues, and best practice violations. Return a JSON array of issues.`,
            },
            {
                role: 'user',
                content: `Review this ${language} code and return issues as JSON array:
\`\`\`${language}
${code}
\`\`\`

Return format: [{"severity": "error|warning|info", "line": <number>, "message": "<description>", "suggestion": "<fix>"}]

If no issues found, return empty array [].`,
            },
        ]);
        try {
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
    getProvider() {
        return this.config.provider;
    }
    getModel() {
        return this.config.model;
    }
}
exports.AIClient = AIClient;
//# sourceMappingURL=ai-client.js.map