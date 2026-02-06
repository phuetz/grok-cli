/**
 * Tests for Legacy Skill Adapter
 *
 * Tests conversion between legacy JSON-based skills and the UnifiedSkill format.
 */

import {
  legacyToUnified,
  legacyLoadedToUnified,
  unifiedToLegacy,
  skillMdToUnified,
  unifiedToSkillMd,
  type LegacySkill,
  type LegacyLoadedSkill,
} from '../../src/skills/adapters/legacy-skill-adapter';
import type { Skill, UnifiedSkill } from '../../src/skills/types';

// ============================================================================
// Test Data
// ============================================================================

function createLegacySkill(overrides: Partial<LegacySkill> = {}): LegacySkill {
  return {
    name: 'test-skill',
    description: 'A test skill for unit testing',
    triggers: ['test', 'unit test', 'testing'],
    systemPrompt: 'You are a testing expert. Write reliable tests.',
    tools: ['view_file', 'search'],
    model: 'grok-2',
    priority: 8,
    autoActivate: true,
    ...overrides,
  };
}

function createLegacyLoadedSkill(overrides: Partial<LegacyLoadedSkill> = {}): LegacyLoadedSkill {
  return {
    ...createLegacySkill(),
    source: 'project',
    path: '/project/.codebuddy/skills/test-skill',
    loadedAt: Date.now(),
    eligible: true,
    ...overrides,
  };
}

function createSkillMd(overrides: Partial<Skill> = {}): Skill {
  return {
    metadata: {
      name: 'skillmd-test',
      description: 'A SKILL.md test skill',
      version: '1.0.0',
      author: 'Test Author',
      tags: ['testing', 'unit'],
      requires: {
        tools: ['bash', 'view_file'],
        env: ['NODE_ENV'],
      },
      openclaw: {
        category: 'testing',
        priority: 10,
        triggers: ['run tests', 'write tests'],
        examples: ['Run all tests', 'Write unit tests for this module'],
      },
    },
    content: {
      description: 'Execute tests and provide guidance on testing.',
      usage: 'Use when the user asks about testing.',
      examples: [
        { request: 'Run tests', response: 'Running test suite...' },
        { request: 'Write a unit test', response: 'Creating test file...' },
      ],
      steps: [
        { index: 0, description: 'Analyze the codebase', tool: 'search' },
        { index: 1, description: 'Write tests', tool: 'view_file' },
      ],
      tools: [
        { name: 'bash', args: { command: 'npm test' }, description: 'Run test suite' },
      ],
      codeBlocks: [
        { language: 'typescript', code: 'expect(result).toBe(true);', label: 'assertion' },
      ],
      rawMarkdown: '# Testing\n\nExecute tests and provide guidance.',
    },
    sourcePath: '/workspace/.codebuddy/skills/testing/SKILL.md',
    tier: 'workspace',
    loadedAt: new Date('2025-01-01'),
    enabled: true,
    ...overrides,
  };
}

// ============================================================================
// Legacy -> Unified Tests
// ============================================================================

