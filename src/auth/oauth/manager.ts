/**
 * OAuth Manager
 *
 * Manages OAuth authentication flows for AI providers.
 * Supports PKCE, token refresh, and secure storage.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as http from 'http';
import * as url from 'url';
import type {
  OAuthProviderId,
  OAuthProviderConfig,
  OAuthToken,
  StoredCredential,
  OAuthUserInfo,
  PKCEChallenge,
  AuthorizationState,
  OAuthConfig,
} from './types.js';
import { OAUTH_PROVIDERS, DEFAULT_OAUTH_CONFIG } from './types.js';

// ============================================================================
// OAuth Manager
// ============================================================================

/**
 * OAuth Manager
 *
 * Handles OAuth 2.0 flows for AI provider authentication.
 */
export class OAuthManager extends EventEmitter {
  private config: OAuthConfig;
  private providerConfigs: Map<OAuthProviderId, OAuthProviderConfig> = new Map();
  private credentials: Map<string, StoredCredential> = new Map();
  private pendingStates: Map<string, AuthorizationState> = new Map();
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private localServer: http.Server | null = null;

  constructor(config: Partial<OAuthConfig> = {}) {
    super();
    this.config = { ...DEFAULT_OAUTH_CONFIG, ...config };
  }

  // ============================================================================
  // Provider Configuration
  // ============================================================================

