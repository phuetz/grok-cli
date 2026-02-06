/**
 * Legacy Skill Adapter
 *
 * Converts between legacy JSON-based skills and the UnifiedSkill format.
 * Handles differences in parameter schemas, step definitions, triggers, etc.
 */

import type {
  UnifiedSkill,
  Skill,
  SkillTier,
  LegacySkillRef,
} from '../types.js';

// ============================================================================
// Legacy Skill Shape
// ============================================================================

/**
 * The shape of a legacy skill from skill-manager.ts.
 * Duplicated here to avoid circular imports with skill-manager.ts
 * which exports its own `Skill` interface.
 */
export interface LegacySkill {
  name: string;
  description: string;
  triggers: string[];
  systemPrompt: string;
  tools?: string[];
  model?: string;
  priority?: number;
  autoActivate?: boolean;
  scripts?: LegacySkillScript[];
}

export interface LegacySkillScript {
  name: string;
  command: string;
  runOn: 'activate' | 'complete' | 'both';
  timeout?: number;
}

/**
 * The shape of a loaded skill from skill-loader.ts.
 */
export interface LegacyLoadedSkill extends LegacySkill {
  source: 'builtin' | 'global' | 'project' | 'agent';
  path?: string;
  agentId?: string;
  loadedAt: number;
  eligible: boolean;
}

// ============================================================================
// Legacy -> Unified Conversion
// ============================================================================

/**
 * Convert a legacy JSON-based skill to a UnifiedSkill.
 *
 * @param legacySkill - The legacy skill object from SkillManager or SkillLoader
 * @param options - Optional conversion options
 * @returns A UnifiedSkill representation
 */
export function legacyToUnified(
  legacySkill: LegacySkill,
  options?: {
    /** Override the source type (defaults to 'legacy') */
    source?: 'legacy' | 'bundled';
    /** Mark as enabled/disabled (defaults to true) */
    enabled?: boolean;
  }
): UnifiedSkill {
  const source = options?.source ?? 'legacy';
  const enabled = options?.enabled ?? true;

  const unified: UnifiedSkill = {
    name: legacySkill.name,
    description: legacySkill.description || '',
    source,
    enabled,
    priority: legacySkill.priority,
    triggers: legacySkill.triggers ? [...legacySkill.triggers] : undefined,
    systemPrompt: legacySkill.systemPrompt,
    tools: legacySkill.tools ? [...legacySkill.tools] : undefined,
    model: legacySkill.model,
    loadedAt: new Date(),
    originalLegacy: {
      name: legacySkill.name,
      description: legacySkill.description,
      triggers: legacySkill.triggers ? [...legacySkill.triggers] : [],
      systemPrompt: legacySkill.systemPrompt,
      tools: legacySkill.tools ? [...legacySkill.tools] : undefined,
      model: legacySkill.model,
      priority: legacySkill.priority,
      autoActivate: legacySkill.autoActivate,
      scripts: legacySkill.scripts ? legacySkill.scripts.map(s => ({ ...s })) : undefined,
    },
  };

  // Convert triggers to tags for searchability
  if (legacySkill.triggers && legacySkill.triggers.length > 0) {
    unified.tags = legacySkill.triggers.slice(0, 10);
  }

  return unified;
}

/**
 * Convert a loaded legacy skill (from SkillLoader) to a UnifiedSkill.
 * Includes additional metadata from the loader.
 *
 * @param loadedSkill - The loaded skill from SkillLoader
 * @returns A UnifiedSkill representation
 */
export function legacyLoadedToUnified(loadedSkill: LegacyLoadedSkill): UnifiedSkill {
  const sourceMap: Record<string, 'legacy' | 'bundled'> = {
    builtin: 'bundled',
    global: 'legacy',
    project: 'legacy',
    agent: 'legacy',
  };

  const unified = legacyToUnified(loadedSkill, {
    source: sourceMap[loadedSkill.source] || 'legacy',
    enabled: loadedSkill.eligible,
  });

  unified.sourcePath = loadedSkill.path;
  unified.loadedAt = new Date(loadedSkill.loadedAt);

  return unified;
}

// ============================================================================
// Unified -> Legacy Conversion
// ============================================================================

/**
 * Convert a UnifiedSkill back to a legacy skill format.
 * Useful for backward-compatible operations that require the old format.
 *
 * @param unified - The unified skill to convert
 * @returns A legacy skill object, or null if conversion is not possible
 */
