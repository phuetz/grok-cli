/**
 * Profile Loader
 *
 * Loads agent profiles from JSON files in:
 * - ~/.codebuddy/agents/*.json (user profiles)
 * - .codebuddy/agents/*.json (project profiles)
 *
 * Project profiles override user profiles with the same ID.
 *
 * @module agent/profiles
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentProfile, ProfileLoadResult } from './types.js';
import { ModeConfig } from '../operating-modes.js';
import { logger } from '../../utils/logger.js';

const USER_PROFILES_DIR = path.join(os.homedir(), '.codebuddy', 'agents');
const PROJECT_PROFILES_DIR = path.join(process.cwd(), '.codebuddy', 'agents');

/**
 * Load all agent profiles from user and project directories.
 * Project profiles override user profiles with the same ID.
 */
export function loadAgentProfiles(): ProfileLoadResult {
  const profiles: Map<string, AgentProfile> = new Map();
  const errors: Array<{ file: string; error: string }> = [];

  // Load user profiles first
  loadProfilesFromDir(USER_PROFILES_DIR, profiles, errors);

  // Load project profiles (overrides user)
  loadProfilesFromDir(PROJECT_PROFILES_DIR, profiles, errors);

  return {
    profiles: [...profiles.values()],
    errors,
  };
}

function loadProfilesFromDir(
  dir: string,
  profiles: Map<string, AgentProfile>,
  errors: Array<{ file: string; error: string }>
): void {
  try {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);

        if (!data.id || !data.name) {
          errors.push({ file: filePath, error: 'Profile must have "id" and "name" fields' });
          continue;
        }

        const profile: AgentProfile = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          safety: data.safety,
          extends: data.extends,
          allowedTools: data.allowedTools,
          blockedTools: data.blockedTools,
          systemPromptAddition: data.systemPromptAddition,
          maxToolRounds: data.maxToolRounds,
          enableExtendedThinking: data.enableExtendedThinking,
          thinkingBudget: data.thinkingBudget,
          preferredModel: data.preferredModel,
          maxCostPerRequest: data.maxCostPerRequest,
          metadata: data.metadata,
        };

        profiles.set(profile.id, profile);
        logger.debug(`Loaded agent profile: ${profile.id} from ${filePath}`);
      } catch (error) {
        errors.push({ file: filePath, error: String(error) });
      }
    }
  } catch (error) {
    // Directory doesn't exist or isn't readable, that's fine
    logger.debug(`Could not read profiles from ${dir}`, { error });
  }
}

/**
 * Merge an agent profile's overrides into a base ModeConfig.
 * Returns a new config with profile values overriding the base where specified.
 */
export function mergeProfileWithMode(
  base: ModeConfig,
  profile: AgentProfile
): ModeConfig {
  const merged = { ...base };

  if (profile.allowedTools !== undefined) {
    merged.allowedTools = profile.allowedTools;
  }

  if (profile.blockedTools && Array.isArray(merged.allowedTools)) {
    merged.allowedTools = merged.allowedTools.filter(
      t => !profile.blockedTools!.includes(t)
    );
  }

  if (profile.systemPromptAddition) {
    merged.systemPromptAddition = (merged.systemPromptAddition || '') + '\n' + profile.systemPromptAddition;
  }

  if (profile.maxToolRounds !== undefined) {
    merged.maxToolRounds = profile.maxToolRounds;
  }

  if (profile.enableExtendedThinking !== undefined) {
    merged.enableExtendedThinking = profile.enableExtendedThinking;
  }

  if (profile.thinkingBudget !== undefined) {
    merged.thinkingBudget = profile.thinkingBudget;
  }

  if (profile.preferredModel !== undefined) {
    merged.preferredModel = profile.preferredModel;
  }

  if (profile.maxCostPerRequest !== undefined) {
    merged.maxCostPerRequest = profile.maxCostPerRequest;
  }

  return merged;
}
