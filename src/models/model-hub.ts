/**
 * Model Hub Integration
 *
 * Auto-download and manage LLM models from HuggingFace Hub.
 * Supports GGUF format for local inference with node-llama-cpp.
 *
 * Features:
 * - Automatic model discovery and download
 * - VRAM-based recommendations
 * - Quantization selection
 * - Progress tracking
 * - Model versioning
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { logger } from "../utils/logger.js";
import { getGPUMonitor } from "../hardware/gpu-monitor.js";

/**
 * Quantization types with their properties
 */
export interface QuantizationType {
  name: string;
  bitsPerWeight: number;
  qualityScore: number; // 1-10
  description: string;
}

/**
 * Available quantization types
 */
export const QUANTIZATION_TYPES: Record<string, QuantizationType> = {
  Q2_K: { name: "Q2_K", bitsPerWeight: 2.5, qualityScore: 3, description: "Smallest, lowest quality" },
  Q3_K_S: { name: "Q3_K_S", bitsPerWeight: 3.0, qualityScore: 4, description: "Small, reduced quality" },
  Q3_K_M: { name: "Q3_K_M", bitsPerWeight: 3.5, qualityScore: 5, description: "Small, moderate quality" },
  Q4_0: { name: "Q4_0", bitsPerWeight: 4.0, qualityScore: 6, description: "Legacy 4-bit" },
  Q4_K_S: { name: "Q4_K_S", bitsPerWeight: 4.0, qualityScore: 7, description: "Small 4-bit, good quality" },
  Q4_K_M: { name: "Q4_K_M", bitsPerWeight: 4.5, qualityScore: 8, description: "Medium 4-bit, recommended" },
  Q5_0: { name: "Q5_0", bitsPerWeight: 5.0, qualityScore: 8, description: "Legacy 5-bit" },
  Q5_K_S: { name: "Q5_K_S", bitsPerWeight: 5.0, qualityScore: 8, description: "Small 5-bit" },
  Q5_K_M: { name: "Q5_K_M", bitsPerWeight: 5.5, qualityScore: 9, description: "Medium 5-bit, high quality" },
  Q6_K: { name: "Q6_K", bitsPerWeight: 6.0, qualityScore: 9, description: "6-bit, very high quality" },
  Q8_0: { name: "Q8_0", bitsPerWeight: 8.0, qualityScore: 10, description: "8-bit, near lossless" },
  F16: { name: "F16", bitsPerWeight: 16.0, qualityScore: 10, description: "Half precision, lossless" },
};

/**
 * Model size categories
 */
export type ModelSize = "1b" | "3b" | "7b" | "8b" | "13b" | "14b" | "30b" | "34b" | "70b";

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  size: ModelSize;
  parameterCount: number; // Billions
  description: string;
  huggingFaceRepo: string;
  defaultQuantization: string;
  supportedQuantizations: string[];
  contextLength: number;
  license: string;
  tags: string[];
}

/**
 * Recommended models for different use cases
 */
