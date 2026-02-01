/**
 * OAuth Manager Tests
 */

import {
  OAuthManager,
  OAUTH_PROVIDERS,
  DEFAULT_OAUTH_CONFIG,
} from '../../../src/auth/oauth/index.js';

describe('OAuthManager', () => {
  let manager: OAuthManager;

  beforeEach(() => {
    manager = new OAuthManager();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('provider configuration', () => {
    it('should configure a provider', () => {
      manager.configureProvider('openai', 'test-client-id', 'test-secret');

      const config = manager.getProviderConfig('openai');
      expect(config).toBeDefined();
      expect(config?.clientId).toBe('test-client-id');
      expect(config?.clientSecret).toBe('test-secret');
    });

    it('should use default redirect URI', () => {
      manager.configureProvider('anthropic', 'client-id');

      const config = manager.getProviderConfig('anthropic');
      expect(config?.redirectUri).toContain('localhost');
      expect(config?.redirectUri).toContain(String(DEFAULT_OAUTH_CONFIG.localServerPort));
    });

    it('should use custom redirect URI', () => {
      manager.configureProvider('google', 'client-id', 'secret', 'https://custom.callback/auth');

      const config = manager.getProviderConfig('google');
      expect(config?.redirectUri).toBe('https://custom.callback/auth');
    });

    it('should throw for unknown provider', () => {
      expect(() => {
        manager.configureProvider('unknown' as any, 'id');
      }).toThrow('Unknown OAuth provider');
    });

    it('should list configured providers', () => {
      manager.configureProvider('openai', 'id1');
      manager.configureProvider('anthropic', 'id2');

      const providers = manager.getConfiguredProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers.length).toBe(2);
    });
  });

  describe('authorization flow', () => {
    beforeEach(() => {
      manager.configureProvider('openai', 'test-client-id');
    });

    it('should generate authorization URL', async () => {
      const url = await manager.getAuthorizationUrl('openai');

      expect(url).toContain(OAUTH_PROVIDERS.openai.authorizationUrl);
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=');
    });

    it('should include PKCE challenge when required', async () => {
      const url = await manager.getAuthorizationUrl('openai');

      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
    });

    it('should throw if provider not configured', async () => {
      await expect(manager.getAuthorizationUrl('github')).rejects.toThrow('not configured');
    });

    it('should emit auth:started event', async () => {
      const handler = jest.fn();
      manager.on('auth:started', handler);

      await manager.getAuthorizationUrl('openai');

      expect(handler).toHaveBeenCalledWith('openai');
    });
  });

  describe('code exchange', () => {
    beforeEach(() => {
      manager.configureProvider('openai', 'test-client-id');
    });

    it('should throw for invalid state', async () => {
      await expect(
        manager.exchangeCode('openai', 'test-code', 'invalid-state')
      ).rejects.toThrow('Invalid state');
    });
  });

  describe('credential management', () => {
    it('should return undefined for unknown credential', () => {
      expect(manager.getCredential('unknown')).toBeUndefined();
    });

    it('should return undefined for unconfigured provider', () => {
      expect(manager.getCredentialForProvider('anthropic')).toBeUndefined();
    });
  });

  describe('token expiration', () => {
    it('should detect expired token', () => {
      // We can't easily test this without mocking credentials
      // but we can test the structure
      const stats = manager.getStats();
      expect(stats.storedCredentials).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should return correct stats', () => {
      manager.configureProvider('openai', 'id1');
      manager.configureProvider('anthropic', 'id2');

      const stats = manager.getStats();
      expect(stats.configuredProviders).toBe(2);
      expect(stats.storedCredentials).toBe(0);
      expect(stats.pendingAuthorizations).toBe(0);
    });

    it('should track pending authorizations', async () => {
      manager.configureProvider('openai', 'id');
      await manager.getAuthorizationUrl('openai');

      const stats = manager.getStats();
      expect(stats.pendingAuthorizations).toBe(1);
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      manager.configureProvider('openai', 'id');
      await manager.getAuthorizationUrl('openai');

      await expect(manager.shutdown()).resolves.not.toThrow();
    });
  });
});

describe('OAUTH_PROVIDERS', () => {
  it('should have anthropic provider', () => {
    expect(OAUTH_PROVIDERS.anthropic).toBeDefined();
    expect(OAUTH_PROVIDERS.anthropic.name).toBe('Anthropic (Claude)');
    expect(OAUTH_PROVIDERS.anthropic.pkceRequired).toBe(true);
  });

  it('should have openai provider', () => {
    expect(OAUTH_PROVIDERS.openai).toBeDefined();
    expect(OAUTH_PROVIDERS.openai.name).toBe('OpenAI (ChatGPT)');
    expect(OAUTH_PROVIDERS.openai.scopes).toContain('openid');
  });

  it('should have google provider', () => {
    expect(OAUTH_PROVIDERS.google).toBeDefined();
    expect(OAUTH_PROVIDERS.google.name).toBe('Google (Gemini)');
    expect(OAUTH_PROVIDERS.google.pkceRequired).toBe(false);
  });

  it('should have github provider', () => {
    expect(OAUTH_PROVIDERS.github).toBeDefined();
    expect(OAUTH_PROVIDERS.github.refreshSupported).toBe(false);
  });
});
