/**
 * Model Profile Manager Tests
 */

import {
  ModelProfileManager,
  DEFAULT_PROFILE_MANAGER_CONFIG,
} from '../../../src/auth/oauth/index.js';

describe('ModelProfileManager', () => {
  let manager: ModelProfileManager;

  beforeEach(() => {
    manager = new ModelProfileManager();
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('profile management', () => {
    it('should have default profiles', () => {
      const profiles = manager.getAllProfiles();
      expect(profiles.length).toBeGreaterThan(0);

      // Should have Grok, OpenAI, Anthropic, Google, Ollama
      const ids = profiles.map(p => p.id);
      expect(ids).toContain('grok-default');
      expect(ids).toContain('openai-default');
      expect(ids).toContain('anthropic-default');
      expect(ids).toContain('google-default');
      expect(ids).toContain('ollama-local');
    });

    it('should add custom profile', () => {
      manager.addProfile({
        id: 'custom-profile',
        name: 'Custom Provider',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'test-key',
        priority: 50,
        models: ['custom-model'],
        enabled: true,
      });

      const profile = manager.getProfile('custom-profile');
      expect(profile).toBeDefined();
      expect(profile?.name).toBe('Custom Provider');
      expect(profile?.circuitState).toBe('closed');
    });

    it('should remove profile', () => {
      manager.addProfile({
        id: 'to-remove',
        name: 'Remove Me',
        providerId: 'openai',
        authType: 'api_key',
        priority: 10,
        models: ['test'],
        enabled: true,
      });

      expect(manager.removeProfile('to-remove')).toBe(true);
      expect(manager.getProfile('to-remove')).toBeUndefined();
    });

    it('should enable profile', () => {
      manager.addProfile({
        id: 'disabled',
        name: 'Disabled',
        providerId: 'openai',
        authType: 'api_key',
        priority: 10,
        models: ['test'],
        enabled: false,
      });

      expect(manager.enableProfile('disabled')).toBe(true);
      expect(manager.getProfile('disabled')?.enabled).toBe(true);
    });

    it('should disable profile', () => {
      manager.addProfile({
        id: 'enabled',
        name: 'Enabled',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'key',
        priority: 10,
        models: ['test'],
        enabled: true,
      });

      expect(manager.disableProfile('enabled')).toBe(true);
      expect(manager.getProfile('enabled')?.enabled).toBe(false);
    });

    it('should get enabled profiles sorted by priority', () => {
      manager.addProfile({
        id: 'low',
        name: 'Low',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'key',
        priority: 10,
        models: ['test'],
        enabled: true,
      });

      manager.addProfile({
        id: 'high',
        name: 'High',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'key',
        priority: 200,
        models: ['test'],
        enabled: true,
      });

      const enabled = manager.getEnabledProfiles();
      const highIndex = enabled.findIndex(p => p.id === 'high');
      const lowIndex = enabled.findIndex(p => p.id === 'low');

      expect(highIndex).toBeLessThan(lowIndex);
    });
  });

  describe('profile selection', () => {
    beforeEach(() => {
      // Add a ready profile
      manager.addProfile({
        id: 'ready-profile',
        name: 'Ready',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'test-key',
        priority: 150,
        models: ['gpt-4', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4',
        enabled: true,
      });
    });

    it('should select highest priority ready profile', () => {
      const selection = manager.selectProfile();

      expect(selection).not.toBeNull();
      expect(selection?.profile.id).toBe('ready-profile');
    });

    it('should select profile that supports the model', () => {
      manager.addProfile({
        id: 'other-profile',
        name: 'Other',
        providerId: 'anthropic',
        authType: 'api_key',
        apiKey: 'key',
        priority: 200,
        models: ['claude-3-opus'],
        enabled: true,
      });

      const selection = manager.selectProfile('gpt-4');

      expect(selection).not.toBeNull();
      expect(selection?.profile.id).toBe('ready-profile');
      expect(selection?.model).toBe('gpt-4');
    });

    it('should skip profiles with open circuit', () => {
      const profile = manager.getProfile('ready-profile');
      if (profile) {
        profile.circuitState = 'open';
      }

      const selection = manager.selectProfile();

      // Should not select the profile with open circuit
      expect(selection?.profile.id).not.toBe('ready-profile');
    });

    it('should emit profile:selected event', () => {
      const handler = jest.fn();
      manager.on('profile:selected', handler);

      manager.selectProfile();

      expect(handler).toHaveBeenCalled();
    });

    it('should return null if no profile available', () => {
      // Disable all profiles
      for (const profile of manager.getAllProfiles()) {
        manager.disableProfile(profile.id);
      }

      const selection = manager.selectProfile();
      expect(selection).toBeNull();
    });
  });

  describe('failure tracking', () => {
    beforeEach(() => {
      manager.addProfile({
        id: 'test-profile',
        name: 'Test',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'key',
        priority: 100,
        models: ['test'],
        enabled: true,
      });
    });

    it('should record failure', () => {
      manager.recordFailure('test-profile');

      const profile = manager.getProfile('test-profile');
      expect(profile?.failureCount).toBe(1);
      expect(profile?.lastFailureAt).toBeDefined();
    });

    it('should open circuit after threshold', () => {
      // Record failures up to threshold
      for (let i = 0; i < DEFAULT_PROFILE_MANAGER_CONFIG.circuitBreakerThreshold; i++) {
        manager.recordFailure('test-profile');
      }

      const profile = manager.getProfile('test-profile');
      expect(profile?.circuitState).toBe('open');
    });

    it('should reset failure count on success', () => {
      manager.recordFailure('test-profile');
      manager.recordFailure('test-profile');
      manager.recordSuccess('test-profile');

      const profile = manager.getProfile('test-profile');
      expect(profile?.failureCount).toBe(0);
    });

    it('should close circuit on success when half-open', () => {
      const profile = manager.getProfile('test-profile');
      if (profile) {
        profile.circuitState = 'half-open';
      }

      manager.recordSuccess('test-profile');

      expect(manager.getProfile('test-profile')?.circuitState).toBe('closed');
    });
  });

  describe('failover', () => {
    beforeEach(() => {
      // Disable all default profiles first
      for (const profile of manager.getAllProfiles()) {
        manager.disableProfile(profile.id);
      }

      manager.addProfile({
        id: 'primary',
        name: 'Primary',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'key1',
        priority: 100,
        models: ['model-a'],
        enabled: true,
      });

      manager.addProfile({
        id: 'backup',
        name: 'Backup',
        providerId: 'anthropic',
        authType: 'api_key',
        apiKey: 'key2',
        priority: 50,
        models: ['model-a'],
        enabled: true,
      });
    });

    it('should failover to next available profile', async () => {
      const selection = await manager.getNextAvailableProfile('primary');

      expect(selection).not.toBeNull();
      expect(selection?.profile.id).toBe('backup');
      expect(selection?.reason).toBe('failover');
    });

    it('should record failure when getting next profile', async () => {
      await manager.getNextAvailableProfile('primary');

      const profile = manager.getProfile('primary');
      expect(profile?.failureCount).toBe(1);
    });

    it('should emit profile:failover event', async () => {
      const handler = jest.fn();
      manager.on('profile:failover', handler);

      await manager.getNextAvailableProfile('primary');

      expect(handler).toHaveBeenCalledWith('primary', 'backup');
    });
  });

  describe('authentication check', () => {
    it('should report api_key profile as ready when key exists', () => {
      manager.addProfile({
        id: 'with-key',
        name: 'With Key',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'test-key',
        priority: 100,
        models: ['test'],
        enabled: true,
      });

      const profile = manager.getProfile('with-key');
      expect(manager.isProfileReady(profile!)).toBe(true);
    });

    it('should report api_key profile as not ready without key', () => {
      manager.addProfile({
        id: 'no-key',
        name: 'No Key',
        providerId: 'openai',
        authType: 'api_key',
        priority: 100,
        models: ['test'],
        enabled: true,
      });

      const profile = manager.getProfile('no-key');
      expect(manager.isProfileReady(profile!)).toBe(false);
    });

    it('should report oauth profile as not ready without manager', () => {
      manager.addProfile({
        id: 'oauth-profile',
        name: 'OAuth',
        providerId: 'openai',
        authType: 'oauth',
        credentialId: 'cred-123',
        priority: 100,
        models: ['test'],
        enabled: true,
      });

      const profile = manager.getProfile('oauth-profile');
      expect(manager.isProfileReady(profile!)).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should return correct stats', () => {
      manager.addProfile({
        id: 'enabled-1',
        name: 'E1',
        providerId: 'openai',
        authType: 'api_key',
        priority: 100,
        models: ['test'],
        enabled: true,
      });

      manager.addProfile({
        id: 'disabled-1',
        name: 'D1',
        providerId: 'openai',
        authType: 'api_key',
        priority: 100,
        models: ['test'],
        enabled: false,
      });

      const stats = manager.getStats();
      expect(stats.totalProfiles).toBeGreaterThanOrEqual(7); // 5 default + 2 new
      expect(stats.enabledProfiles).toBeGreaterThanOrEqual(1);
    });

    it('should track open circuits', () => {
      manager.addProfile({
        id: 'open-circuit',
        name: 'Open',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'key',
        priority: 100,
        models: ['test'],
        enabled: true,
      });

      // Open circuit
      for (let i = 0; i < DEFAULT_PROFILE_MANAGER_CONFIG.circuitBreakerThreshold; i++) {
        manager.recordFailure('open-circuit');
      }

      const stats = manager.getStats();
      expect(stats.openCircuits).toBeGreaterThanOrEqual(1);
    });
  });

  describe('model matching', () => {
    beforeEach(() => {
      manager.addProfile({
        id: 'wildcard-profile',
        name: 'Wildcard',
        providerId: 'openai',
        authType: 'api_key',
        apiKey: 'key',
        priority: 100,
        models: ['gpt-4*', 'gpt-3.5-turbo'],
        enabled: true,
      });
    });

    it('should match exact model', () => {
      const selection = manager.selectProfile('gpt-3.5-turbo');
      expect(selection?.model).toBe('gpt-3.5-turbo');
    });

    it('should match wildcard model', () => {
      const selection = manager.selectProfile('gpt-4-turbo-preview');
      expect(selection?.profile.id).toBe('wildcard-profile');
    });
  });
});
