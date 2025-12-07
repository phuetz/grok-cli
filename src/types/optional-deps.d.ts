/**
 * Type declarations for optional dependencies
 * These modules may or may not be installed
 */

// node-llama-cpp (optional)
declare module 'node-llama-cpp' {
  export class LlamaModel {
    constructor(options: { modelPath: string; gpuLayers?: number });
  }

  export class LlamaContext {
    constructor(options: { model: LlamaModel; contextSize?: number });
  }

  export class LlamaChatSession {
    constructor(options: { context: LlamaContext; systemPrompt?: string });
    prompt(
      message: string,
      options?: { maxTokens?: number; temperature?: number; onToken?: unknown }
    ): Promise<string>;
  }
}

// @mlc-ai/web-llm (optional)
declare module '@mlc-ai/web-llm' {
  export class MLCEngine {
    reload(
      model: string,
      options?: { initProgressCallback?: (progress: { progress: number; text: string }) => void }
    ): Promise<void>;

    chat: {
      completions: {
        create(options: {
          messages: Array<{ role: string; content: string }>;
          max_tokens?: number;
          temperature?: number;
          stream?: boolean;
        }): Promise<{
          choices: Array<{
            message?: { content: string };
            delta?: { content?: string };
          }>;
          usage?: { total_tokens: number };
        }>;
      };
    };
  }
}
