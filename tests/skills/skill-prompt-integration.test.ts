/**
 * Tests for skill prompt integration in the SystemPromptBuilder.
 *
 * Verifies that when a matched UnifiedSkill is provided via
 * withSkillContext(), the builder injects the skill's system
 * prompt / description as a high-priority section in the output.
 */

import { SystemPromptBuilder } from '../../src/agent/system-prompt-builder';
import type { UnifiedSkill } from '../../src/skills/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSkill(overrides: Partial<UnifiedSkill> = {}): UnifiedSkill {
  return {
    name: 'test-skill',
    description: 'A test skill for unit tests.',
    source: 'skillmd',
    enabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SystemPromptBuilder – withSkillContext
// ---------------------------------------------------------------------------

describe('SystemPromptBuilder – withSkillContext', () => {
  let builder: SystemPromptBuilder;

  beforeEach(() => {
    builder = new SystemPromptBuilder({
      includeTools: false,
      includeSkills: false,
      includeMemory: false,
      includeDatetime: false,
      includePlatform: false,
    });
  });

  it('should include skill description in the built prompt', () => {
    const skill = makeSkill({ description: 'Expert at TypeScript refactoring.' });

    const prompt = builder
      .withBaseInstructions('You are Code Buddy.')
      .withSkillContext(skill)
      .build();

    expect(prompt).toContain('Expert at TypeScript refactoring.');
    expect(prompt).toContain('Active Skill: test-skill');
  });

  it('should include skill systemPrompt when available', () => {
    const skill = makeSkill({
      name: 'react-specialist',
      description: 'React expert',
      systemPrompt: 'Always use functional components and hooks.',
    });

    const prompt = builder
      .withBaseInstructions('Base instructions.')
      .withSkillContext(skill)
      .build();

    expect(prompt).toContain('Always use functional components and hooks.');
    expect(prompt).toContain('Active Skill: react-specialist');
  });

  it('should include skill steps when present', () => {
    const skill = makeSkill({
      steps: [
        { index: 1, description: 'Analyze the code', tool: 'view_file' },
        { index: 2, description: 'Apply changes', tool: 'str_replace_editor' },
      ],
    });

    const prompt = builder
      .withBaseInstructions('Base')
      .withSkillContext(skill)
      .build();

    expect(prompt).toContain('1. Analyze the code (use: view_file)');
    expect(prompt).toContain('2. Apply changes (use: str_replace_editor)');
  });

  it('should include required tools list', () => {
    const skill = makeSkill({
      requires: { tools: ['bash', 'search'] },
      tools: ['web_search'],
    });

    const prompt = builder
      .withBaseInstructions('Base')
      .withSkillContext(skill)
      .build();

    expect(prompt).toContain('**Required tools**');
    expect(prompt).toContain('bash');
    expect(prompt).toContain('search');
    expect(prompt).toContain('web_search');
  });

  it('should deduplicate required tools from requires.tools and tools', () => {
    const skill = makeSkill({
      requires: { tools: ['bash'] },
      tools: ['bash', 'search'],
    });

    const prompt = builder
      .withBaseInstructions('Base')
      .withSkillContext(skill)
      .build();

    // Count occurrences of 'bash' in the required tools line
    const lines = prompt.split('\n');
    const requiredLine = lines.find(l => l.includes('**Required tools**'));
    expect(requiredLine).toBeDefined();

    // bash should appear only once in the tools list
    const toolsList = requiredLine!.split('**Required tools**: ')[1];
    const toolNames = toolsList.split(', ');
    const bashCount = toolNames.filter(t => t === 'bash').length;
    expect(bashCount).toBe(1);
  });

  it('should not include active skill section when no skill is set', () => {
    const prompt = builder
      .withBaseInstructions('Base instructions.')
      .build();

    expect(prompt).not.toContain('Active Skill');
  });

  it('should clear skill context on reset', () => {
    const skill = makeSkill({ name: 'will-be-reset' });

    builder
      .withBaseInstructions('Base')
      .withSkillContext(skill);

    builder.reset();

    // After reset, build should not contain the skill
    const prompt = builder
      .withBaseInstructions('Base after reset.')
      .build();

    expect(prompt).not.toContain('will-be-reset');
    expect(prompt).not.toContain('Active Skill');
  });

  it('should replace skill context when called multiple times', () => {
    const skill1 = makeSkill({ name: 'first-skill', description: 'First' });
    const skill2 = makeSkill({ name: 'second-skill', description: 'Second' });

    const prompt = builder
      .withBaseInstructions('Base')
      .withSkillContext(skill1)
      .withSkillContext(skill2)
      .build();

    // Only the second skill should be present
    expect(prompt).toContain('second-skill');
    expect(prompt).toContain('Second');
    // First skill should NOT be present
    expect(prompt).not.toContain('first-skill');
  });

  it('should place skill context at high priority (near top of output)', () => {
    const skill = makeSkill({
      name: 'high-priority-skill',
      description: 'High priority skill content.',
    });

    const prompt = builder
      .withBaseInstructions('Base instructions here.')
      .withSkillContext(skill)
      .withMode('code')
      .build();

    // The active skill section should appear before the mode section
    const skillIdx = prompt.indexOf('Active Skill: high-priority-skill');
    const modeIdx = prompt.indexOf('Operating Mode');

    expect(skillIdx).toBeGreaterThan(-1);
    expect(modeIdx).toBeGreaterThan(-1);
    expect(skillIdx).toBeLessThan(modeIdx);
  });

  it('should allow clearing skill context with null', () => {
    const skill = makeSkill({ name: 'clearable' });

    const prompt = builder
      .withBaseInstructions('Base')
      .withSkillContext(skill)
      .withSkillContext(null)
      .build();

    expect(prompt).not.toContain('Active Skill');
    expect(prompt).not.toContain('clearable');
  });
});
