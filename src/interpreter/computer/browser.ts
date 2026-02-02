/**
 * Computer Browser Module
 *
 * Silent web search and browser automation without opening visible windows.
 * Inspired by Open Interpreter's computer.browser capabilities.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export interface SearchOptions {
  /** Number of results to return (default: 10) */
  numResults?: number;
  /** Search engine to use */
  engine?: 'google' | 'bing' | 'duckduckgo' | 'serper';
  /** Filter by site */
  site?: string;
  /** Filter by file type */
  fileType?: string;
  /** Time range filter */
  timeRange?: 'day' | 'week' | 'month' | 'year';
  /** Country/region */
  region?: string;
  /** Language */
  language?: string;
  /** Safe search */
  safeSearch?: boolean;
}

export interface PageContent {
  url: string;
  title: string;
  content: string;
  links: Array<{ text: string; url: string }>;
  images: Array<{ alt: string; src: string }>;
  metadata: Record<string, string>;
}

export interface FetchOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Include images */
  includeImages?: boolean;
  /** Include links */
  includeLinks?: boolean;
  /** Maximum content length */
  maxLength?: number;
  /** User agent */
  userAgent?: string;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface BrowserConfig {
  /** Default search engine */
  defaultEngine: 'google' | 'bing' | 'duckduckgo' | 'serper';
  /** Serper API key (for serper.dev) */
  serperApiKey?: string;
  /** Default timeout */
  defaultTimeout: number;
  /** Default number of results */
  defaultNumResults: number;
  /** Cache enabled */
  cacheEnabled: boolean;
  /** Cache TTL in seconds */
  cacheTTL: number;
}

export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  defaultEngine: 'duckduckgo',
  defaultTimeout: 30000,
  defaultNumResults: 10,
  cacheEnabled: true,
  cacheTTL: 3600,
};

// ============================================================================
// Computer Browser Class
// ============================================================================

export class ComputerBrowser extends EventEmitter {
  private config: BrowserConfig;
  private cache: Map<string, { result: unknown; expires: number }> = new Map();

  constructor(config: Partial<BrowserConfig> = {}) {
    super();
    this.config = { ...DEFAULT_BROWSER_CONFIG, ...config };
  }

  // ==========================================================================
  // Search Methods
  // ==========================================================================

  /**
   * Perform a silent web search
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const opts = {
      numResults: options.numResults || this.config.defaultNumResults,
      engine: options.engine || this.config.defaultEngine,
      ...options,
    };

    // Check cache
    const cacheKey = this.getCacheKey('search', query, opts);
    const cached = this.getFromCache<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let results: SearchResult[];

    switch (opts.engine) {
      case 'serper':
        results = await this.searchSerper(query, opts);
        break;
      case 'duckduckgo':
        results = await this.searchDuckDuckGo(query, opts);
        break;
      case 'google':
      case 'bing':
      default:
        // Fallback to DuckDuckGo for free search
        results = await this.searchDuckDuckGo(query, opts);
        break;
    }

    // Cache results
    this.setCache(cacheKey, results);

    this.emit('search', { query, results: results.length });

    return results;
  }

  /**
   * Search using Serper.dev API
   */
  private async searchSerper(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const apiKey = this.config.serperApiKey || process.env.SERPER_API_KEY;

    if (!apiKey) {
      throw new Error('Serper API key required. Set SERPER_API_KEY environment variable.');
    }

    const body: Record<string, unknown> = {
      q: query,
      num: options.numResults || 10,
    };

    if (options.site) {
      body.q = `site:${options.site} ${query}`;
    }

    if (options.region) {
      body.gl = options.region;
    }

    if (options.language) {
      body.hl = options.language;
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Serper search failed: ${response.status}`);
    }

    const data = await response.json() as {
      organic?: Array<{
        title: string;
        link: string;
        snippet: string;
        position: number;
      }>;
    };

    return (data.organic || []).map((item, index) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      position: item.position || index + 1,
    }));
  }

  /**
   * Search using DuckDuckGo (free, no API key required)
   */
  private async searchDuckDuckGo(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Use DuckDuckGo HTML search (no API key needed)
    let searchQuery = query;

    if (options.site) {
      searchQuery = `site:${options.site} ${query}`;
    }

    if (options.fileType) {
      searchQuery = `filetype:${options.fileType} ${query}`;
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`);
    }

