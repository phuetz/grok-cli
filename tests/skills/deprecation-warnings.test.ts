/**
 * Tests for legacy skill system deprecation warnings
 */

// Mock logger to capture deprecation warnings (they now use logger.warn, not console.warn)
const mockLoggerWarn = jest.fn();
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: jest.fn(),
  },
}));

import { SkillManager } from '../../src/skills/skill-manager.js';
import { SkillLoader } from '../../src/skills/skill-loader.js';

describe('Legacy Skill System Deprecation', () => {
  beforeEach(() => {
    mockLoggerWarn.mockClear();
  });

  describe('SkillManager deprecation', () => {
    it('should emit deprecation warning on construction', () => {
      // Reset the one-time flag by creating a fresh module scope
      // Note: the warning is only emitted once per process due to the flag
      new SkillManager('/tmp/test');
      // The deprecation warning uses logger.warn with [DEPRECATED] prefix
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED')
      );
    });

    it('should still work (backwards compatible)', () => {
      const manager = new SkillManager('/tmp/test');
      const skills = manager.getAvailableSkills();
      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should still match skills', () => {
      const manager = new SkillManager('/tmp/test');
      const matches = manager.matchSkills('typescript type error');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].skill.name).toBe('typescript-expert');
    });
  });

  describe('SkillLoader deprecation', () => {
    it('should emit deprecation warning on construction', () => {
      new SkillLoader({});
      // The deprecation warning uses logger.warn with [DEPRECATED] prefix
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED')
      );
    });

    it('should still be constructable with config', () => {
      const loader = new SkillLoader({
        loadGlobal: false,
        loadProject: false,
      });
      expect(loader).toBeDefined();
    });
  });

  describe('Deprecated exports accessibility', () => {
    it('should still export SkillManager', () => {
      expect(SkillManager).toBeDefined();
      expect(typeof SkillManager).toBe('function');
    });

    it('should still export SkillLoader', () => {
      expect(SkillLoader).toBeDefined();
      expect(typeof SkillLoader).toBe('function');
    });
  });
});
