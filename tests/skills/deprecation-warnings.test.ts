/**
 * Tests for legacy skill system deprecation warnings
 */

import { SkillManager } from '../../src/skills/skill-manager.js';
import { SkillLoader } from '../../src/skills/skill-loader.js';

describe('Legacy Skill System Deprecation', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('SkillManager deprecation', () => {
    it('should emit deprecation warning on construction', () => {
      new SkillManager('/tmp/test');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SkillManager')
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
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SkillLoader')
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
