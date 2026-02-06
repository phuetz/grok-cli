/**
 * Intro Hook Manager
 *
 * Manages intro/readme injection at session start.
 * Loads content from files, inline sources, and URLs.
 */

import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";
import { logger } from "../../utils/logger.js";

import type { IntroConfig, IntroSource, IntroResult } from "./types.js";
import { DEFAULT_MOLTBOT_CONFIG } from "./config.js";

/**
 * Manages intro/readme injection at session start
 */
export class IntroHookManager extends EventEmitter {
  private config: IntroConfig;
  private workingDirectory: string;
  private cachedContent: string | null = null;

  constructor(workingDirectory: string, config?: Partial<IntroConfig>) {
    super();
    this.workingDirectory = workingDirectory;
    this.config = { ...DEFAULT_MOLTBOT_CONFIG.intro, ...config };
  }

  /**
   * Load and combine all intro sources
   */
  async loadIntro(): Promise<IntroResult> {
    if (!this.config.enabled) {
      return { content: "", sources: [], truncated: false };
    }

    const sources: string[] = [];
    const contents: { priority: number; content: string; source: string }[] = [];

    // Sort sources by priority
    const sortedSources = [...this.config.sources]
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const source of sortedSources) {
      try {
        const content = await this.loadSource(source);
        if (content) {
          contents.push({
            priority: source.priority,
            content,
            source: source.id,
          });
          sources.push(source.id);
        }
      } catch (error) {
        logger.warn(`Failed to load intro source ${source.id}: ${error}`);
      }
    }

    // Combine contents
    let combined = contents.map(c => c.content).join("\n\n---\n\n");
    let truncated = false;

    // Truncate if needed
    if (this.config.maxLength && combined.length > this.config.maxLength) {
      combined = combined.slice(0, this.config.maxLength) + "\n\n[... truncated ...]";
      truncated = true;
    }

    this.cachedContent = combined;
    this.emit("intro-loaded", { sources, truncated });

    return { content: combined, sources, truncated };
  }

  /**
   * Load content from a single source
   */
  private async loadSource(source: IntroSource): Promise<string | null> {
    switch (source.type) {
      case "inline":
        return source.content || null;

      case "file": {
        if (!source.path) return null;

        // Try absolute path first, then relative to working directory
        let filePath = source.path;
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(this.workingDirectory, filePath);
        }

        if (!fs.existsSync(filePath)) {
          return null;
        }

        return fs.readFileSync(filePath, "utf-8");
      }

      case "url": {
        if (!source.url) return null;

        try {
          const response = await fetch(source.url);
          if (!response.ok) return null;
          return await response.text();
        } catch {
          return null;
        }
      }

      default:
        return null;
    }
  }

  /**
   * Get cached intro content
   */
  getCachedIntro(): string | null {
    return this.cachedContent;
  }

  /**
   * Clear cached content
   */
  clearCache(): void {
    this.cachedContent = null;
  }

  /**
   * Add a new intro source
   */
  addSource(source: IntroSource): void {
    this.config.sources.push(source);
    this.clearCache();
  }

  /**
   * Remove an intro source
   */
  removeSource(id: string): boolean {
    const index = this.config.sources.findIndex(s => s.id === id);
    if (index !== -1) {
      this.config.sources.splice(index, 1);
      this.clearCache();
      return true;
    }
    return false;
  }

  /**
   * Get configuration
   */
  getConfig(): IntroConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IntroConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache();
  }
}