describe('legacyToUnified', () => {
  it('should convert a basic legacy skill to unified format', () => {
    const legacy = createLegacySkill();
    const unified = legacyToUnified(legacy);

    expect(unified.name).toBe('test-skill');
    expect(unified.description).toBe('A test skill for unit testing');
    expect(unified.source).toBe('legacy');
    expect(unified.enabled).toBe(true);
    expect(unified.priority).toBe(8);
    expect(unified.triggers).toEqual(['test', 'unit test', 'testing']);
    expect(unified.systemPrompt).toBe('You are a testing expert. Write reliable tests.');
    expect(unified.tools).toEqual(['view_file', 'search']);
    expect(unified.model).toBe('grok-2');
    expect(unified.loadedAt).toBeInstanceOf(Date);
  });

  it('should set source to "bundled" when specified', () => {
    const legacy = createLegacySkill();
    const unified = legacyToUnified(legacy, { source: 'bundled' });

    expect(unified.source).toBe('bundled');
  });

  it('should set enabled to false when specified', () => {
    const legacy = createLegacySkill();
    const unified = legacyToUnified(legacy, { enabled: false });

    expect(unified.enabled).toBe(false);
  });

  it('should preserve the originalLegacy reference', () => {
    const legacy = createLegacySkill();
    const unified = legacyToUnified(legacy);

    expect(unified.originalLegacy).toBeDefined();
    expect(unified.originalLegacy!.name).toBe('test-skill');
    expect(unified.originalLegacy!.triggers).toEqual(['test', 'unit test', 'testing']);
    expect(unified.originalLegacy!.systemPrompt).toBe('You are a testing expert. Write reliable tests.');
    expect(unified.originalLegacy!.autoActivate).toBe(true);
  });

  it('should generate tags from triggers', () => {
    const legacy = createLegacySkill({
      triggers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'],
    });
    const unified = legacyToUnified(legacy);

    // Should cap at 10 tags
    expect(unified.tags).toHaveLength(10);
    expect(unified.tags).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
  });

  it('should handle legacy skill with no tools', () => {
    const legacy = createLegacySkill({ tools: undefined });
    const unified = legacyToUnified(legacy);

    expect(unified.tools).toBeUndefined();
  });

  it('should handle legacy skill with scripts', () => {
    const legacy = createLegacySkill({
      scripts: [
        { name: 'setup', command: 'npm install', runOn: 'activate', timeout: 30000 },
      ],
    });
    const unified = legacyToUnified(legacy);

    expect(unified.originalLegacy!.scripts).toHaveLength(1);
    expect(unified.originalLegacy!.scripts![0].name).toBe('setup');
    expect(unified.originalLegacy!.scripts![0].command).toBe('npm install');
  });

  it('should not mutate the original legacy skill', () => {
    const legacy = createLegacySkill();
    const originalTriggers = [...legacy.triggers];
    const unified = legacyToUnified(legacy);

    // Mutate the unified triggers
    unified.triggers!.push('modified');

    // Original should be unchanged
    expect(legacy.triggers).toEqual(originalTriggers);
  });
});

// ============================================================================
// Legacy Loaded -> Unified Tests
// ============================================================================

describe('legacyLoadedToUnified', () => {
  it('should convert a loaded legacy skill with project source', () => {
    const loaded = createLegacyLoadedSkill({ source: 'project' });
    const unified = legacyLoadedToUnified(loaded);

    expect(unified.source).toBe('legacy');
    expect(unified.sourcePath).toBe('/project/.codebuddy/skills/test-skill');
  });

  it('should convert a builtin loaded skill to bundled source', () => {
    const loaded = createLegacyLoadedSkill({ source: 'builtin' });
    const unified = legacyLoadedToUnified(loaded);

    expect(unified.source).toBe('bundled');
  });

  it('should convert a global loaded skill to legacy source', () => {
    const loaded = createLegacyLoadedSkill({ source: 'global' });
    const unified = legacyLoadedToUnified(loaded);

    expect(unified.source).toBe('legacy');
  });

  it('should convert loadedAt timestamp to Date', () => {
    const timestamp = 1700000000000;
    const loaded = createLegacyLoadedSkill({ loadedAt: timestamp });
    const unified = legacyLoadedToUnified(loaded);

    expect(unified.loadedAt).toBeInstanceOf(Date);
    expect(unified.loadedAt!.getTime()).toBe(timestamp);
  });

  it('should set enabled to false when not eligible', () => {
    const loaded = createLegacyLoadedSkill({ eligible: false });
    const unified = legacyLoadedToUnified(loaded);

    expect(unified.enabled).toBe(false);
  });
});

// ============================================================================
// Unified -> Legacy Tests
// ============================================================================

