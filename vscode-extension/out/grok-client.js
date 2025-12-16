"use strict";
/**
 * Grok Client for VS Code Extension
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrokClient = void 0;
const openai_1 = __importDefault(require("openai"));
class GrokClient {
    constructor(apiKey, model = 'grok-3-latest', baseURL) {
        this.client = new openai_1.default({
            apiKey,
            baseURL: baseURL || 'https://api.x.ai/v1',
        });
        this.model = model;
        this.maxTokens = 4096;
    }
    /**
     * Update client configuration
     */
    updateConfig(config) {
        if (config.apiKey) {
            this.client = new openai_1.default({
                apiKey: config.apiKey,
                baseURL: config.baseURL || 'https://api.x.ai/v1',
            });
        }
        if (config.model) {
            this.model = config.model;
        }
        if (config.maxTokens) {
            this.maxTokens = config.maxTokens;
        }
    }
    /**
     * Send a chat message and get response
     */
    async chat(messages) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages,
                max_tokens: this.maxTokens,
                temperature: 0.7,
            });
            return response.choices[0]?.message?.content || '';
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Grok API error: ${message}`);
        }
    }
    /**
     * Stream a chat response
     */
    async *chatStream(messages) {
        try {
            const stream = await this.client.chat.completions.create({
                model: this.model,
                messages,
                max_tokens: this.maxTokens,
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
            throw new Error(`Grok API error: ${message}`);
        }
    }
    /**
     * Get inline completion
     */
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
    /**
     * Review code for issues
     */
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
    /**
     * Get current model
     */
    getModel() {
        return this.model;
    }
}
exports.GrokClient = GrokClient;
//# sourceMappingURL=grok-client.js.map