    const html = await response.text();
    return this.parseDuckDuckGoResults(html, options.numResults || 10);
  }

  /**
   * Parse DuckDuckGo HTML results
   */
  private parseDuckDuckGoResults(html: string, limit: number): SearchResult[] {
    const results: SearchResult[] = [];

    // Simple regex parsing for DuckDuckGo results
    const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi;

    let match;
    let position = 1;

    while ((match = resultPattern.exec(html)) !== null && results.length < limit) {
      const [, url, title, snippet] = match;

      // Decode DuckDuckGo redirect URLs
      let actualUrl = url;
      if (url.includes('uddg=')) {
        const uddgMatch = url.match(/uddg=([^&]*)/);
        if (uddgMatch) {
          actualUrl = decodeURIComponent(uddgMatch[1]);
        }
      }

      results.push({
        title: this.decodeHtmlEntities(title.trim()),
        url: actualUrl,
        snippet: this.decodeHtmlEntities(snippet.trim()),
        position: position++,
      });
    }

    // Fallback: try alternative pattern
    if (results.length === 0) {
      const altPattern = /<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)/gi;

      while ((match = altPattern.exec(html)) !== null && results.length < limit) {
        const [, url, title, snippet] = match;

        results.push({
          title: this.decodeHtmlEntities(title.trim()),
          url: url,
          snippet: this.decodeHtmlEntities(snippet.trim()),
          position: position++,
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // Fetch Methods
  // ==========================================================================

  /**
   * Fetch and parse a web page
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<PageContent> {
    const opts = {
      timeout: options.timeout || this.config.defaultTimeout,
      includeImages: options.includeImages ?? true,
      includeLinks: options.includeLinks ?? true,
      maxLength: options.maxLength || 50000,
      userAgent: options.userAgent || 'Mozilla/5.0 (compatible; CodeBuddy/1.0)',
      ...options,
    };

    // Check cache
    const cacheKey = this.getCacheKey('fetch', url, opts);
    const cached = this.getFromCache<PageContent>(cacheKey);
    if (cached) {
      return cached;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': opts.userAgent,
          ...opts.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const content = this.parseHtml(html, url, opts);

      // Truncate if needed
      if (content.content.length > opts.maxLength) {
        content.content = content.content.substring(0, opts.maxLength) + '...';
      }

      // Cache result
      this.setCache(cacheKey, content);

      this.emit('fetch', { url, contentLength: content.content.length });

      return content;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse HTML and extract content
   */
  private parseHtml(html: string, url: string, options: FetchOptions): PageContent {
    const content: PageContent = {
      url,
      title: '',
      content: '',
      links: [],
      images: [],
      metadata: {},
    };

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      content.title = this.decodeHtmlEntities(titleMatch[1].trim());
    }

    // Extract metadata
    const metaPattern = /<meta[^>]*name="([^"]*)"[^>]*content="([^"]*)"[^>]*>/gi;
    let metaMatch;
    while ((metaMatch = metaPattern.exec(html)) !== null) {
      content.metadata[metaMatch[1]] = this.decodeHtmlEntities(metaMatch[2]);
    }

    // Extract main content (remove scripts, styles, etc.)
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Extract text content
    content.content = cleanHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract links
    if (options.includeLinks) {
      const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
      let linkMatch;
      while ((linkMatch = linkPattern.exec(html)) !== null && content.links.length < 50) {
        const href = linkMatch[1];
        const text = this.decodeHtmlEntities(linkMatch[2].trim());

        if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
          content.links.push({
            text,
            url: this.resolveUrl(href, url),
          });
        }
      }
    }

    // Extract images
    if (options.includeImages) {
      const imgPattern = /<img[^>]*src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi;
      let imgMatch;
      while ((imgMatch = imgPattern.exec(html)) !== null && content.images.length < 20) {
        const src = imgMatch[1];
        const alt = imgMatch[2] || '';

        if (src && !src.startsWith('data:')) {
          content.images.push({
            src: this.resolveUrl(src, url),
            alt: this.decodeHtmlEntities(alt),
          });
        }
      }
    }

    return content;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(type: string, key: string, options: unknown): string {
    return `${type}:${key}:${JSON.stringify(options)}`;
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    if (!this.config.cacheEnabled) {
      return null;
    }

    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.result as T;
    }

    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, result: unknown): void {
    if (!this.config.cacheEnabled) {
      return;
    }

    this.cache.set(key, {
      result,
      expires: Date.now() + this.config.cacheTTL * 1000,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Configure browser
   */
  configure(config: Partial<BrowserConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let browserInstance: ComputerBrowser | null = null;

export function getComputerBrowser(config?: Partial<BrowserConfig>): ComputerBrowser {
  if (!browserInstance) {
    browserInstance = new ComputerBrowser(config);
  }
  return browserInstance;
}

export function resetComputerBrowser(): void {
  browserInstance = null;
}

export default ComputerBrowser;