describe('unifiedToLegacy', () => {
  it('should convert a unified skill back to legacy format using originalLegacy', () => {
    const legacy = createLegacySkill();
    const unified = legacyToUnified(legacy);
    const converted = unifiedToLegacy(unified);

    expect(converted).not.toBeNull();
    expect(converted!.name).toBe('test-skill');
    expect(converted!.description).toBe('A test skill for unit testing');
    expect(converted!.triggers).toEqual(['test', 'unit test', 'testing']);
    expect(converted!.systemPrompt).toBe('You are a testing expert. Write reliable tests.');
    expect(converted!.tools).toEqual(['view_file', 'search']);
    expect(converted!.priority).toBe(8);
    expect(converted!.autoActivate).toBe(true);
  });

  it('should convert a unified skill without originalLegacy using triggers', () => {
    const unified: UnifiedSkill = {
      name: 'manual-skill',
      description: 'Manually created unified skill',
      source: 'skillmd',
      enabled: true,
      triggers: ['keyword1', 'keyword2'],
      systemPrompt: 'You are helpful.',
      tools: ['bash'],
      priority: 5,
    };

    const converted = unifiedToLegacy(unified);

    expect(converted).not.toBeNull();
    expect(converted!.name).toBe('manual-skill');
    expect(converted!.triggers).toEqual(['keyword1', 'keyword2']);
    expect(converted!.systemPrompt).toBe('You are helpful.');
    expect(converted!.autoActivate).toBe(true);
  });

  it('should return null when conversion is not possible', () => {
    const unified: UnifiedSkill = {
      name: 'empty-skill',
      description: 'A skill with no prompts or triggers',
      source: 'skillmd',
      enabled: true,
    };

    const converted = unifiedToLegacy(unified);

    expect(converted).toBeNull();
  });

  it('should use tags as triggers fallback', () => {
    const unified: UnifiedSkill = {
      name: 'tagged-skill',
      description: 'A skill with tags',
      source: 'skillmd',
      enabled: true,
      tags: ['react', 'frontend'],
      systemPrompt: 'React expert.',
    };

    const converted = unifiedToLegacy(unified);

    expect(converted).not.toBeNull();
    expect(converted!.triggers).toEqual(['react', 'frontend']);
  });

  it('should not mutate the original unified triggers when converting back', () => {
    const legacy = createLegacySkill();
    const unified = legacyToUnified(legacy);
    const converted = unifiedToLegacy(unified);

    converted!.triggers.push('modified');

    expect(unified.originalLegacy!.triggers).toEqual(['test', 'unit test', 'testing']);
  });
});

// ============================================================================
// SKILL.md -> Unified Tests
// ============================================================================

describe('skillMdToUnified', () => {
  it('should convert a SKILL.md skill to unified format', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.name).toBe('skillmd-test');
    expect(unified.description).toBe('A SKILL.md test skill');
    expect(unified.source).toBe('skillmd');
    expect(unified.enabled).toBe(true);
    expect(unified.version).toBe('1.0.0');
    expect(unified.author).toBe('Test Author');
    expect(unified.tags).toEqual(['testing', 'unit']);
    expect(unified.priority).toBe(10);
    expect(unified.triggers).toEqual(['run tests', 'write tests']);
  });

  it('should preserve examples from SKILL.md', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.examples).toHaveLength(2);
    expect(unified.examples![0].request).toBe('Run tests');
    expect(unified.examples![0].response).toBe('Running test suite...');
  });

  it('should preserve steps from SKILL.md', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.steps).toHaveLength(2);
    expect(unified.steps![0].description).toBe('Analyze the codebase');
    expect(unified.steps![1].tool).toBe('view_file');
  });

  it('should preserve tool invocations from SKILL.md', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.toolInvocations).toHaveLength(1);
    expect(unified.toolInvocations![0].name).toBe('bash');
    expect(unified.toolInvocations![0].args).toEqual({ command: 'npm test' });
  });

  it('should preserve code blocks from SKILL.md', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.codeBlocks).toHaveLength(1);
    expect(unified.codeBlocks![0].language).toBe('typescript');
    expect(unified.codeBlocks![0].label).toBe('assertion');
  });

  it('should set systemPrompt from content description', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.systemPrompt).toBe('Execute tests and provide guidance on testing.');
  });

  it('should set tools from requirements', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.tools).toEqual(['bash', 'view_file']);
  });

  it('should preserve sourcePath and tier', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.sourcePath).toBe('/workspace/.codebuddy/skills/testing/SKILL.md');
    expect(unified.tier).toBe('workspace');
  });

  it('should keep originalSkillMd reference', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);

    expect(unified.originalSkillMd).toBe(skillMd);
  });

  it('should handle SKILL.md with minimal metadata', () => {
    const skillMd = createSkillMd({
      metadata: {
        name: 'minimal',
        description: 'Minimal skill',
      },
      content: {
        description: 'Simple content',
        rawMarkdown: 'Simple content',
      },
    });
    const unified = skillMdToUnified(skillMd);

    expect(unified.name).toBe('minimal');
    expect(unified.triggers).toBeUndefined();
    expect(unified.tags).toBeUndefined();
    expect(unified.priority).toBeUndefined();
  });
});