export const RECOMMENDED_MODELS: Record<string, ModelInfo> = {
  // Agentic Coding
  "devstral-7b": {
    id: "devstral-7b",
    name: "Devstral 7B",
    size: "7b",
    parameterCount: 7,
    description: "Optimized for agentic coding workflows",
    huggingFaceRepo: "mistralai/Devstral-Small-2505",
    defaultQuantization: "Q4_K_M",
    supportedQuantizations: ["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"],
    contextLength: 32768,
    license: "Apache-2.0",
    tags: ["code", "agentic", "tool-use"],
  },

  // Code-specialized
  "codellama-7b": {
    id: "codellama-7b",
    name: "Code Llama 7B",
    size: "7b",
    parameterCount: 7,
    description: "Meta's code-specialized Llama",
    huggingFaceRepo: "TheBloke/CodeLlama-7B-GGUF",
    defaultQuantization: "Q4_K_M",
    supportedQuantizations: ["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"],
    contextLength: 16384,
    license: "Llama 2",
    tags: ["code", "completion"],
  },

  "deepseek-coder-7b": {
    id: "deepseek-coder-7b",
    name: "DeepSeek Coder 7B",
    size: "7b",
    parameterCount: 7,
    description: "Strong code generation model",
    huggingFaceRepo: "TheBloke/deepseek-coder-6.7B-instruct-GGUF",
    defaultQuantization: "Q4_K_M",
    supportedQuantizations: ["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"],
    contextLength: 16384,
    license: "DeepSeek",
    tags: ["code", "instruct"],
  },

  "qwen-coder-7b": {
    id: "qwen-coder-7b",
    name: "Qwen 2.5 Coder 7B",
    size: "7b",
    parameterCount: 7,
    description: "Alibaba's code model with long context",
    huggingFaceRepo: "Qwen/Qwen2.5-Coder-7B-Instruct-GGUF",
    defaultQuantization: "Q4_K_M",
    supportedQuantizations: ["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"],
    contextLength: 131072,
    license: "Apache-2.0",
    tags: ["code", "long-context", "tool-use"],
  },

  // General purpose
  "llama-3.2-3b": {
    id: "llama-3.2-3b",
    name: "Llama 3.2 3B",
    size: "3b",
    parameterCount: 3,
    description: "Lightweight, fast inference",
    huggingFaceRepo: "bartowski/Llama-3.2-3B-Instruct-GGUF",
    defaultQuantization: "Q4_K_M",
    supportedQuantizations: ["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"],
    contextLength: 131072,
    license: "Llama 3.2",
    tags: ["general", "fast", "tool-use"],
  },

  "mistral-7b": {
    id: "mistral-7b",
    name: "Mistral 7B Instruct",
    size: "7b",
    parameterCount: 7,
    description: "Strong general-purpose model",
    huggingFaceRepo: "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    defaultQuantization: "Q4_K_M",
    supportedQuantizations: ["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"],
    contextLength: 32768,
    license: "Apache-2.0",
    tags: ["general", "instruct"],
  },

  // Structured output
  "granite-3b": {
    id: "granite-3b",
    name: "IBM Granite 3B",
    size: "3b",
    parameterCount: 3,
    description: "Excellent JSON/structured output",
    huggingFaceRepo: "ibm-granite/granite-3.1-3b-a800m-instruct-GGUF",
    defaultQuantization: "Q4_K_M",
    supportedQuantizations: ["Q4_K_M", "Q5_K_M", "Q8_0"],
    contextLength: 8192,
    license: "Apache-2.0",
    tags: ["json", "structured", "rag"],
  },
};

/**
 * Download progress information
 */
export interface DownloadProgress {
  modelId: string;
  fileName: string;
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes/sec
  eta: number; // seconds
}

/**
 * Downloaded model information
 */
export interface DownloadedModel {
  id: string;
  path: string;
  quantization: string;
  sizeBytes: number;
  downloadedAt: Date;
}

/**
 * Model Hub configuration
 */
export interface ModelHubConfig {
  /** Models storage directory */
  modelsDir: string;
  /** HuggingFace API token (optional, for gated models) */
  hfToken?: string;
  /** Download timeout in ms */
  downloadTimeout: number;
  /** Chunk size for streaming download */
  chunkSize: number;
  /** Auto-select quantization based on VRAM */
  autoSelectQuantization: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_MODEL_HUB_CONFIG: ModelHubConfig = {
  modelsDir: path.join(os.homedir(), ".codebuddy", "models"),
  downloadTimeout: 3600000, // 1 hour
  chunkSize: 1024 * 1024, // 1MB
  autoSelectQuantization: true,
};

/**
 * Model Hub Manager
 *
 * Manages model discovery, download, and storage for local inference.
 */
export class ModelHub extends EventEmitter {
  private config: ModelHubConfig;
  private downloadedModels: Map<string, DownloadedModel> = new Map();

  constructor(config: Partial<ModelHubConfig> = {}) {
    super();
    this.config = { ...DEFAULT_MODEL_HUB_CONFIG, ...config };

    // Ensure models directory exists
    if (!fs.existsSync(this.config.modelsDir)) {
      fs.mkdirSync(this.config.modelsDir, { recursive: true });
    }

    // Load existing models
    this.scanLocalModels();
  }

