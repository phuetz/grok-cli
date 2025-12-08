/**
 * Tests for Thinking Keywords System
 *
 * Tests the thinking level detection:
 * - none: No extended thinking
 * - standard: "think" keyword (4K tokens)
 * - deep: "megathink" keyword (10K tokens)
 * - exhaustive: "ultrathink" keyword (32K tokens)
 */

import {
  ThinkingKeywordsManager,
  ThinkingLevel,
  getThinkingKeywordsManager,
  resetThinkingKeywordsManager
} from '../src/agent/thinking-keywords.js';

describe('ThinkingKeywordsManager', () => {
  let manager: ThinkingKeywordsManager;

  beforeEach(() => {
    resetThinkingKeywordsManager();
    manager = getThinkingKeywordsManager();
  });

  afterEach(() => {
    resetThinkingKeywordsManager();
  });

  describe('Keyword Detection - None Level', () => {
    it('should return none level for normal input', () => {
      const result = manager.detectThinkingLevel('Fix the bug in the login component');

      expect(result.detected).toBe(false);
      expect(result.level).toBe('none');
      expect(result.tokenBudget).toBe(0);
    });

    it('should return none level for empty input', () => {
      const result = manager.detectThinkingLevel('');

      expect(result.detected).toBe(false);
      expect(result.level).toBe('none');
    });

    it('should not detect "think" as part of another word', () => {
      const result = manager.detectThinkingLevel('I am thinking about the problem');

      // "thinking" contains "think" but shouldn't trigger
      expect(result.level).toBe('none');
    });
  });

  describe('Keyword Detection - Standard Level', () => {
    it('should detect "think about" keyword', () => {
      const result = manager.detectThinkingLevel('think about how to implement this feature');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('standard');
      expect(result.keyword).toBe('think about');
      expect(result.tokenBudget).toBe(4000);
    });

    it('should detect "think about" keyword', () => {
      const result = manager.detectThinkingLevel('think about the architecture');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('standard');
    });

    it('should detect "think through" keyword', () => {
      const result = manager.detectThinkingLevel('think through this problem step by step');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('standard');
    });

    it('should detect standalone "think" keyword', () => {
      const result = manager.detectThinkingLevel('please think before answering');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('standard');
    });

    it('should detect "consider carefully" keyword', () => {
      const result = manager.detectThinkingLevel('consider carefully how to refactor this');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('standard');
    });

    it('should clean the input by removing the keyword', () => {
      const result = manager.detectThinkingLevel('think about the best approach');

      expect(result.cleanedInput).not.toContain('think');
      expect(result.cleanedInput.trim()).toBeTruthy();
    });
  });

  describe('Keyword Detection - Deep Level', () => {
    it('should detect "megathink" keyword', () => {
      const result = manager.detectThinkingLevel('megathink about the system design');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('deep');
      expect(result.keyword).toBe('megathink');
      expect(result.tokenBudget).toBe(10000);
    });

    it('should detect "think hard" keyword', () => {
      const result = manager.detectThinkingLevel('think hard about the algorithm');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('deep');
    });

    it('should detect "think harder" keyword', () => {
      const result = manager.detectThinkingLevel('think harder about edge cases');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('deep');
    });

    it('should detect "think deeply" keyword', () => {
      const result = manager.detectThinkingLevel('think deeply about this problem');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('deep');
    });

    it('should detect "deep think" keyword', () => {
      const result = manager.detectThinkingLevel('deep think about performance');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('deep');
    });

    it('should detect "analyze thoroughly" keyword', () => {
      const result = manager.detectThinkingLevel('analyze thoroughly the security implications');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('deep');
    });
  });

  describe('Keyword Detection - Exhaustive Level', () => {
    it('should detect "ultrathink" keyword', () => {
      const result = manager.detectThinkingLevel('ultrathink about the entire architecture');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('exhaustive');
      expect(result.keyword).toBe('ultrathink');
      expect(result.tokenBudget).toBe(32000);
    });

    it('should detect "think even harder" keyword', () => {
      const result = manager.detectThinkingLevel('think even harder about this complex problem');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('exhaustive');
    });

    it('should detect "think maximum" keyword', () => {
      const result = manager.detectThinkingLevel('think maximum for this complex problem');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('exhaustive');
    });

    it('should detect "exhaustive analysis" keyword', () => {
      const result = manager.detectThinkingLevel('exhaustive analysis of the codebase');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('exhaustive');
    });
  });

  describe('Priority Handling', () => {
    it('should prioritize higher thinking levels', () => {
      // If input contains both "think" and "ultrathink", should pick ultrathink
      const result = manager.detectThinkingLevel('ultrathink and think about this');

      expect(result.level).toBe('exhaustive');
    });

    it('should prioritize megathink over think', () => {
      const result = manager.detectThinkingLevel('megathink and think about this');

      expect(result.level).toBe('deep');
    });
  });

  describe('Case Insensitivity', () => {
    it('should detect keywords case-insensitively', () => {
      const inputs = [
        'THINK about this',
        'Think About this',
        'MEGATHINK about this',
        'UltraThink about this',
      ];

      for (const input of inputs) {
        const result = manager.detectThinkingLevel(input);
        expect(result.detected).toBe(true);
      }
    });
  });

  describe('System Prompt Addition', () => {
    it('should provide empty addition for none level', () => {
      const result = manager.detectThinkingLevel('Fix the bug');

      expect(result.systemPromptAddition).toBe('');
    });

    it('should provide step-by-step prompt for standard level', () => {
      const result = manager.detectThinkingLevel('think about this');

      expect(result.systemPromptAddition).toContain('step by step');
    });

    it('should provide deep analysis prompt for deep level', () => {
      const result = manager.detectThinkingLevel('megathink about this');

      expect(result.systemPromptAddition).toContain('deep analysis');
      expect(result.systemPromptAddition).toContain('edge cases');
    });

    it('should provide exhaustive prompt for exhaustive level', () => {
      const result = manager.detectThinkingLevel('ultrathink about this');

      expect(result.systemPromptAddition).toContain('exhaustive');
      expect(result.systemPromptAddition).toContain('problem space');
    });
  });

  describe('Input Cleaning', () => {
    it('should remove detected keyword from input', () => {
      const result = manager.detectThinkingLevel('megathink about the database schema');

      expect(result.cleanedInput).not.toContain('megathink');
      expect(result.cleanedInput).toContain('database schema');
    });

    it('should preserve the rest of the input', () => {
      const result = manager.detectThinkingLevel('think about how to implement authentication');

      expect(result.cleanedInput).toContain('authentication');
    });

    it('should handle keyword at different positions', () => {
      const inputs = [
        'think about this problem',
        'Please think about this',
        'How should I think about this?',
      ];

      for (const input of inputs) {
        const result = manager.detectThinkingLevel(input);
        expect(result.cleanedInput).not.toContain('think');
        expect(result.cleanedInput.length).toBeLessThan(input.length);
      }
    });

    it('should trim whitespace from cleaned input', () => {
      const result = manager.detectThinkingLevel('think    about this');

      expect(result.cleanedInput).not.toMatch(/^\s+/);
      expect(result.cleanedInput).not.toMatch(/\s+$/);
    });
  });

  describe('Configuration', () => {
    it('should return all level configurations', () => {
      const levels = manager.getAvailableLevels();

      expect(levels.length).toBe(4);
      expect(levels.map(l => l.level)).toContain('none');
      expect(levels.map(l => l.level)).toContain('standard');
      expect(levels.map(l => l.level)).toContain('deep');
      expect(levels.map(l => l.level)).toContain('exhaustive');
    });

    it('should have correct token budgets', () => {
      expect(manager.getConfig('none').tokenBudget).toBe(0);
      expect(manager.getConfig('standard').tokenBudget).toBe(4000);
      expect(manager.getConfig('deep').tokenBudget).toBe(10000);
      expect(manager.getConfig('exhaustive').tokenBudget).toBe(32000);
    });

    it('should have descriptions for all levels', () => {
      for (const level of ['none', 'standard', 'deep', 'exhaustive'] as ThinkingLevel[]) {
        expect(manager.getConfig(level).description).toBeTruthy();
      }
    });
  });

  describe('Event Emission', () => {
    it('should emit thinking:detected event when keyword found', () => {
      const listener = jest.fn();
      manager.on('thinking:detected', listener);

      manager.detectThinkingLevel('megathink about the problem');

      expect(listener).toHaveBeenCalled();
      const callArg = listener.mock.calls[0][0];
      expect(callArg.level).toBe('deep');
      expect(callArg.tokenBudget).toBe(10000);
    });

    it('should not emit event when no keyword detected', () => {
      const listener = jest.fn();
      manager.on('thinking:detected', listener);

      manager.detectThinkingLevel('Fix the bug');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in input', () => {
      const result = manager.detectThinkingLevel('think about @user\'s request! #important');

      expect(result.detected).toBe(true);
      expect(result.level).toBe('standard');
    });

    it('should handle unicode characters', () => {
      const result = manager.detectThinkingLevel('think about 日本語 and emoji 🚀');

      expect(result.detected).toBe(true);
      expect(result.cleanedInput).toContain('🚀');
    });

    it('should handle very long input', () => {
      const longInput = 'think about ' + 'a'.repeat(10000);

      const result = manager.detectThinkingLevel(longInput);

      expect(result.detected).toBe(true);
      expect(result.level).toBe('standard');
    });

    it('should handle input with only keyword', () => {
      const result = manager.detectThinkingLevel('think');

      expect(result.detected).toBe(true);
      expect(result.cleanedInput).toBe('');
    });

    it('should handle multiple spaces around keyword', () => {
      const result = manager.detectThinkingLevel('   think   about   this   ');

      expect(result.detected).toBe(true);
      expect(result.cleanedInput.trim()).toBeTruthy();
    });
  });
});

describe('Singleton Behavior', () => {
  beforeEach(() => {
    resetThinkingKeywordsManager();
  });

  it('should return same instance', () => {
    const instance1 = getThinkingKeywordsManager();
    const instance2 = getThinkingKeywordsManager();

    expect(instance1).toBe(instance2);
  });

  it('should return new instance after reset', () => {
    const instance1 = getThinkingKeywordsManager();
    resetThinkingKeywordsManager();
    const instance2 = getThinkingKeywordsManager();

    expect(instance1).not.toBe(instance2);
  });
});
