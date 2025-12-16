/**
 * Grok Client for VS Code Extension
 */
export interface GrokMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface GrokClientConfig {
    apiKey: string;
    model: string;
    baseURL?: string;
    maxTokens?: number;
}
export declare class GrokClient {
    private client;
    private model;
    private maxTokens;
    constructor(apiKey: string, model?: string, baseURL?: string);
    /**
     * Update client configuration
     */
    updateConfig(config: Partial<GrokClientConfig>): void;
    /**
     * Send a chat message and get response
     */
    chat(messages: GrokMessage[]): Promise<string>;
    /**
     * Stream a chat response
     */
    chatStream(messages: GrokMessage[]): AsyncGenerator<string, void, unknown>;
    /**
     * Get inline completion
     */
    getCompletion(prefix: string, suffix: string, language: string): Promise<string>;
    /**
     * Review code for issues
     */
    reviewCode(code: string, language: string): Promise<Array<{
        severity: 'error' | 'warning' | 'info';
        line: number;
        message: string;
        suggestion?: string;
    }>>;
    /**
     * Get current model
     */
    getModel(): string;
}
//# sourceMappingURL=grok-client.d.ts.map