/**
 * Tests for glob pattern matcher
 */

import {
  globToRegex,
  matchGlob,
  matchAnyGlob,
  matchAllGlobs,
  filterByGlob,
  excludeByGlob,
  filterTools,
  isToolEnabled,
  ToolFilterConfig,
} from '../../src/utils/glob-matcher.js';

describe('Glob Pattern Matcher', () => {
  describe('globToRegex', () => {
    it('should match exact strings', () => {
      const regex = globToRegex('bash');
      expect(regex.test('bash')).toBe(true);
      expect(regex.test('bash_tool')).toBe(false);
      expect(regex.test('my_bash')).toBe(false);
    });

    it('should handle * wildcard (matches anything except /)', () => {
      const regex = globToRegex('bash*');
      expect(regex.test('bash')).toBe(true);
      expect(regex.test('bash_tool')).toBe(true);
      expect(regex.test('bash123')).toBe(true);
      expect(regex.test('mybash')).toBe(false);
    });

    it('should handle ** wildcard (matches anything including /)', () => {
      const regex = globToRegex('src/**');
      expect(regex.test('src/')).toBe(true);
      expect(regex.test('src/file.ts')).toBe(true);
      expect(regex.test('src/dir/file.ts')).toBe(true);
    });

    it('should handle ? wildcard (single character)', () => {
      const regex = globToRegex('file_?');
      expect(regex.test('file_1')).toBe(true);
      expect(regex.test('file_a')).toBe(true);
      expect(regex.test('file_12')).toBe(false);
      expect(regex.test('file_')).toBe(false);
    });

    it('should handle character classes [abc]', () => {
      const regex = globToRegex('[abc]_tool');
      expect(regex.test('a_tool')).toBe(true);
      expect(regex.test('b_tool')).toBe(true);
      expect(regex.test('c_tool')).toBe(true);
      expect(regex.test('d_tool')).toBe(false);
    });

    it('should handle character ranges [a-z]', () => {
      const regex = globToRegex('[a-z]_tool');
      expect(regex.test('a_tool')).toBe(true);
      expect(regex.test('z_tool')).toBe(true);
      expect(regex.test('1_tool')).toBe(false);
    });

    it('should handle brace expansion {a,b,c}', () => {
      const regex = globToRegex('{bash,git,npm}');
      expect(regex.test('bash')).toBe(true);
      expect(regex.test('git')).toBe(true);
      expect(regex.test('npm')).toBe(true);
      expect(regex.test('yarn')).toBe(false);
    });

    it('should escape regex special characters', () => {
      const regex = globToRegex('file.ts');
      expect(regex.test('file.ts')).toBe(true);
      expect(regex.test('filexts')).toBe(false);
    });
  });

  describe('matchGlob', () => {
    it('should match strings against patterns', () => {
      expect(matchGlob('bash', 'bash')).toBe(true);
      expect(matchGlob('bash_tool', 'bash*')).toBe(true);
      expect(matchGlob('web_search', '*search*')).toBe(true);
      expect(matchGlob('search_tool', '*search*')).toBe(true);
    });
  });

  describe('matchAnyGlob', () => {
    it('should match if any pattern matches', () => {
      const patterns = ['bash*', 'git*', 'npm*'];
      expect(matchAnyGlob('bash', patterns)).toBe(true);
      expect(matchAnyGlob('git_status', patterns)).toBe(true);
      expect(matchAnyGlob('yarn', patterns)).toBe(false);
    });
  });

  describe('matchAllGlobs', () => {
    it('should match only if all patterns match', () => {
      const patterns = ['*tool*', 'search*'];
      expect(matchAllGlobs('search_tool', patterns)).toBe(true);
      expect(matchAllGlobs('bash_tool', patterns)).toBe(false);
    });
  });

  describe('filterByGlob', () => {
    it('should filter items by patterns', () => {
      const items = ['bash', 'git', 'npm', 'search', 'web_search'];
      const result = filterByGlob(items, ['*search*']);
      expect(result).toEqual(['search', 'web_search']);
    });

    it('should work with custom accessor', () => {
      const items = [
        { name: 'bash', type: 'tool' },
        { name: 'search', type: 'tool' },
      ];
      const result = filterByGlob(items, ['search'], item => item.name);
      expect(result).toEqual([{ name: 'search', type: 'tool' }]);
    });
  });

  describe('excludeByGlob', () => {
    it('should exclude items matching patterns', () => {
      const items = ['bash', 'git', 'npm', 'web_search', 'web_fetch'];
      const result = excludeByGlob(items, ['web_*']);
      expect(result).toEqual(['bash', 'git', 'npm']);
    });
  });

  describe('filterTools', () => {
    const tools = ['bash', 'search', 'web_search', 'web_fetch', 'git', 'view_file'];

    it('should return all tools when no config', () => {
      const result = filterTools(tools, {});
      expect(result).toEqual(tools);
    });

    it('should filter with enabledTools (whitelist)', () => {
      const config: ToolFilterConfig = {
        enabledTools: ['bash', 'git'],
      };
      const result = filterTools(tools, config);
      expect(result).toEqual(['bash', 'git']);
    });

    it('should filter with disabledTools (blacklist)', () => {
      const config: ToolFilterConfig = {
        disabledTools: ['web_*'],
      };
      const result = filterTools(tools, config);
      expect(result).toEqual(['bash', 'search', 'git', 'view_file']);
    });

    it('should combine enabledTools and disabledTools', () => {
      const config: ToolFilterConfig = {
        enabledTools: ['*'],
        disabledTools: ['web_*'],
      };
      const result = filterTools(tools, config);
      expect(result).toEqual(['bash', 'search', 'git', 'view_file']);
    });

    it('should handle glob patterns in enabledTools', () => {
      const config: ToolFilterConfig = {
        enabledTools: ['*_file', 'bash'],
      };
      const result = filterTools(tools, config);
      expect(result).toEqual(['bash', 'view_file']);
    });
  });

  describe('isToolEnabled', () => {
    it('should return true when no config', () => {
      expect(isToolEnabled('bash', {})).toBe(true);
    });

    it('should check disabledTools first', () => {
      const config: ToolFilterConfig = {
        enabledTools: ['*'],
        disabledTools: ['bash'],
      };
      expect(isToolEnabled('bash', config)).toBe(false);
      expect(isToolEnabled('git', config)).toBe(true);
    });

    it('should check enabledTools when specified', () => {
      const config: ToolFilterConfig = {
        enabledTools: ['bash', 'git'],
      };
      expect(isToolEnabled('bash', config)).toBe(true);
      expect(isToolEnabled('search', config)).toBe(false);
    });

    it('should handle MCP tools', () => {
      const config: ToolFilterConfig = {
        disabledTools: ['mcp__*'],
      };
      expect(isToolEnabled('mcp__filesystem__read', config)).toBe(false);
      expect(isToolEnabled('bash', config)).toBe(true);
    });
  });
});
