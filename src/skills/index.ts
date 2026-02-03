/**
 * Skills Module
 *
 * Two skill systems available:
 * 1. Legacy JSON-based skills (skill-manager, skill-loader)
 * 2. OpenClaw-inspired SKILL.md natural language skills (registry, executor)
 *
 * The SKILL.md system uses YAML frontmatter + Markdown for natural language
 * skill definitions with three-tier loading (workspace > managed > bundled).
 */

// Legacy skill system
export * from "./skill-manager.js";
export * from "./skill-loader.js";
export * from "./eligibility.js";

// SKILL.md natural language system (OpenClaw-inspired)
// Re-export with "Md" suffix to avoid conflicts with legacy types
export type {
  SkillMetadata as SkillMdMetadata,
  SkillContent as SkillMdContent,
  Skill as SkillMd,
  SkillTier as SkillMdTier,
  SkillMatch as SkillMdMatch,
  SkillSearchOptions as SkillMdSearchOptions,
  SkillExecutionContext as SkillMdExecutionContext,
  SkillExecutionResult as SkillMdExecutionResult,
  SkillRequirements as SkillMdRequirements,
} from './types.js';
export { parseSkillFile, validateSkill, serializeSkill } from './parser.js';
export { SkillRegistry, getSkillRegistry, resetSkillRegistry } from './registry.js';
export { SkillExecutor, getSkillExecutor, resetSkillExecutor } from './executor.js';
export type { SkillExecutorConfig, ToolExecutorFn, CodeExecutorFn } from './executor.js';

// ============================================================================
// Bundled Skills Path
// ============================================================================

import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the path to bundled SKILL.md skills
 */
export function getBundledSkillsPath(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.join(__dirname, 'bundled');
  } catch {
    return path.join(__dirname, 'bundled');
  }
}

// ============================================================================
// Convenience Functions for SKILL.md System
// ============================================================================

import { getSkillRegistry } from './registry.js';
import { getSkillExecutor } from './executor.js';
import type { Skill as SkillMdType, SkillExecutionContext, SkillExecutionResult, SkillMatch as SkillMdMatchType } from './types.js';

/**
 * Initialize the SKILL.md skills system
 */
export async function initializeSkills(): Promise<void> {
  const registry = getSkillRegistry({
    bundledPath: getBundledSkillsPath(),
  });
  await registry.load();
}

/**
 * Find the best SKILL.md skill for a request
 */
export function findSkill(request: string): SkillMdMatchType | null {
  const registry = getSkillRegistry();
  return registry.findBestMatch(request);
}

/**
 * Execute a SKILL.md skill by name
 */
export async function executeSkill(
  skillName: string,
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  const registry = getSkillRegistry();
  const skill = registry.get(skillName);

  if (!skill) {
    return {
      success: false,
      error: `Skill not found: ${skillName}`,
      duration: 0,
    };
  }

  const executor = getSkillExecutor();
  return executor.execute(skill, context);
}

/**
 * List all available SKILL.md skills
 */
export function listSkillMdSkills(): SkillMdType[] {
  const registry = getSkillRegistry();
  return registry.list();
}

/**
 * Search for SKILL.md skills
 */
export function searchSkillMd(query: string, limit?: number): SkillMdMatchType[] {
  const registry = getSkillRegistry();
  return registry.search({ query, limit });
}
