/**
 * Unified AI Provider Interface
 *
 * Provides a common interface for different AI backends:
 * - Grok (xAI) - Default
 * - Claude (Anthropic)
 * - ChatGPT (OpenAI)
 */

import { EventEmitter } from 'events';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: AIToolCall[];
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, AIToolParameter>;
      required: string[];
    };
  };
}

export interface AIToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: AIToolParameter;
  properties?: Record<string, AIToolParameter>;
  required?: string[];
  default?: unknown;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: AITool[];
  toolChoice?: 'auto' | 'none' | 'required';
  stream?: boolean;
}

export interface AICompletionResponse {
  id: string;
  content: string | null;
  toolCalls?: AIToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIStreamChunk {
  id: string;
  delta: {
    content?: string;
    toolCalls?: Partial<AIToolCall>[];
  };
  finishReason?: string;
}

export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
}

export type AIProviderType = 'grok' | 'claude' | 'chatgpt' | 'ollama';

/**
 * Abstract AI Provider interface
 */
export abstract class AIProvider extends EventEmitter {
  protected config: AIProviderConfig;
  protected currentModel: string;

  constructor(config: AIProviderConfig, defaultModel: string) {
    super();
    this.config = config;
    this.currentModel = config.model || defaultModel;
  }

  /**
   * Get provider name
   */
  abstract get name(): AIProviderType;

  /**
   * Get available models for this provider
   */
  abstract getAvailableModels(): string[];

  /**
   * Get current model
   */
  getModel(): string {
    return this.currentModel;
  }

  /**
   * Set current model
   */
  setModel(model: string): void {
    if (!this.getAvailableModels().includes(model)) {
      console.warn(`Model '${model}' may not be supported by ${this.name}`);
    }
    this.currentModel = model;
  }

  /**
   * Send a chat completion request
   */
  abstract chat(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse>;

  /**
   * Send a streaming chat completion request
   */
  abstract chatStream(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): AsyncGenerator<AIStreamChunk, void, unknown>;

  /**
   * Check if the provider supports function calling/tools
   */
  abstract supportsTools(): boolean;

  /**
   * Validate API key and connection
   */
  abstract validateConnection(): Promise<boolean>;

  /**
   * Get token count estimate for messages
   */
  abstract estimateTokens(messages: AIMessage[]): number;

  /**
   * Get max context window for current model
   */
  abstract getMaxContextTokens(): number;
}

/**
 * Provider factory function type
 */
export type AIProviderFactory = (config: AIProviderConfig) => AIProvider;

/**
 * Provider registry
 */
const providerRegistry: Map<AIProviderType, AIProviderFactory> = new Map();

/**
 * Register a provider factory
 */
export function registerProvider(type: AIProviderType, factory: AIProviderFactory): void {
  providerRegistry.set(type, factory);
}

/**
 * Create a provider instance
 */
export function createProvider(type: AIProviderType, config: AIProviderConfig): AIProvider {
  const factory = providerRegistry.get(type);
  if (!factory) {
    throw new Error(`Unknown AI provider: ${type}. Available: ${Array.from(providerRegistry.keys()).join(', ')}`);
  }
  return factory(config);
}

/**
 * Get registered provider types
 */
export function getRegisteredProviders(): AIProviderType[] {
  return Array.from(providerRegistry.keys());
}

export default AIProvider;
