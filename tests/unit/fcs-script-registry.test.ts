/**
 * Tests for FCS Script Registry
 */

import { ScriptRegistry } from '../../src/fcs/script-registry.js';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('ScriptRegistry', () => {
  let registry: ScriptRegistry;
  const mockTemplatesDir = '/mock/scripts/templates';

  // Helper to mock fs functions
  const mockExistsSync = fs.existsSync as jest.Mock;
  const mockReaddirSync = fs.readdirSync as jest.Mock;
  const mockReadFileSync = fs.readFileSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new ScriptRegistry(mockTemplatesDir);
  });

  describe('constructor', () => {
    it('should create with custom templates directory', () => {
      const customDir = '/custom/templates';
      const customRegistry = new ScriptRegistry(customDir);
      expect(customRegistry).toBeDefined();
    });

    it('should use current working directory when no dir specified', () => {
      const defaultRegistry = new ScriptRegistry();
      expect(defaultRegistry).toBeDefined();
    });
  });

  describe('loadTemplates', () => {
    it('should handle non-existent templates directory', async () => {
      mockExistsSync.mockReturnValue(false);

      await registry.loadTemplates();

      expect(registry.getTemplates()).toHaveLength(0);
      expect(registry.getCategories()).toHaveLength(0);
    });

    it('should load templates from category directories', async () => {
      // Mock directory exists
      mockExistsSync.mockReturnValue(true);

      // Mock directory reading
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [
            { name: 'refactoring', isDirectory: () => true },
            { name: 'testing', isDirectory: () => true },
          ];
        }
        if (pathStr.includes('refactoring')) {
          return ['rename-symbol.fcs', 'cleanup-imports.fcs'];
        }
        if (pathStr.includes('testing')) {
          return ['generate-tests.fcs'];
        }
        return [];
      });

      // Mock file content
      mockReadFileSync.mockImplementation((filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes('rename-symbol')) {
          return `// rename-symbol.fcs - Rename a symbol across the codebase
// Usage: OLD_NAME=foo NEW_NAME=bar /fcs run rename-symbol.fcs
let oldName = env("OLD_NAME", "")`;
        }
        if (pathStr.includes('cleanup-imports')) {
          return `// cleanup-imports.fcs - Remove unused imports
// Usage: /fcs run cleanup-imports.fcs
let dryRun = env("DRY_RUN", "true")`;
        }
        if (pathStr.includes('generate-tests')) {
          return `// generate-tests.fcs - Generate unit tests for a file
// Usage: FILE=src/file.ts /fcs run generate-tests.fcs
let targetFile = env("FILE", "")`;
        }
        return '';
      });

      await registry.loadTemplates();

      expect(registry.getCategories()).toHaveLength(2);
      expect(registry.getTemplates()).toHaveLength(3);
    });
  });

  describe('getTemplates', () => {
    it('should return empty array before loading', () => {
      expect(registry.getTemplates()).toHaveLength(0);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should filter templates by category', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [{ name: 'refactoring', isDirectory: () => true }];
        }
        return ['script1.fcs', 'script2.fcs'];
      });
      mockReadFileSync.mockReturnValue('// Test script\nprint("test")');

      await registry.loadTemplates();

      const refactoringTemplates = registry.getTemplatesByCategory('refactoring');
      expect(refactoringTemplates.length).toBe(2);
      expect(refactoringTemplates.every(t => t.category === 'refactoring')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const templates = registry.getTemplatesByCategory('unknown');
      expect(templates).toHaveLength(0);
    });
  });

  describe('getCategories', () => {
    it('should return empty array before loading', () => {
      expect(registry.getCategories()).toHaveLength(0);
    });

    it('should return categories with descriptions', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [
            { name: 'refactoring', isDirectory: () => true },
            { name: 'testing', isDirectory: () => true },
          ];
        }
        return ['test.fcs'];
      });
      mockReadFileSync.mockReturnValue('// Test script\nprint("test")');

      await registry.loadTemplates();

      const categories = registry.getCategories();
      expect(categories).toHaveLength(2);

      const refactoring = categories.find(c => c.name === 'refactoring');
      expect(refactoring).toBeDefined();
      expect(refactoring?.description).toContain('refactoring');
    });
  });

  describe('getTemplate', () => {
    it('should return undefined for unknown template', () => {
      expect(registry.getTemplate('unknown')).toBeUndefined();
    });

    it('should return template by name', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [{ name: 'testing', isDirectory: () => true }];
        }
        return ['my-script.fcs'];
      });
      mockReadFileSync.mockReturnValue('// my-script.fcs - My test script\nprint("test")');

      await registry.loadTemplates();

      const template = registry.getTemplate('my-script');
      expect(template).toBeDefined();
      expect(template?.name).toBe('my-script');
    });
  });

  describe('searchTemplates', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [{ name: 'refactoring', isDirectory: () => true }];
        }
        return ['rename-symbol.fcs', 'extract-function.fcs'];
      });
      mockReadFileSync.mockImplementation((filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes('rename')) {
          return '// rename-symbol.fcs - Rename variables and functions\nprint("rename")';
        }
        return '// extract-function.fcs - Extract code into function\nprint("extract")';
      });

      await registry.loadTemplates();
    });

    it('should search by name', () => {
      const results = registry.searchTemplates('rename');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('rename-symbol');
    });

    it('should search by description', () => {
      const results = registry.searchTemplates('variable');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('rename-symbol');
    });

    it('should search by category', () => {
      const results = registry.searchTemplates('refactoring');
      expect(results).toHaveLength(2);
    });

    it('should be case insensitive', () => {
      const results = registry.searchTemplates('RENAME');
      expect(results).toHaveLength(1);
    });

    it('should return empty for no matches', () => {
      const results = registry.searchTemplates('xyz123nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('formatTemplateList', () => {
    it('should format empty registry', () => {
      const output = registry.formatTemplateList();
      expect(output).toContain('FCS Script Templates');
      expect(output).toContain('Total: 0 templates');
    });

    it('should format templates with categories', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [{ name: 'testing', isDirectory: () => true }];
        }
        return ['test-script.fcs'];
      });
      mockReadFileSync.mockReturnValue('// test-script.fcs - A test script\n// Usage: /fcs run test.fcs\nprint("test")');

      await registry.loadTemplates();

      const output = registry.formatTemplateList();
      expect(output).toContain('Testing');
      expect(output).toContain('test-script');
      expect(output).toContain('A test script');
      expect(output).toContain('Total: 1 templates');
    });
  });

  describe('template parsing', () => {
    it('should extract description from first comment line', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [{ name: 'utilities', isDirectory: () => true }];
        }
        return ['helper.fcs'];
      });
      mockReadFileSync.mockReturnValue(`// helper.fcs - This is the description
// Usage: /fcs run helper.fcs
print("hello")`);

      await registry.loadTemplates();

      const template = registry.getTemplate('helper');
      expect(template?.description).toBe('This is the description');
    });

    it('should extract usage from comment', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [{ name: 'utilities', isDirectory: () => true }];
        }
        return ['tool.fcs'];
      });
      mockReadFileSync.mockReturnValue(`// tool.fcs - Tool description
// Usage: FILE=test /fcs run tool.fcs
let file = env("FILE", "")`);

      await registry.loadTemplates();

      const template = registry.getTemplate('tool');
      expect(template?.usage).toBe('FILE=test /fcs run tool.fcs');
    });

    it('should extract environment variables from env() calls', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation((dirPath: unknown) => {
        const pathStr = String(dirPath);
        if (pathStr === mockTemplatesDir) {
          return [{ name: 'utilities', isDirectory: () => true }];
        }
        return ['config.fcs'];
      });
      mockReadFileSync.mockReturnValue(`// config.fcs - Config script
let target = env("TARGET", "")
let output = env("OUTPUT", "out")
let dryRun = env("DRY_RUN", "true")`);

      await registry.loadTemplates();

      const template = registry.getTemplate('config');
      expect(template?.envVars).toContain('TARGET');
      expect(template?.envVars).toContain('OUTPUT');
      expect(template?.envVars).toContain('DRY_RUN');
    });
  });
});
