/**
 * Per-Model Tool Configuration (Codex-inspired)
 *
 * Different models get different tool sets and prompt templates
 * based on their capabilities. For example, smaller models might
 * not get complex tools, and some models support specific features
 * like extended thinking or structured outputs.
 */

import { logger } from '../utils/logger.js';

export interface ModelToolConfig {
  /** Model name pattern (glob-like matching) */
  model: string;
  /** Tools to enable for this model (null = all tools) */
  enabledTools?: string[] | null;
  /** Tools to disable for this model */
  disabledTools?: string[];
  /** Maximum tool rounds per turn */
  maxToolRounds?: number;
  /** Whether this model supports extended thinking/reasoning */
  supportsReasoning?: boolean;
  /** Whether this model supports structured tool calls (function calling) */
  supportsToolCalls?: boolean;
  /** Whether this model supports vision/images */
  supportsVision?: boolean;
  /** System prompt template override */
  systemPromptTemplate?: string;
  /** Max output tokens for this model */
  maxOutputTokens?: number;
  /** Context window size */
  contextWindow?: number;
  /** Preferred patch format: 'unified' | 'search_replace' | 'full_file' */
  patchFormat?: 'unified' | 'search_replace' | 'full_file';
}

/**
 * Default per-model configurations.
 * Models are matched by prefix — first match wins.
 */
const DEFAULT_MODEL_CONFIGS: ModelToolConfig[] = [
  // GPT-4/5 class
  {
    model: 'gpt-4*',
    supportsReasoning: false,
    supportsToolCalls: true,
    supportsVision: true,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    patchFormat: 'unified',
  },
  {
    model: 'gpt-5*',
    supportsReasoning: true,
    supportsToolCalls: true,
    supportsVision: true,
    contextWindow: 200000,
    maxOutputTokens: 32768,
    patchFormat: 'unified',
  },

  // Claude models
  {
    model: 'claude-3-5-sonnet*',
    supportsReasoning: false,
    supportsToolCalls: true,
    supportsVision: true,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    patchFormat: 'search_replace',
  },
  {
    model: 'claude-*-4*',
    supportsReasoning: true,
    supportsToolCalls: true,
    supportsVision: true,
    contextWindow: 200000,
    maxOutputTokens: 16384,
    patchFormat: 'search_replace',
  },

  // Grok models
  {
    model: 'grok-4*',
    supportsReasoning: true,
    supportsToolCalls: true,
    supportsVision: true,
    contextWindow: 131072,
    maxOutputTokens: 16384,
    patchFormat: 'search_replace',
  },
  {
    model: 'grok-3*',
    supportsReasoning: false,
    supportsToolCalls: true,
    supportsVision: true,
    contextWindow: 131072,
    maxOutputTokens: 8192,
    patchFormat: 'search_replace',
  },
  {
    model: 'grok-2*',
    supportsReasoning: false,
    supportsToolCalls: true,
    supportsVision: false,
    contextWindow: 131072,
    maxOutputTokens: 4096,
    patchFormat: 'full_file',
  },

  // Gemini
  {
    model: 'gemini-2.5*',
    supportsReasoning: true,
    supportsToolCalls: true,
    supportsVision: true,
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    patchFormat: 'unified',
  },
  {
    model: 'gemini-2*',
    supportsReasoning: false,
    supportsToolCalls: true,
    supportsVision: true,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    patchFormat: 'search_replace',
  },

  // Mistral / Devstral
  {
    model: 'devstral*',
    supportsReasoning: true,
    supportsToolCalls: true,
    supportsVision: false,
    contextWindow: 131072,
    maxOutputTokens: 16384,
    patchFormat: 'search_replace',
  },
  {
    model: 'mistral*',
    supportsReasoning: false,
    supportsToolCalls: true,
    supportsVision: false,
    contextWindow: 32768,
    maxOutputTokens: 4096,
    patchFormat: 'full_file',
  },

  // Ollama / Local models (conservative defaults)
  {
    model: 'ollama/*',
    supportsReasoning: false,
    supportsToolCalls: false,
    supportsVision: false,
    contextWindow: 8192,
    maxOutputTokens: 2048,
    maxToolRounds: 10,
    disabledTools: ['apply_patch', 'browser', 'computer_control'],
    patchFormat: 'full_file',
  },

  // LM Studio (same as Ollama)
  {
    model: 'lmstudio/*',
    supportsReasoning: false,
    supportsToolCalls: false,
    supportsVision: false,
    contextWindow: 8192,
    maxOutputTokens: 2048,
    maxToolRounds: 10,
    disabledTools: ['apply_patch', 'browser', 'computer_control'],
    patchFormat: 'full_file',
  },
];

/**
 * Match a model name against a pattern with glob-like wildcards.
 */
function matchModel(modelName: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    'i'
  );
  return regex.test(modelName);
}

/**
 * Get the tool configuration for a specific model.
 * Falls back to permissive defaults if no match.
 */
export function getModelToolConfig(
  modelName: string,
  customConfigs?: ModelToolConfig[],
): ModelToolConfig {
  const configs = [...(customConfigs || []), ...DEFAULT_MODEL_CONFIGS];

  for (const config of configs) {
    if (matchModel(modelName, config.model)) {
      logger.debug('Model tool config matched', { model: modelName, pattern: config.model });
      return config;
    }
  }

  // Permissive fallback
  logger.debug('No model tool config match, using defaults', { model: modelName });
  return {
    model: modelName,
    supportsReasoning: false,
    supportsToolCalls: true,
    supportsVision: false,
    contextWindow: 32768,
    maxOutputTokens: 4096,
    patchFormat: 'search_replace',
  };
}

/**
 * Filter a list of tool names based on model capabilities.
 */
export function filterToolsForModel(
  toolNames: string[],
  modelConfig: ModelToolConfig,
): string[] {
  let filtered = [...toolNames];

  // Remove disabled tools
  if (modelConfig.disabledTools) {
    filtered = filtered.filter(t => !modelConfig.disabledTools!.includes(t));
  }

  // Keep only enabled tools (if specified)
  if (modelConfig.enabledTools) {
    filtered = filtered.filter(t => modelConfig.enabledTools!.includes(t));
  }

  // Remove vision tools if not supported
  if (!modelConfig.supportsVision) {
    filtered = filtered.filter(t => !['view_image', 'screenshot', 'screen_capture'].includes(t));
  }

  return filtered;
}
