import { OperatingModeManager } from '../../../src/agent/operating-modes.js';
import type { AgentProfile } from '../../../src/agent/profiles/index.js';

// Mock the profile loader to avoid filesystem access
jest.mock('../../../src/agent/profiles/profile-loader.js', () => ({
  loadAgentProfiles: () => ({
    profiles: [
      {
        id: 'reviewer',
        name: 'Code Reviewer',
        description: 'Read-only code review profile',
        extends: 'balanced',
        allowedTools: ['view_file', 'search', 'grep'],
        maxToolRounds: 10,
        systemPromptAddition: 'You are reviewing code. Do not make changes.',
      },
    ],
    errors: [],
  }),
  mergeProfileWithMode: jest.requireActual('../../../src/agent/profiles/profile-loader.js').mergeProfileWithMode,
}));

describe('OperatingModeManager with Profiles', () => {
  let manager: OperatingModeManager;

  beforeEach(() => {
    manager = new OperatingModeManager('balanced');
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should load user profiles', () => {
    manager.loadUserProfiles();
    const profiles = manager.getUserProfiles();
    expect(profiles.length).toBe(1);
    expect(profiles[0].id).toBe('reviewer');
  });

  it('should activate a profile', () => {
    manager.loadUserProfiles();
    expect(manager.activateProfile('reviewer')).toBe(true);
    expect(manager.getActiveProfile()?.id).toBe('reviewer');
  });

  it('should return false for unknown profile', () => {
    manager.loadUserProfiles();
    expect(manager.activateProfile('nonexistent')).toBe(false);
  });

  it('should apply profile overrides to effective config', () => {
    manager.loadUserProfiles();
    manager.activateProfile('reviewer');

    const config = manager.getEffectiveModeConfig();
    expect(config.allowedTools).toEqual(['view_file', 'search', 'grep']);
    expect(config.maxToolRounds).toBe(10);
    expect(config.systemPromptAddition).toContain('You are reviewing code');
  });

  it('should deactivate profile', () => {
    manager.loadUserProfiles();
    manager.activateProfile('reviewer');
    manager.deactivateProfile();
    expect(manager.getActiveProfile()).toBeNull();
  });

  it('should return base config when no profile is active', () => {
    const effective = manager.getEffectiveModeConfig();
    const base = manager.getModeConfig();
    expect(effective).toEqual(base);
  });
});
