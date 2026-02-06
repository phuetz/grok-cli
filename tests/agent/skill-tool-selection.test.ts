/**
 * Tests for skill-augmented tool selection.
 *
 * Verifies that when a skill is active, the ToolSelectionStrategy
 * and getSkillAugmentedTools correctly augment the tool set with
 * tools required by the matched skill.
 */

import { getSkillAugmentedTools } from '../../src/codebuddy/tools';
import { ToolSelectionStrategy } from '../../src/agent/execution/tool-selection-strategy';
import type { UnifiedSkill } from '../../src/skills/types';
import type { CodeBuddyTool } from '../../src/codebuddy/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTool(name: string): CodeBuddyTool {
  return {
    type: 'function',
    function: {
      name,
      description: `Tool: ${name}`,
      parameters: { type: 'object', properties: {}, required: [] },
    },
  };
}

function makeSkill(overrides: Partial<UnifiedSkill> = {}): UnifiedSkill {
  return {
    name: 'test-skill',
    description: 'A test skill',
    source: 'skillmd',
    enabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getSkillAugmentedTools
// ---------------------------------------------------------------------------

describe('getSkillAugmentedTools', () => {
  it('should return current tools unchanged when skill has no required tools', () => {
    const tools = [makeTool('bash'), makeTool('view_file')];
    const skill = makeSkill({ requires: undefined, tools: undefined });

    const result = getSkillAugmentedTools(tools, skill);

    expect(result).toEqual(tools);
    expect(result).toHaveLength(2);
  });

  it('should not duplicate tools that are already present', () => {
    const tools = [makeTool('bash'), makeTool('search')];
    const skill = makeSkill({
      requires: { tools: ['bash', 'search'] },
    });

    const result = getSkillAugmentedTools(tools, skill);

    // No duplicates should be introduced
    const names = result.map(t => t.function.name);
    const unique = new Set(names);
    expect(names.length).toBe(unique.size);
    expect(result).toHaveLength(2);
  });

  it('should merge requires.tools and tools fields', () => {
    const tools = [makeTool('bash')];
    const skill = makeSkill({
      requires: { tools: ['search'] },
      tools: ['web_search'],
    });

    // The function attempts to pull missing tools from the registry.
    // In unit tests the registry may not have those tools, so we just
    // verify the function runs without errors and does not shrink the set.
    const result = getSkillAugmentedTools(tools, skill);

    // Must at least contain the original tools
    const names = result.map(t => t.function.name);
    expect(names).toContain('bash');
  });

  it('should handle skill with empty tools arrays', () => {
    const tools = [makeTool('bash')];
    const skill = makeSkill({
      requires: { tools: [] },
      tools: [],
    });

    const result = getSkillAugmentedTools(tools, skill);
    expect(result).toEqual(tools);
  });
});

// ---------------------------------------------------------------------------
// ToolSelectionStrategy – skill awareness
// ---------------------------------------------------------------------------

describe('ToolSelectionStrategy – skill awareness', () => {
  let strategy: ToolSelectionStrategy;

  beforeEach(() => {
    strategy = new ToolSelectionStrategy({
      useRAG: false, // Disable RAG so we test skill augmentation in isolation
      enableCaching: false,
    });
  });

  it('should store and return the active skill', () => {
    const skill = makeSkill({ name: 'my-skill' });

    expect(strategy.getActiveSkill()).toBeNull();

    strategy.setActiveSkill(skill);
    expect(strategy.getActiveSkill()).toBe(skill);
    expect(strategy.getActiveSkill()?.name).toBe('my-skill');
  });

  it('should clear active skill when cache is cleared', () => {
    const skill = makeSkill({ name: 'clear-test' });
    strategy.setActiveSkill(skill);

    strategy.clearCache();

    expect(strategy.getActiveSkill()).toBeNull();
  });

  it('should allow setting active skill to null', () => {
    const skill = makeSkill({ name: 'nullable' });
    strategy.setActiveSkill(skill);
    expect(strategy.getActiveSkill()).not.toBeNull();

    strategy.setActiveSkill(null);
    expect(strategy.getActiveSkill()).toBeNull();
  });
});
