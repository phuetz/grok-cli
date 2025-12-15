/**
 * Supercomplete Provider
 * Cursor-inspired multi-line intelligent completions
 * Predicts and suggests entire blocks of code
 */

import * as vscode from 'vscode';
import { AIClient } from '../ai-client';

interface SupercompleteConfig {
  maxLines: number;
  debounceMs: number;
  minPrefixLength: number;
  enabled: boolean;
}

export class SupercompleteProvider implements vscode.InlineCompletionItemProvider, vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private cache: Map<string, { completion: string; timestamp: number }> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastRequest: { content: string; position: vscode.Position } | null = null;
  private config: SupercompleteConfig;

  constructor(private readonly aiClient: AIClient) {
    this.config = {
      maxLines: 15,
      debounceMs: 300,
      minPrefixLength: 10,
      enabled: true,
    };

    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen for config changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('codebuddy')) {
          this.updateConfig();
        }
      })
    );
  }

  private updateConfig(): void {
    const config = vscode.workspace.getConfiguration('codebuddy');
    this.config.enabled = config.get<boolean>('inlineCompletions') ?? true;
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionList | null> {
    if (!this.config.enabled) return null;

    // Get context around cursor
    const prefix = this.getPrefix(document, position);
    const suffix = this.getSuffix(document, position);

    // Skip if prefix is too short
    if (prefix.length < this.config.minPrefixLength) {
      return null;
    }

    // Check cache
    const cacheKey = this.getCacheKey(document, position, prefix);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return this.createCompletionList(cached.completion, position);
    }

    // Debounce requests
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(async () => {
        if (token.isCancellationRequested) {
          resolve(null);
          return;
        }

        try {
          const completion = await this.generateCompletion(
            document,
            position,
            prefix,
            suffix,
            token
          );

          if (completion && !token.isCancellationRequested) {
            // Cache the result
            this.cache.set(cacheKey, {
              completion,
              timestamp: Date.now(),
            });

            resolve(this.createCompletionList(completion, position));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      }, this.config.debounceMs);
    });
  }

  /**
   * Get prefix (code before cursor)
   */
  private getPrefix(document: vscode.TextDocument, position: vscode.Position): string {
    const startLine = Math.max(0, position.line - 50);
    const range = new vscode.Range(startLine, 0, position.line, position.character);
    return document.getText(range);
  }

  /**
   * Get suffix (code after cursor)
   */
  private getSuffix(document: vscode.TextDocument, position: vscode.Position): string {
    const endLine = Math.min(document.lineCount - 1, position.line + 20);
    const range = new vscode.Range(position.line, position.character, endLine, 0);
    return document.getText(range);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    document: vscode.TextDocument,
    position: vscode.Position,
    prefix: string
  ): string {
    return `${document.uri.toString()}:${position.line}:${prefix.slice(-100)}`;
  }

  /**
   * Generate completion using AI
   */
  private async generateCompletion(
    document: vscode.TextDocument,
    position: vscode.Position,
    prefix: string,
    suffix: string,
    token: vscode.CancellationToken
  ): Promise<string | null> {
    const language = document.languageId;
    const fileName = document.fileName.split('/').pop() || 'file';

    // Detect context (function body, class method, etc.)
    const contextInfo = this.detectContext(prefix, language);

    // Build prompt
    const systemPrompt = `You are an expert ${language} code completion engine. Complete the code at the cursor position.

Rules:
- Complete the code naturally, predicting what the developer wants to write
- Match the existing code style (indentation, naming, etc.)
- Only output the completion, nothing else
- Do not repeat code that's already written
- Focus on completing the current statement, block, or function
- Be concise but complete logical units
- Maximum ${this.config.maxLines} lines

Context: ${contextInfo}`;

    const userPrompt = `File: ${fileName}

\`\`\`${language}
${prefix}<CURSOR>${suffix.slice(0, 200)}
\`\`\`

Complete the code at <CURSOR>. Output ONLY the completion text, no explanations or markdown.`;

    try {
      const response = await this.aiClient.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 500 }
      );

      if (token.isCancellationRequested) {
        return null;
      }

      // Clean up the response
      let completion = response.trim();

      // Remove markdown code blocks if present
      completion = completion.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');

      // Remove any explanation text
      if (completion.includes('\n\n')) {
        completion = completion.split('\n\n')[0];
      }

      // Limit lines
      const lines = completion.split('\n');
      if (lines.length > this.config.maxLines) {
        completion = lines.slice(0, this.config.maxLines).join('\n');
      }

      // Ensure proper indentation
      completion = this.adjustIndentation(completion, prefix);

      return completion || null;
    } catch {
      return null;
    }
  }

  /**
   * Detect the context of where we're completing
   */
  private detectContext(prefix: string, language: string): string {
    const lines = prefix.split('\n');
    const lastLines = lines.slice(-10).join('\n');

    // Check for common patterns
    if (/function\s+\w+\s*\([^)]*\)\s*\{?\s*$/.test(lastLines)) {
      return 'Inside function definition, implement the function body';
    }
    if (/class\s+\w+/.test(lastLines) && /\{[^}]*$/.test(lastLines)) {
      return 'Inside class definition, add methods or properties';
    }
    if (/if\s*\([^)]+\)\s*\{?\s*$/.test(lastLines)) {
      return 'Inside if statement, add conditional logic';
    }
    if (/for\s*\([^)]+\)\s*\{?\s*$/.test(lastLines)) {
      return 'Inside for loop, add iteration logic';
    }
    if (/=>\s*\{?\s*$/.test(lastLines)) {
      return 'Inside arrow function, implement the function body';
    }
    if (/async\s+/.test(lastLines)) {
      return 'Async context, may need await statements';
    }
    if (/try\s*\{\s*$/.test(lastLines)) {
      return 'Inside try block, add code to try';
    }
    if (/catch\s*\([^)]*\)\s*\{?\s*$/.test(lastLines)) {
      return 'Inside catch block, handle the error';
    }
    if (/return\s*$/.test(lastLines)) {
      return 'Return statement, complete the return value';
    }
    if (/const\s+\w+\s*=\s*$/.test(lastLines)) {
      return 'Variable assignment, complete the value';
    }
    if (/import\s+/.test(lines[lines.length - 1] || '')) {
      return 'Import statement, complete the import';
    }
    if (/export\s+/.test(lines[lines.length - 1] || '')) {
      return 'Export statement, complete the export';
    }

    return 'General code completion';
  }

  /**
   * Adjust indentation to match the current context
   */
  private adjustIndentation(completion: string, prefix: string): string {
    const lines = prefix.split('\n');
    const lastLine = lines[lines.length - 1] || '';

    // Get current indentation
    const match = lastLine.match(/^(\s*)/);
    const currentIndent = match ? match[1] : '';

    // Get the indentation of the first line of completion
    const completionLines = completion.split('\n');
    const firstLineMatch = completionLines[0]?.match(/^(\s*)/);
    const completionIndent = firstLineMatch ? firstLineMatch[1] : '';

    // If completion starts at a different indent level, adjust
    if (completionIndent.length !== 0 && completionIndent !== currentIndent) {
      const indentDiff = currentIndent.length - completionIndent.length;

      return completionLines
        .map((line, i) => {
          if (i === 0) return line.trim(); // First line continues from cursor
          if (line.trim() === '') return line;

          if (indentDiff > 0) {
            return ' '.repeat(indentDiff) + line;
          } else if (indentDiff < 0 && line.startsWith(' '.repeat(-indentDiff))) {
            return line.slice(-indentDiff);
          }
          return line;
        })
        .join('\n');
    }

    return completion;
  }

  /**
   * Create completion list from generated text
   */
  private createCompletionList(
    completion: string,
    position: vscode.Position
  ): vscode.InlineCompletionList {
    const item = new vscode.InlineCompletionItem(
      completion,
      new vscode.Range(position, position)
    );

    return {
      items: [item],
    };
  }

  /**
   * Clear the completion cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.disposables.forEach(d => d.dispose());
  }
}

/**
 * Enhanced completion that can predict entire functions
 */
export class FunctionPredictor {
  constructor(private readonly aiClient: AIClient) {}

  /**
   * Predict a complete function based on its signature
   */
  async predictFunction(
    signature: string,
    context: string,
    language: string
  ): Promise<string | null> {
    const prompt = `Given this function signature and context, implement the function body:

Context:
${context}

Signature:
${signature}

Implement the function. Output ONLY the function implementation, no explanations.`;

    try {
      const response = await this.aiClient.chat([
        {
          role: 'system',
          content: `You are an expert ${language} developer. Implement functions based on their signatures and context.`,
        },
        { role: 'user', content: prompt },
      ]);

      // Extract code from response
      let code = response.trim();
      const codeMatch = code.match(/```[\w]*\n([\s\S]*?)```/);
      if (codeMatch) {
        code = codeMatch[1].trim();
      }

      return code;
    } catch {
      return null;
    }
  }

  /**
   * Suggest function signature based on name
   */
  async suggestSignature(
    functionName: string,
    context: string,
    language: string
  ): Promise<string | null> {
    const prompt = `Based on the function name and context, suggest a complete function signature:

Function name: ${functionName}
Context:
${context}

Suggest a function signature with appropriate parameters and return type for ${language}. Output ONLY the signature, no implementation.`;

    try {
      const response = await this.aiClient.chat([
        {
          role: 'system',
          content: `You are an expert ${language} developer. Suggest function signatures based on names and context.`,
        },
        { role: 'user', content: prompt },
      ]);

      return response.trim().split('\n')[0];
    } catch {
      return null;
    }
  }
}
