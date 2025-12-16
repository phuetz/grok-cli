/**
 * AI Client for VS Code Extension
 * Supports multiple providers: Grok, Claude, OpenAI, Ollama
 */
export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface AIClientConfig {
    provider: string;
    apiKey: string;
    model: string;
    baseUrl?: string;
    maxTokens?: number;
}
export declare class AIClient {
    private client;
    private config;
    constructor(config: AIClientConfig);
    private createClient;
    private getDefaultBaseUrl;
    updateConfig(config: Partial<AIClientConfig>): void;
    chat(messages: AIMessage[], options?: {
        stream?: boolean;
        maxTokens?: number;
        onChunk?: (chunk: string) => void;
    }): Promise<string>;
    chatStream(messages: AIMessage[]): AsyncGenerator<string, void, unknown>;
    getCompletion(prefix: string, suffix: string, language: string): Promise<string>;
    reviewCode(code: string, language: string): Promise<Array<{
        severity: 'error' | 'warning' | 'info';
        line: number;
        message: string;
        suggestion?: string;
    }>>;
    getProvider(): string;
    getModel(): string;
}
//# sourceMappingURL=ai-client.d.ts.map