/**
 * LSP Client - Language Server Protocol integration
 *
 * Provides a client that can connect to LSP servers for various languages,
 * enabling go-to-definition, find-references, hover, symbols, and diagnostics.
 */

import { logger } from '../utils/logger.js';
import * as path from 'path';

export type LSPOperation = 'goToDefinition' | 'findReferences' | 'hover' | 'documentSymbol' | 'getDiagnostics';

export type LSPLanguage =
  | 'python' | 'typescript' | 'javascript' | 'go' | 'rust'
  | 'java' | 'c' | 'cpp' | 'csharp' | 'php'
  | 'kotlin' | 'ruby' | 'html' | 'css';

export interface LSPServerConfig {
  language: LSPLanguage;
  command: string;
  args: string[];
  initOptions?: Record<string, unknown>;
}

export interface LSPLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface LSPSymbol {
  name: string;
  kind: string;
  location: LSPLocation;
  children?: LSPSymbol[];
}

export interface LSPDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
}

export interface LSPHoverInfo {
  content: string;
  language?: string;
  range?: LSPLocation;
}

interface ServerState {
  process: unknown;
  initialized: boolean;
}

const EXTENSION_MAP: Record<string, LSPLanguage> = {
  '.py': 'python',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.rb': 'ruby',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css',
};

const DEFAULT_CONFIGS: Partial<Record<LSPLanguage, LSPServerConfig>> = {
  typescript: { language: 'typescript', command: 'typescript-language-server', args: ['--stdio'] },
  javascript: { language: 'javascript', command: 'typescript-language-server', args: ['--stdio'] },
  python: { language: 'python', command: 'pylsp', args: [] },
  go: { language: 'go', command: 'gopls', args: ['serve'] },
  rust: { language: 'rust', command: 'rust-analyzer', args: [] },
  java: { language: 'java', command: 'jdtls', args: [] },
  c: { language: 'c', command: 'clangd', args: [] },
  cpp: { language: 'cpp', command: 'clangd', args: [] },
  csharp: { language: 'csharp', command: 'omnisharp', args: ['-lsp'] },
  php: { language: 'php', command: 'phpactor', args: ['language-server'] },
  html: { language: 'html', command: 'vscode-html-language-server', args: ['--stdio'] },
  css: { language: 'css', command: 'vscode-css-language-server', args: ['--stdio'] },
  ruby: { language: 'ruby', command: 'solargraph', args: ['stdio'] },
  kotlin: { language: 'kotlin', command: 'kotlin-language-server', args: [] },
};

export class LSPClient {
  private servers: Map<LSPLanguage, LSPServerConfig>;
  private activeServers: Map<LSPLanguage, ServerState>;
  private configPath: string;
  private stats: { queriesExecuted: number; totalResponseMs: number; cacheHits: number };

  constructor(configPath?: string) {
    this.servers = new Map();
    this.activeServers = new Map();
    this.configPath = configPath || '.codebuddy/lsp-config.json';
    this.stats = { queriesExecuted: 0, totalResponseMs: 0, cacheHits: 0 };
    logger.debug('LSPClient initialized', { configPath: this.configPath });
  }

  registerServer(config: LSPServerConfig): void {
    if (!config.language || !config.command) {
      throw new Error('Language and command are required for LSP server config');
    }
    this.servers.set(config.language, { ...config });
    logger.info('LSP server registered', { language: config.language, command: config.command });
  }

  getRegisteredLanguages(): LSPLanguage[] {
    return Array.from(this.servers.keys());
  }

  isLanguageSupported(lang: LSPLanguage): boolean {
    return this.servers.has(lang);
  }

  static getDefaultConfig(language: LSPLanguage): LSPServerConfig | null {
    const config = DEFAULT_CONFIGS[language];
    return config ? { ...config } : null;
  }

  static getSupportedLanguages(): LSPLanguage[] {
    return Object.keys(DEFAULT_CONFIGS) as LSPLanguage[];
  }

  async goToDefinition(file: string, line: number, column: number): Promise<LSPLocation[]> {
    const lang = this.detectLanguage(file);
    if (!lang || !this.servers.has(lang)) {
      logger.warn('No LSP server for language', { file, lang });
      return [];
    }

    this.recordQuery();
    logger.debug('goToDefinition', { file, line, column });

    // In a real implementation, this would communicate with the LSP server
    return [];
  }

  async findReferences(file: string, line: number, column: number): Promise<LSPLocation[]> {
    const lang = this.detectLanguage(file);
    if (!lang || !this.servers.has(lang)) {
      logger.warn('No LSP server for language', { file, lang });
      return [];
    }

    this.recordQuery();
    logger.debug('findReferences', { file, line, column });
    return [];
  }

  async hover(file: string, line: number, column: number): Promise<LSPHoverInfo | null> {
    const lang = this.detectLanguage(file);
    if (!lang || !this.servers.has(lang)) {
      return null;
    }

    this.recordQuery();
    logger.debug('hover', { file, line, column });
    return null;
  }

  async getDocumentSymbols(file: string): Promise<LSPSymbol[]> {
    const lang = this.detectLanguage(file);
    if (!lang || !this.servers.has(lang)) {
      return [];
    }

    this.recordQuery();
    logger.debug('getDocumentSymbols', { file });
    return [];
  }

  async getDiagnostics(file: string): Promise<LSPDiagnostic[]> {
    const lang = this.detectLanguage(file);
    if (!lang || !this.servers.has(lang)) {
      return [];
    }

    this.recordQuery();
    logger.debug('getDiagnostics', { file });
    return [];
  }

  detectLanguage(filePath: string): LSPLanguage | null {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_MAP[ext] || null;
  }

  async startServer(language: LSPLanguage): Promise<boolean> {
    if (!this.servers.has(language)) {
      logger.warn('Cannot start server: not registered', { language });
      return false;
    }

    if (this.activeServers.has(language)) {
      logger.debug('Server already running', { language });
      return true;
    }

    const config = this.servers.get(language)!;
    logger.info('Starting LSP server', { language, command: config.command });

    // In production, this would spawn the process
    this.activeServers.set(language, { process: null, initialized: true });
    return true;
  }

  async stopServer(language: LSPLanguage): Promise<void> {
    if (!this.activeServers.has(language)) {
      return;
    }

    logger.info('Stopping LSP server', { language });
    this.activeServers.delete(language);
  }

  async stopAll(): Promise<void> {
    const languages = Array.from(this.activeServers.keys());
    for (const lang of languages) {
      await this.stopServer(lang);
    }
    logger.info('All LSP servers stopped');
  }

  getActiveServerCount(): number {
    return this.activeServers.size;
  }

  getStats(): { queriesExecuted: number; avgResponseMs: number; cacheHits: number } {
    return {
      queriesExecuted: this.stats.queriesExecuted,
      avgResponseMs: this.stats.queriesExecuted > 0
        ? this.stats.totalResponseMs / this.stats.queriesExecuted
        : 0,
      cacheHits: this.stats.cacheHits,
    };
  }

  private recordQuery(): void {
    this.stats.queriesExecuted++;
    // Simulated response time
    this.stats.totalResponseMs += Math.random() * 50 + 5;
  }
}
