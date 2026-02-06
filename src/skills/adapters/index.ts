/**
 * Skills Adapters
 *
 * Barrel export for skill format adapters.
 */

export {
  legacyToUnified,
  legacyLoadedToUnified,
  unifiedToLegacy,
  skillMdToUnified,
  unifiedToSkillMd,
} from './legacy-skill-adapter.js';

export type {
  LegacySkill,
  LegacySkillScript,
  LegacyLoadedSkill,
} from './legacy-skill-adapter.js';