  /**
   * Scan for locally downloaded models
   */
  private scanLocalModels(): void {
    try {
      const files = fs.readdirSync(this.config.modelsDir);

      for (const file of files) {
        if (file.endsWith(".gguf")) {
          const filePath = path.join(this.config.modelsDir, file);
          const stats = fs.statSync(filePath);

          // Extract model info from filename
          const modelId = this.extractModelIdFromFilename(file);
          const quantization = this.extractQuantizationFromFilename(file);

          this.downloadedModels.set(file, {
            id: modelId,
            path: filePath,
            quantization,
            sizeBytes: stats.size,
            downloadedAt: stats.mtime,
          });
        }
      }

      logger.debug(`Found ${this.downloadedModels.size} local models`);
    } catch (error) {
      logger.warn("Failed to scan local models", { error });
    }
  }

  /**
   * Extract model ID from filename
   */
  private extractModelIdFromFilename(filename: string): string {
    // Remove extension and quantization suffix
    let id = filename.replace(".gguf", "");

    // Remove common quantization patterns
    for (const quant of Object.keys(QUANTIZATION_TYPES)) {
      id = id.replace(new RegExp(`[-_.]${quant}$`, "i"), "");
    }

    return id.toLowerCase();
  }

  /**
   * Extract quantization from filename
   */
  private extractQuantizationFromFilename(filename: string): string {
    for (const quant of Object.keys(QUANTIZATION_TYPES)) {
      if (filename.toUpperCase().includes(quant)) {
        return quant;
      }
    }
    return "unknown";
  }

  /**
   * Get recommended model based on available VRAM
   */
  async getRecommendedModel(useCase: "code" | "general" | "fast" = "code"): Promise<ModelInfo | null> {
    const gpuMonitor = getGPUMonitor();
    await gpuMonitor.initialize();
    const stats = await gpuMonitor.getStats();

    const availableVRAM = stats.freeVRAM;

    // Filter models by use case tags
    const candidates = Object.values(RECOMMENDED_MODELS).filter((m) =>
      m.tags.some((t) => t === useCase || t === "tool-use")
    );

    // Sort by size (prefer larger within VRAM budget)
    candidates.sort((a, b) => b.parameterCount - a.parameterCount);

    for (const model of candidates) {
      const estimatedVRAM = this.estimateVRAM(model, "Q4_K_M");
      if (estimatedVRAM < availableVRAM * 0.9) {
        // Leave 10% buffer
        return model;
      }
    }

    // Fallback to smallest model
    return candidates[candidates.length - 1] || null;
  }

  /**
   * Estimate VRAM usage for a model
   */
  estimateVRAM(model: ModelInfo, quantization: string): number {
    const quant = QUANTIZATION_TYPES[quantization];
    if (!quant) return model.parameterCount * 4000; // Default to Q4

    // Formula: params (billions) * bits_per_weight / 8 * 1024 MB
    // Plus overhead (~500MB for KV cache at 4K context)
    const baseVRAM = model.parameterCount * quant.bitsPerWeight * 128; // ~GB to MB
    const overhead = 500 + (model.contextLength / 4096) * 100;

    return baseVRAM + overhead;
  }

  /**
   * Select best quantization for available VRAM
   */
  async selectQuantization(model: ModelInfo, targetVRAM?: number): Promise<string> {
    if (!this.config.autoSelectQuantization) {
      return model.defaultQuantization;
    }

    // Get available VRAM if not specified
    if (!targetVRAM) {
      const gpuMonitor = getGPUMonitor();
      await gpuMonitor.initialize();
      const stats = await gpuMonitor.getStats();
      targetVRAM = stats.freeVRAM * 0.85; // 15% safety margin
    }

    // Try quantizations from highest quality to lowest
    const sortedQuants = model.supportedQuantizations.sort((a, b) => {
      const qa = QUANTIZATION_TYPES[a];
      const qb = QUANTIZATION_TYPES[b];
      return (qb?.qualityScore || 0) - (qa?.qualityScore || 0);
    });

    for (const quant of sortedQuants) {
      const estimatedVRAM = this.estimateVRAM(model, quant);
      if (estimatedVRAM <= targetVRAM) {
        return quant;
      }
    }

    // Return lowest quality if nothing fits
    return sortedQuants[sortedQuants.length - 1] || model.defaultQuantization;
  }

