/**
 * FCS Script Registry
 *
 * Provides discovery and management of FCS script templates.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ScriptTemplate {
  name: string;
  path: string;
  category: string;
  description: string;
  usage?: string;
  envVars?: string[];
}

export interface ScriptCategory {
  name: string;
  description: string;
  scripts: ScriptTemplate[];
}

/**
 * Registry of available FCS script templates
 */
export class ScriptRegistry {
  private templates: Map<string, ScriptTemplate> = new Map();
  private categories: Map<string, ScriptCategory> = new Map();
  private templatesDir: string;

  constructor(templatesDir?: string) {
    // Default to scripts/templates relative to current working directory
    this.templatesDir = templatesDir || path.join(
      process.cwd(),
      'scripts/templates'
    );
  }

  /**
   * Load all templates from the templates directory
   */
  async loadTemplates(): Promise<void> {
    this.templates.clear();
    this.categories.clear();

    if (!fs.existsSync(this.templatesDir)) {
      return;
    }

    // Define known categories
    const categoryDescriptions: Record<string, string> = {
      refactoring: 'Scripts for code refactoring operations',
      testing: 'Scripts for test generation and execution',
      documentation: 'Scripts for documentation generation',
      utilities: 'General utility scripts'
    };

    // Scan directory for categories
    const entries = fs.readdirSync(this.templatesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const categoryName = entry.name;
        const categoryPath = path.join(this.templatesDir, categoryName);
        const scripts = await this.loadCategoryScripts(categoryName, categoryPath);

        if (scripts.length > 0) {
          this.categories.set(categoryName, {
            name: categoryName,
            description: categoryDescriptions[categoryName] || `${categoryName} scripts`,
            scripts
          });
        }
      } else if (entry.name.endsWith('.fcs')) {
        // Root-level scripts
        const template = await this.parseTemplate(entry.name, this.templatesDir, 'general');
        if (template) {
          this.templates.set(template.name, template);
        }
      }
    }
  }

  /**
   * Load scripts from a category directory
   */
  private async loadCategoryScripts(category: string, categoryPath: string): Promise<ScriptTemplate[]> {
    const scripts: ScriptTemplate[] = [];

    if (!fs.existsSync(categoryPath)) {
      return scripts;
    }

    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      if (file.endsWith('.fcs')) {
        const template = await this.parseTemplate(file, categoryPath, category);
        if (template) {
          scripts.push(template);
          this.templates.set(template.name, template);
        }
      }
    }

    return scripts;
  }

  /**
   * Parse a template file to extract metadata
   */
  private async parseTemplate(
    filename: string,
    dir: string,
    category: string
  ): Promise<ScriptTemplate | null> {
    const filePath = path.join(dir, filename);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Extract description from first comment block
      let description = '';
      let usage = '';
      const envVars: string[] = [];

      let inHeader = true;
      for (const line of lines) {
        const trimmed = line.trim();

        // Extract env vars from all lines (they appear in code, not comments)
        const envMatch = line.match(/env\("([A-Z_]+)"/g);
        if (envMatch) {
          for (const match of envMatch) {
            const varName = match.match(/env\("([A-Z_]+)"/)?.[1];
            if (varName && !envVars.includes(varName)) {
              envVars.push(varName);
            }
          }
        }

        if (!trimmed.startsWith('//')) {
          inHeader = false;
          continue;
        }

        if (!inHeader) continue;

        const commentContent = trimmed.substring(2).trim();

        if (commentContent.startsWith('Usage:')) {
          usage = commentContent.substring(6).trim();
        } else if (description === '' && commentContent) {
          // Handle "filename.fcs - Description" format
          if (commentContent.includes(' - ')) {
            const parts = commentContent.split(' - ');
            if (parts.length > 1) {
              description = parts.slice(1).join(' - ').trim();
            }
          } else if (!commentContent.includes('.fcs')) {
            description = commentContent;
          }
        }
      }

      return {
        name: filename.replace('.fcs', ''),
        path: filePath,
        category,
        description: description || `${filename} script`,
        usage: usage || undefined,
        envVars: envVars.length > 0 ? envVars : undefined
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all templates
   */
  getTemplates(): ScriptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): ScriptTemplate[] {
    return this.getTemplates().filter(t => t.category === category);
  }

  /**
   * Get all categories
   */
  getCategories(): ScriptCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Get a specific template by name
   */
  getTemplate(name: string): ScriptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Search templates by keyword
   */
  searchTemplates(keyword: string): ScriptTemplate[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getTemplates().filter(t =>
      t.name.toLowerCase().includes(lowerKeyword) ||
      t.description.toLowerCase().includes(lowerKeyword) ||
      t.category.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Format templates as a readable list
   */
  formatTemplateList(): string {
    const lines: string[] = [
      'FCS Script Templates',
      '='.repeat(50),
      ''
    ];

    for (const category of this.getCategories()) {
      lines.push(`## ${category.name.charAt(0).toUpperCase() + category.name.slice(1)}`);
      lines.push(category.description);
      lines.push('');

      for (const script of category.scripts) {
        lines.push(`  ${script.name}`);
        lines.push(`    ${script.description}`);
        if (script.usage) {
          lines.push(`    Usage: ${script.usage}`);
        }
        lines.push('');
      }
    }

    lines.push('-'.repeat(50));
    lines.push(`Total: ${this.templates.size} templates in ${this.categories.size} categories`);

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let registryInstance: ScriptRegistry | null = null;

/**
 * Get the script registry instance
 */
export function getScriptRegistry(): ScriptRegistry {
  if (!registryInstance) {
    registryInstance = new ScriptRegistry();
  }
  return registryInstance;
}

/**
 * Initialize and load the script registry
 */
export async function initScriptRegistry(templatesDir?: string): Promise<ScriptRegistry> {
  const registry = new ScriptRegistry(templatesDir);
  await registry.loadTemplates();
  registryInstance = registry;
  return registry;
}
