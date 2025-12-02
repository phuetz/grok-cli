import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionChunk } from "openai/resources/chat";
import { validateModel, getModelInfo } from "../utils/model-utils.js";

export type GrokMessage = ChatCompletionMessageParam;

/** JSON Schema property definition */
export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  default?: unknown;
}

export interface GrokTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, JsonSchemaProperty>;
      required: string[];
    };
  };
}

/** Chat completion request payload */
interface ChatRequestPayload {
  model: string;
  messages: GrokMessage[];
  tools: GrokTool[];
  tool_choice?: "auto" | "none" | "required";
  temperature: number;
  max_tokens: number;
  stream?: boolean;
  search_parameters?: SearchParameters;
}

export interface GrokToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface SearchParameters {
  mode?: "auto" | "on" | "off";
  // sources removed - let API use default sources to avoid format issues
}

export interface SearchOptions {
  search_parameters?: SearchParameters;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  searchOptions?: SearchOptions;
}

export interface GrokResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: GrokToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GrokClient {
  private client: OpenAI;
  private currentModel: string = "grok-code-fast-1";
  private defaultMaxTokens: number;
  private baseURL: string;

  constructor(apiKey: string, model?: string, baseURL?: string) {
    this.baseURL = baseURL || process.env.GROK_BASE_URL || "https://api.x.ai/v1";
    this.client = new OpenAI({
      apiKey,
      baseURL: this.baseURL,
      timeout: 360000,
    });
    const envMax = Number(process.env.GROK_MAX_TOKENS);
    this.defaultMaxTokens = Number.isFinite(envMax) && envMax > 0 ? envMax : 1536;
    if (model) {
      // Validate model (non-strict to allow custom models)
      validateModel(model, false);
      this.currentModel = model;

      // Log warning if model is not officially supported
      const modelInfo = getModelInfo(model);
      if (!modelInfo.isSupported) {
        console.warn(
          `Warning: Model '${model}' is not officially supported. Using default token limits.`
        );
      }
    }
  }

  /**
   * Models known to support function calling / tool use
   */
  private static readonly FUNCTION_CALLING_MODELS = [
    'hermes',        // Hermes 2 Pro, Hermes 3, Hermes 4
    'functionary',   // MeetKai Functionary
    'gorilla',       // Gorilla OpenFunctions
    'nexusraven',    // NexusRaven
    'firefunction',  // FireFunction
    'toolllama',     // ToolLLaMA
    'glaive',        // Glaive function calling
    'llama-3.1',     // Llama 3.1 has native tool support
    'llama-3.2',     // Llama 3.2 has native tool support
    'llama3.1',      // Alternative naming
    'llama3.2',      // Alternative naming
    'qwen2.5',       // Qwen 2.5 supports tools
    'qwen-2.5',      // Alternative naming
    'mistral',       // Mistral models support function calling
    'mixtral',       // Mixtral supports function calling
    'command-r',     // Cohere Command-R
  ];

  /**
   * Check if the current model supports function calling based on its name
   */
  private modelSupportsFunctionCalling(): boolean {
    const modelLower = this.currentModel.toLowerCase();
    return GrokClient.FUNCTION_CALLING_MODELS.some(pattern =>
      modelLower.includes(pattern)
    );
  }

  /**
   * Check if using LM Studio or other local inference server
   * Can be overridden with GROK_FORCE_TOOLS=true for models that support function calling
   * Auto-enables tools for models known to support function calling
   */
  private isLocalInference(): boolean {
    // Allow forcing tools for local models that support function calling
    if (process.env.GROK_FORCE_TOOLS === 'true') {
      return false;
    }

    // Auto-detect function calling support based on model name
    if (this.modelSupportsFunctionCalling()) {
      return false; // Enable tools for this model
    }

    const modelInfo = getModelInfo(this.currentModel);
    // Check if provider is lmstudio or if baseURL points to common local servers
    if (modelInfo.provider === 'lmstudio') return true;
    if (this.baseURL.includes('localhost:1234')) return true;
    if (this.baseURL.includes('127.0.0.1:1234')) return true;
    if (this.baseURL.match(/10\.\d+\.\d+\.\d+:1234/)) return true; // LAN IP with LM Studio port
    return false;
  }

  setModel(model: string): void {
    // Validate model (non-strict to allow custom models)
    validateModel(model, false);

    const modelInfo = getModelInfo(model);
    if (!modelInfo.isSupported) {
      console.warn(
        `Warning: Model '${model}' is not officially supported. Using default token limits.`
      );
    }

    this.currentModel = model;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async chat(
    messages: GrokMessage[],
    tools?: GrokTool[],
    options?: string | ChatOptions,
    searchOptions?: SearchOptions
  ): Promise<GrokResponse> {
    try {
      // Support both old signature (model as string) and new signature (options object)
      const opts: ChatOptions = typeof options === "string"
        ? { model: options, searchOptions }
        : options || {};

      // Disable tools for local inference (LM Studio) as they may not support function calling
      const useTools = !this.isLocalInference() && tools && tools.length > 0;

      const requestPayload: ChatRequestPayload = {
        model: opts.model || this.currentModel,
        messages,
        tools: useTools ? tools : [],
        tool_choice: useTools ? "auto" : undefined,
        temperature: opts.temperature ?? 0.7,
        max_tokens: this.defaultMaxTokens,
      };

      // Add search parameters if specified (skip for local inference)
      const searchOpts = opts.searchOptions || searchOptions;
      if (searchOpts?.search_parameters && !this.isLocalInference()) {
        requestPayload.search_parameters = searchOpts.search_parameters;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await this.client.chat.completions.create(requestPayload as any);

      return response as GrokResponse;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Grok API error: ${message}`);
    }
  }

  async *chatStream(
    messages: GrokMessage[],
    tools?: GrokTool[],
    options?: string | ChatOptions,
    searchOptions?: SearchOptions
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    try {
      // Support both old signature (model as string) and new signature (options object)
      const opts: ChatOptions = typeof options === "string"
        ? { model: options, searchOptions }
        : options || {};

      // Disable tools for local inference (LM Studio) as they may not support function calling
      const useTools = !this.isLocalInference() && tools && tools.length > 0;

      const requestPayload: ChatRequestPayload = {
        model: opts.model || this.currentModel,
        messages,
        tools: useTools ? tools : [],
        tool_choice: useTools ? "auto" : undefined,
        temperature: opts.temperature ?? 0.7,
        max_tokens: this.defaultMaxTokens,
        stream: true,
      };

      // Add search parameters if specified (skip for local inference)
      const searchOpts = opts.searchOptions || searchOptions;
      if (searchOpts?.search_parameters && !this.isLocalInference()) {
        requestPayload.search_parameters = searchOpts.search_parameters;
      }

      const stream = await this.client.chat.completions.create({
        ...requestPayload,
        stream: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      for await (const chunk of stream as unknown as AsyncIterable<ChatCompletionChunk>) {
        yield chunk;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Grok API error: ${message}`);
    }
  }

  async search(
    query: string,
    searchParameters?: SearchParameters
  ): Promise<GrokResponse> {
    const searchMessage: GrokMessage = {
      role: "user",
      content: query,
    };

    const searchOptions: SearchOptions = {
      search_parameters: searchParameters || { mode: "on" },
    };

    return this.chat([searchMessage], [], undefined, searchOptions);
  }
}