  /**
   * Download a model from HuggingFace
   */
  async download(
    modelId: string,
    quantization?: string
  ): Promise<DownloadedModel> {
    const model = RECOMMENDED_MODELS[modelId];
    if (!model) {
      throw new Error(`Unknown model: ${modelId}. Use listModels() to see available models.`);
    }

    // Select quantization if not specified
    const selectedQuant = quantization || await this.selectQuantization(model);

    // Check if already downloaded
    const existingKey = Array.from(this.downloadedModels.keys()).find(
      (k) => k.includes(modelId) && k.includes(selectedQuant)
    );
    if (existingKey) {
      logger.info(`Model already downloaded: ${existingKey}`);
      return this.downloadedModels.get(existingKey)!;
    }

    // Construct download URL
    const fileName = `${model.id}-${selectedQuant}.gguf`;
    const filePath = path.join(this.config.modelsDir, fileName);

    // Try to find the actual file URL from HuggingFace
    const fileUrl = await this.resolveDownloadUrl(model, selectedQuant);

    this.emit("download:start", { modelId, fileName, quantization: selectedQuant });
    logger.info(`Downloading ${fileName}...`);

    try {
      await this.downloadFile(fileUrl, filePath, fileName);

      const stats = fs.statSync(filePath);
      const downloadedModel: DownloadedModel = {
        id: modelId,
        path: filePath,
        quantization: selectedQuant,
        sizeBytes: stats.size,
        downloadedAt: new Date(),
      };

      this.downloadedModels.set(fileName, downloadedModel);
      this.emit("download:complete", downloadedModel);

      logger.info(`Downloaded ${fileName} (${(stats.size / 1e9).toFixed(2)} GB)`);
      return downloadedModel;
    } catch (error) {
      this.emit("download:error", { modelId, error });
      throw error;
    }
  }

  /**
   * Resolve the actual download URL from HuggingFace
   */
  private async resolveDownloadUrl(model: ModelInfo, quantization: string): Promise<string> {
    // Try common GGUF filename patterns
    const patterns = [
      `${model.name.toLowerCase().replace(/ /g, "-")}-${quantization.toLowerCase()}.gguf`,
      `${model.name.toLowerCase().replace(/ /g, "-")}.${quantization}.gguf`,
      `${model.id}-${quantization.toLowerCase()}.gguf`,
    ];

    const baseUrl = `https://huggingface.co/${model.huggingFaceRepo}/resolve/main`;

    // Try each pattern
    for (const pattern of patterns) {
      const url = `${baseUrl}/${pattern}`;
      try {
        const response = await fetch(url, { method: "HEAD" });
        if (response.ok) {
          return url;
        }
      } catch {
        // Try next pattern
      }
    }

    // Fallback to listing files API
    try {
      const listUrl = `https://huggingface.co/api/models/${model.huggingFaceRepo}/tree/main`;
      const response = await fetch(listUrl);

      if (response.ok) {
        const files = await response.json();
        const ggufFile = files.find(
          (f: { path: string }) =>
            f.path.endsWith(".gguf") &&
            f.path.toUpperCase().includes(quantization)
        );

        if (ggufFile) {
          return `${baseUrl}/${ggufFile.path}`;
        }
      }
    } catch {
      // Ignore API errors
    }

    // Last resort: construct best-guess URL
    return `${baseUrl}/${model.id.replace(/-/g, "_")}-${quantization.toLowerCase()}.gguf`;
  }