  /**
   * Configure an OAuth provider
   */
  configureProvider(
    providerId: OAuthProviderId,
    clientId: string,
    clientSecret?: string,
    redirectUri?: string
  ): void {
    const baseConfig = OAUTH_PROVIDERS[providerId];
    if (!baseConfig) {
      throw new Error(`Unknown OAuth provider: ${providerId}`);
    }

    const fullConfig: OAuthProviderConfig = {
      ...baseConfig,
      clientId,
      clientSecret,
      redirectUri: redirectUri || `http://localhost:${this.config.localServerPort}/callback`,
    } as OAuthProviderConfig;

    this.providerConfigs.set(providerId, fullConfig);
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(providerId: OAuthProviderId): OAuthProviderConfig | undefined {
    return this.providerConfigs.get(providerId);
  }

  /**
   * List configured providers
   */
  getConfiguredProviders(): OAuthProviderId[] {
    return Array.from(this.providerConfigs.keys());
  }

  // ============================================================================
  // Authorization Flow
  // ============================================================================

  /**
   * Get authorization URL for a provider
   */
  async getAuthorizationUrl(providerId: OAuthProviderId): Promise<string> {
    const config = this.providerConfigs.get(providerId);
    if (!config) {
      throw new Error(`Provider ${providerId} not configured`);
    }

    // Generate state
    const state = crypto.randomBytes(32).toString('base64url');

    // Generate PKCE if required
    let pkce: PKCEChallenge | undefined;
    if (config.pkceRequired) {
      pkce = this.generatePKCE();
    }

    // Store state
    const authState: AuthorizationState = {
      state,
      providerId,
      pkce,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.stateExpiryMs),
      redirectUri: config.redirectUri,
    };
    this.pendingStates.set(state, authState);

    // Build URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
      ...(config.additionalParams || {}),
    });

    if (pkce) {
      params.set('code_challenge', pkce.codeChallenge);
      params.set('code_challenge_method', pkce.challengeMethod);
    }

    this.emit('auth:started', providerId);

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(providerId: OAuthProviderId, code: string, state: string): Promise<StoredCredential> {
    // Validate state
    const authState = this.pendingStates.get(state);
    if (!authState || authState.providerId !== providerId) {
      throw new Error('Invalid state parameter');
    }

    if (new Date() > authState.expiresAt) {
      this.pendingStates.delete(state);
      throw new Error('Authorization state expired');
    }

    this.pendingStates.delete(state);

    const config = this.providerConfigs.get(providerId);
    if (!config) {
      throw new Error(`Provider ${providerId} not configured`);
    }

    // Exchange code for tokens
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: authState.redirectUri,
      client_id: config.clientId,
    });

    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret);
    }

    if (authState.pkce) {
      body.set('code_verifier', authState.pkce.codeVerifier);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      const authError = new Error(`Token exchange failed: ${error}`);
      this.emit('auth:failed', providerId, authError);
      throw authError;
    }

    const tokenData = await response.json() as Record<string, unknown>;
    const token = this.parseTokenResponse(tokenData);

    // Fetch user info if available
    let user: OAuthUserInfo | undefined;
    if (config.userInfoUrl) {
      try {
        user = await this.fetchUserInfo(config.userInfoUrl, token.accessToken);
      } catch {
        // User info is optional
      }
    }

    // Create credential
    const credential: StoredCredential = {
      providerId,
      token,
      user,
      createdAt: new Date(),
      isDefault: !this.getCredentialForProvider(providerId),
    };

    const credentialId = this.generateCredentialId(providerId);
    this.credentials.set(credentialId, credential);

    // Schedule refresh
    if (this.config.autoRefresh && token.refreshToken) {
      this.scheduleRefresh(credentialId);
    }

    this.emit('auth:success', credential);

    return credential;
  }

  /**
   * Refresh an access token
   */
  async refreshToken(credentialId: string): Promise<OAuthToken> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error(`Credential ${credentialId} not found`);
    }

    if (!credential.token.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = this.providerConfigs.get(credential.providerId);
    if (!config) {
      throw new Error(`Provider ${credential.providerId} not configured`);
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credential.token.refreshToken,
      client_id: config.clientId,
    });

    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokenData = await response.json() as Record<string, unknown>;
    const newToken = this.parseTokenResponse(tokenData);

    // Preserve refresh token if not returned
    if (!newToken.refreshToken && credential.token.refreshToken) {
      newToken.refreshToken = credential.token.refreshToken;
    }

    credential.token = newToken;
    credential.refreshedAt = new Date();

    // Reschedule refresh
    if (this.config.autoRefresh && newToken.refreshToken) {
      this.scheduleRefresh(credentialId);
    }

    this.emit('token:refreshed', credential.providerId);

    return newToken;
  }

  // ============================================================================
  // Credential Management
  // ============================================================================

  /**
   * Get credential by ID
   */
  getCredential(credentialId: string): StoredCredential | undefined {
    return this.credentials.get(credentialId);
  }

  /**
   * Get default credential for a provider
   */
  getCredentialForProvider(providerId: OAuthProviderId): StoredCredential | undefined {
    for (const credential of this.credentials.values()) {
      if (credential.providerId === providerId && credential.isDefault) {
        return credential;
      }
    }
    return undefined;
  }

  /**
   * Get all credentials
   */
  getAllCredentials(): Map<string, StoredCredential> {
    return new Map(this.credentials);
  }

  /**
   * Remove a credential
   */
  removeCredential(credentialId: string): boolean {
    // Cancel refresh timer
    const timer = this.refreshTimers.get(credentialId);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(credentialId);
    }

    return this.credentials.delete(credentialId);
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(credential: StoredCredential): boolean {
    const threshold = Date.now() + this.config.refreshThresholdMs;
    return credential.token.expiresAt < threshold;
  }

  /**
   * Get valid access token, refreshing if needed
   */
  async getAccessToken(credentialId: string): Promise<string> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error(`Credential ${credentialId} not found`);
    }

    if (this.isTokenExpired(credential) && credential.token.refreshToken) {
      await this.refreshToken(credentialId);
    }

    if (this.isTokenExpired(credential)) {
      this.emit('token:expired', credential.providerId);
      throw new Error('Token expired and cannot be refreshed');
    }

    return credential.token.accessToken;
  }

  // ============================================================================
  // Local Callback Server
  // ============================================================================

  /**
   * Start local server for OAuth callback
   */
  async startLocalServer(): Promise<void> {
    if (this.localServer) return;

    return new Promise((resolve, reject) => {
      this.localServer = http.createServer((req, res) => {
        this.handleCallback(req, res);
      });

      this.localServer.on('error', reject);
      this.localServer.listen(this.config.localServerPort, () => {
        resolve();
      });
    });
  }

  /**
   * Stop local server
   */
  async stopLocalServer(): Promise<void> {
    if (!this.localServer) return;

    return new Promise((resolve) => {
      this.localServer!.close(() => {
        this.localServer = null;
        resolve();
      });
    });
  }

  /**
   * Handle OAuth callback
   */
  private handleCallback(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = url.parse(req.url || '', true);

    if (parsedUrl.pathname !== '/callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const { code, state, error, error_description } = parsedUrl.query;

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>${error_description || error}</p>
          </body>
        </html>
      `);
      return;
    }

    if (!code || !state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Invalid Request</h1>
            <p>Missing code or state parameter</p>
          </body>
        </html>
      `);
      return;
    }

    // Find the state to get provider
    const authState = this.pendingStates.get(state as string);
    if (!authState) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Invalid State</h1>
            <p>The authorization state is invalid or expired</p>
          </body>
        </html>
      `);
      return;
    }

    // Exchange code (async, but we respond immediately)
    this.exchangeCode(authState.providerId, code as string, state as string)
      .then(() => {
        // Success is handled via events
      })
      .catch(err => {
        this.emit('error', err);
      });

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <h1>Authentication Successful</h1>
          <p>You can close this window now.</p>
          <script>setTimeout(() => window.close(), 2000);</script>
        </body>
      </html>
    `);
  }

  // ============================================================================
  // PKCE
  // ============================================================================

  /**
   * Generate PKCE challenge
   */
  private generatePKCE(): PKCEChallenge {
    // Generate code verifier (43-128 chars, unreserved URI chars)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');

    // Generate code challenge (SHA256 hash of verifier)
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      challengeMethod: 'S256',
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Parse token response
   */
  private parseTokenResponse(data: Record<string, unknown>): OAuthToken {
    const accessToken = data.access_token as string;
    const tokenType = (data.token_type as string) || 'Bearer';
    const expiresIn = (data.expires_in as number) || 3600;
    const refreshToken = data.refresh_token as string | undefined;
    const scope = (data.scope as string) || '';
    const idToken = data.id_token as string | undefined;

    return {
      accessToken,
      tokenType,
      expiresAt: Date.now() + expiresIn * 1000,
      refreshToken,
      scopes: scope.split(' ').filter(Boolean),
      idToken,
    };
  }

  /**
   * Fetch user info from provider
   */
  private async fetchUserInfo(userInfoUrl: string, accessToken: string): Promise<OAuthUserInfo> {
    const response = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json() as Record<string, unknown>;

    return {
      id: (data.id || data.sub) as string,
      email: data.email as string | undefined,
      name: (data.name || data.login) as string | undefined,
      avatarUrl: (data.avatar_url || data.picture) as string | undefined,
      raw: data,
    };
  }

  /**
   * Generate credential ID
   */
  private generateCredentialId(providerId: OAuthProviderId): string {
    return `${providerId}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Schedule token refresh
   */
  private scheduleRefresh(credentialId: string): void {
    // Cancel existing timer
    const existingTimer = this.refreshTimers.get(credentialId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const credential = this.credentials.get(credentialId);
    if (!credential) return;

    // Calculate when to refresh
    const refreshAt = credential.token.expiresAt - this.config.refreshThresholdMs;
    const delay = Math.max(0, refreshAt - Date.now());

    const timer = setTimeout(() => {
      this.refreshToken(credentialId).catch(err => {
        this.emit('error', err);
      });
    }, delay);

    this.refreshTimers.set(credentialId, timer);
  }

  /**
   * Shutdown manager
   */
  async shutdown(): Promise<void> {
    // Stop local server
    await this.stopLocalServer();

    // Cancel all refresh timers
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();

    // Clear pending states
    this.pendingStates.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    configuredProviders: number;
    storedCredentials: number;
    pendingAuthorizations: number;
  } {
    return {
      configuredProviders: this.providerConfigs.size,
      storedCredentials: this.credentials.size,
      pendingAuthorizations: this.pendingStates.size,
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let oauthManagerInstance: OAuthManager | null = null;

/**
 * Get OAuth manager instance
 */
export function getOAuthManager(config?: Partial<OAuthConfig>): OAuthManager {
  if (!oauthManagerInstance) {
    oauthManagerInstance = new OAuthManager(config);
  }
  return oauthManagerInstance;
}

/**
 * Reset OAuth manager instance
 */
export async function resetOAuthManager(): Promise<void> {
  if (oauthManagerInstance) {
    await oauthManagerInstance.shutdown();
    oauthManagerInstance = null;
  }
}

export default OAuthManager;