// ============================================================================
// Unified -> SKILL.md Tests
// ============================================================================

describe('unifiedToSkillMd', () => {
  it('should return original SKILL.md when available', () => {
    const skillMd = createSkillMd();
    const unified = skillMdToUnified(skillMd);
    const converted = unifiedToSkillMd(unified);

    expect(converted).toBe(skillMd);
  });

  it('should construct a SKILL.md skill from a unified skill without original', () => {
    const unified: UnifiedSkill = {
      name: 'constructed-skill',
      description: 'Constructed from unified format',
      source: 'legacy',
      enabled: true,
      version: '2.0.0',
      author: 'Tester',
      tags: ['testing'],
      triggers: ['construct'],
      systemPrompt: 'Be helpful.',
      priority: 5,
    };

    const converted = unifiedToSkillMd(unified);

    expect(converted.metadata.name).toBe('constructed-skill');
    expect(converted.metadata.description).toBe('Constructed from unified format');
    expect(converted.metadata.version).toBe('2.0.0');
    expect(converted.metadata.author).toBe('Tester');
    expect(converted.metadata.tags).toEqual(['testing']);
    expect(converted.metadata.openclaw?.priority).toBe(5);
    expect(converted.metadata.openclaw?.triggers).toEqual(['construct']);
    expect(converted.content.description).toBe('Be helpful.');
    expect(converted.enabled).toBe(true);
  });

  it('should default to workspace tier', () => {
    const unified: UnifiedSkill = {
      name: 'no-tier',
      description: 'No tier specified',
      source: 'legacy',
      enabled: true,
      systemPrompt: 'Hello',
    };

    const converted = unifiedToSkillMd(unified);

    expect(converted.tier).toBe('workspace');
  });
});

// ============================================================================
// Round-Trip Tests
// ============================================================================

describe('round-trip conversions', () => {
  it('should preserve legacy skill data through legacy -> unified -> legacy', () => {
    const original = createLegacySkill();
    const unified = legacyToUnified(original);
    const roundTripped = unifiedToLegacy(unified);

    expect(roundTripped).not.toBeNull();
    expect(roundTripped!.name).toBe(original.name);
    expect(roundTripped!.description).toBe(original.description);
    expect(roundTripped!.triggers).toEqual(original.triggers);
    expect(roundTripped!.systemPrompt).toBe(original.systemPrompt);
    expect(roundTripped!.tools).toEqual(original.tools);
    expect(roundTripped!.priority).toBe(original.priority);
    expect(roundTripped!.autoActivate).toBe(original.autoActivate);
  });

  it('should preserve SKILL.md data through skillmd -> unified -> skillmd', () => {
    const original = createSkillMd();
    const unified = skillMdToUnified(original);
    const roundTripped = unifiedToSkillMd(unified);

    // Should return the exact same reference since originalSkillMd is preserved
    expect(roundTripped).toBe(original);
  });
});