  /**
   * Download file with progress tracking
   */
  private async downloadFile(
    url: string,
    filePath: string,
    fileName: string
  ): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.config.hfToken) {
      headers["Authorization"] = `Bearer ${this.config.hfToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const totalBytes = parseInt(response.headers.get("content-length") || "0");
    let downloadedBytes = 0;
    const startTime = Date.now();

    const fileStream = fs.createWriteStream(filePath);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        fileStream.write(Buffer.from(value));
        downloadedBytes += value.length;

        const elapsed = (Date.now() - startTime) / 1000;
        const speed = downloadedBytes / elapsed;
        const remaining = totalBytes - downloadedBytes;
        const eta = speed > 0 ? remaining / speed : 0;

        const progress: DownloadProgress = {
          modelId: fileName,
          fileName,
          downloadedBytes,
          totalBytes,
          percentage: totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0,
          speed,
          eta,
        };

        this.emit("download:progress", progress);
      }

      fileStream.end();
    } catch (error) {
      fileStream.end();
      fs.unlinkSync(filePath); // Clean up partial download
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Delete a downloaded model
   */
  delete(fileName: string): boolean {
    const model = this.downloadedModels.get(fileName);
    if (!model) return false;

    try {
      fs.unlinkSync(model.path);
      this.downloadedModels.delete(fileName);
      this.emit("delete", { fileName });
      return true;
    } catch (error) {
      logger.warn(`Failed to delete model: ${fileName}`, { error });
      return false;
    }
  }

  /**
   * List available models from registry
   */
  listModels(): ModelInfo[] {
    return Object.values(RECOMMENDED_MODELS);
  }

  /**
   * List downloaded models
   */
  listDownloaded(): DownloadedModel[] {
    return Array.from(this.downloadedModels.values());
  }

  /**
   * Get model info by ID
   */
  getModelInfo(modelId: string): ModelInfo | null {
    return RECOMMENDED_MODELS[modelId] || null;
  }

  /**
   * Get downloaded model by filename or ID
   */
  getDownloaded(fileNameOrId: string): DownloadedModel | null {
    // Try exact match first
    const exact = this.downloadedModels.get(fileNameOrId);
    if (exact) return exact;

    // Try partial match
    for (const [key, model] of this.downloadedModels) {
      if (key.includes(fileNameOrId) || model.id === fileNameOrId) {
        return model;
      }
    }

    return null;
  }

  /**
   * Format model list for display
   */
  formatModelList(): string {
    const lines = ["📦 Available Models", ""];

    for (const model of this.listModels()) {
      const downloaded = this.getDownloaded(model.id);
      const status = downloaded ? "✅" : "⬇️";

      lines.push(`  ${status} ${model.name} (${model.size.toUpperCase()})`);
      lines.push(`     ${model.description}`);
      lines.push(`     Context: ${model.contextLength.toLocaleString()} | License: ${model.license}`);

      if (downloaded) {
        const sizeMB = (downloaded.sizeBytes / 1e6).toFixed(0);
        lines.push(`     Downloaded: ${downloaded.quantization} (${sizeMB}MB)`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Format VRAM recommendations
   */
  async formatRecommendations(): Promise<string> {
    const gpuMonitor = getGPUMonitor();
    await gpuMonitor.initialize();
    const stats = await gpuMonitor.getStats();

    const lines = [
      "🎯 Model Recommendations",
      "",
      `  Available VRAM: ${stats.freeVRAM.toLocaleString()}MB`,
      "",
    ];

    for (const model of this.listModels()) {
      const quant = await this.selectQuantization(model);
      const vram = this.estimateVRAM(model, quant);
      const fits = vram < stats.freeVRAM * 0.9;

      const icon = fits ? "✅" : "❌";
      lines.push(`  ${icon} ${model.name}`);
      lines.push(`     Best quant: ${quant} (~${Math.round(vram)}MB)`);
    }

    return lines.join("\n");
  }

  /**
   * Get configuration
   */
  getConfig(): ModelHubConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ModelHubConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Dispose hub
   */
  dispose(): void {
    this.removeAllListeners();
  }
}

// Singleton instance
let modelHubInstance: ModelHub | null = null;

/**
 * Get or create model hub instance
 */
export function getModelHub(config?: Partial<ModelHubConfig>): ModelHub {
  if (!modelHubInstance) {
    modelHubInstance = new ModelHub(config);
  }
  return modelHubInstance;
}

/**
 * Reset model hub singleton
 */
export function resetModelHub(): void {
  if (modelHubInstance) {
    modelHubInstance.dispose();
    modelHubInstance = null;
  }
}

export default {
  ModelHub,
  getModelHub,
  resetModelHub,
  RECOMMENDED_MODELS,
  QUANTIZATION_TYPES,
  DEFAULT_MODEL_HUB_CONFIG,
};