export function unifiedToLegacy(unified: UnifiedSkill): LegacySkill | null {
  // If we have the original legacy reference, prefer that
  if (unified.originalLegacy) {
    return {
      name: unified.originalLegacy.name,
      description: unified.originalLegacy.description,
      triggers: [...unified.originalLegacy.triggers],
      systemPrompt: unified.originalLegacy.systemPrompt,
      tools: unified.originalLegacy.tools ? [...unified.originalLegacy.tools] : undefined,
      model: unified.originalLegacy.model,
      priority: unified.originalLegacy.priority,
      autoActivate: unified.originalLegacy.autoActivate,
      scripts: unified.originalLegacy.scripts
        ? unified.originalLegacy.scripts.map(s => ({ ...s }))
        : undefined,
    };
  }

  // Convert from unified/skillmd format
  const systemPrompt = unified.systemPrompt || '';
  const triggers = unified.triggers || unified.tags || [];

  if (!systemPrompt && !triggers.length) {
    return null;
  }

  return {
    name: unified.name,
    description: unified.description,
    triggers: [...triggers],
    systemPrompt,
    tools: unified.tools ? [...unified.tools] : undefined,
    model: unified.model,
    priority: unified.priority,
    autoActivate: true,
  };
}

// ============================================================================
// SKILL.md -> Unified Conversion
// ============================================================================

/**
 * Convert a SKILL.md skill to a UnifiedSkill.
 *
 * @param skill - The SKILL.md Skill object
 * @returns A UnifiedSkill representation
 */
export function skillMdToUnified(skill: Skill): UnifiedSkill {
  const unified: UnifiedSkill = {
    name: skill.metadata.name,
    description: skill.metadata.description,
    source: 'skillmd',
    enabled: skill.enabled,
    version: skill.metadata.version,
    author: skill.metadata.author,
    tags: skill.metadata.tags ? [...skill.metadata.tags] : undefined,
    priority: skill.metadata.openclaw?.priority,
    triggers: skill.metadata.openclaw?.triggers
      ? [...skill.metadata.openclaw.triggers]
      : undefined,
    examples: skill.content.examples
      ? skill.content.examples.map(e => ({ ...e }))
      : undefined,
    systemPrompt: skill.content.description || skill.content.rawMarkdown,
    steps: skill.content.steps
      ? skill.content.steps.map(s => ({ ...s }))
      : undefined,
    toolInvocations: skill.content.tools
      ? skill.content.tools.map(t => ({
          name: t.name,
          args: t.args ? { ...t.args } : undefined,
          description: t.description,
        }))
      : undefined,
    codeBlocks: skill.content.codeBlocks
      ? skill.content.codeBlocks.map(b => ({ ...b }))
      : undefined,
    tools: skill.metadata.requires?.tools
      ? [...skill.metadata.requires.tools]
      : undefined,
    sourcePath: skill.sourcePath,
    tier: skill.tier,
    loadedAt: skill.loadedAt,
    requires: skill.metadata.requires,
    originalSkillMd: skill,
  };

  return unified;
}

// ============================================================================
// Unified -> SKILL.md Conversion
// ============================================================================

/**
 * Convert a UnifiedSkill back to a SKILL.md Skill format.
 * Useful for operations that require the SKILL.md format.
 *
 * @param unified - The unified skill to convert
 * @returns A SKILL.md Skill object
 */
export function unifiedToSkillMd(unified: UnifiedSkill): Skill {
  // If we have the original SKILL.md reference, prefer that
  if (unified.originalSkillMd) {
    return unified.originalSkillMd;
  }

  // Convert from unified format
  return {
    metadata: {
      name: unified.name,
      description: unified.description,
      version: unified.version,
      author: unified.author,
      tags: unified.tags ? [...unified.tags] : undefined,
      requires: unified.requires,
      openclaw: {
        priority: unified.priority,
        triggers: unified.triggers ? [...unified.triggers] : undefined,
        examples: unified.examples
          ? unified.examples.map(e => e.request)
          : undefined,
      },
    },
    content: {
      description: unified.systemPrompt || unified.description,
      examples: unified.examples
        ? unified.examples.map(e => ({ ...e }))
        : undefined,
      steps: unified.steps
        ? unified.steps.map(s => ({ ...s }))
        : undefined,
      tools: unified.toolInvocations
        ? unified.toolInvocations.map(t => ({
            name: t.name,
            args: t.args ? { ...t.args } : undefined,
            description: t.description,
          }))
        : undefined,
      codeBlocks: unified.codeBlocks
        ? unified.codeBlocks.map(b => ({ ...b }))
        : undefined,
      rawMarkdown: unified.systemPrompt || unified.description,
    },
    sourcePath: unified.sourcePath || 'generated',
    tier: unified.tier || 'workspace' as SkillTier,
    loadedAt: unified.loadedAt || new Date(),
    enabled: unified.enabled,
  };
}
