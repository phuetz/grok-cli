/**
 * OAuth Authentication Types
 *
 * Type definitions for OAuth flows with AI providers.
 */

// ============================================================================
// OAuth Providers
// ============================================================================

/**
 * Supported OAuth providers
 */
export type OAuthProviderId = 'anthropic' | 'openai' | 'google' | 'github';

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  /** Provider ID */
  id: OAuthProviderId;
  /** Display name */
  name: string;
  /** Authorization endpoint URL */
  authorizationUrl: string;
  /** Token endpoint URL */
  tokenUrl: string;
  /** User info endpoint URL */
  userInfoUrl?: string;
  /** Client ID */
  clientId: string;
  /** Client secret (for confidential clients) */
  clientSecret?: string;
  /** Redirect URI */
  redirectUri: string;
  /** Required scopes */
  scopes: string[];
  /** Additional authorization params */
  additionalParams?: Record<string, string>;
  /** PKCE required */
  pkceRequired: boolean;
  /** Token refresh supported */
  refreshSupported: boolean;
}

/**
 * Built-in provider configurations (without secrets)
 */
export const OAUTH_PROVIDERS: Record<OAuthProviderId, Partial<OAuthProviderConfig>> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    authorizationUrl: 'https://console.anthropic.com/oauth/authorize',
    tokenUrl: 'https://console.anthropic.com/oauth/token',
    userInfoUrl: 'https://api.anthropic.com/v1/me',
    scopes: ['api:read', 'api:write'],
    pkceRequired: true,
    refreshSupported: true,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    authorizationUrl: 'https://auth.openai.com/authorize',
    tokenUrl: 'https://auth.openai.com/oauth/token',
    userInfoUrl: 'https://api.openai.com/v1/me',
    scopes: ['openid', 'profile', 'email', 'model.read', 'model.request'],
    pkceRequired: true,
    refreshSupported: true,
  },
  google: {
    id: 'google',
    name: 'Google (Gemini)',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/generative-language'],
    pkceRequired: false,
    refreshSupported: true,
  },
  github: {
    id: 'github',
    name: 'GitHub',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
    pkceRequired: false,
    refreshSupported: false,
  },
};

// ============================================================================
// Tokens
// ============================================================================

/**
 * OAuth token response
 */
export interface OAuthToken {
  /** Access token */
  accessToken: string;
  /** Token type (usually 'Bearer') */
  tokenType: string;
  /** Expiration time (epoch ms) */
  expiresAt: number;
  /** Refresh token */
  refreshToken?: string;
  /** Token scopes */
  scopes: string[];
  /** ID token (OpenID Connect) */
  idToken?: string;
}

/**
 * Stored credential
 */
export interface StoredCredential {
  /** Provider ID */
  providerId: OAuthProviderId;
  /** OAuth token */
  token: OAuthToken;
  /** User info */
  user?: OAuthUserInfo;
  /** Created at */
  createdAt: Date;
  /** Last refreshed at */
  refreshedAt?: Date;
  /** Is default for this provider */
  isDefault: boolean;
}

/**
 * User info from provider
 */
export interface OAuthUserInfo {
  /** User ID */
  id: string;
  /** Email */
  email?: string;
  /** Display name */
  name?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Additional provider-specific data */
  raw?: Record<string, unknown>;
}

// ============================================================================
// PKCE
// ============================================================================

/**
 * PKCE challenge pair
 */
export interface PKCEChallenge {
  /** Code verifier (random string) */
  codeVerifier: string;
  /** Code challenge (S256 hash of verifier) */
  codeChallenge: string;
  /** Challenge method */
  challengeMethod: 'S256';
}

// ============================================================================
// Authorization State
// ============================================================================

/**
 * OAuth authorization state
 */
export interface AuthorizationState {
  /** State parameter */
  state: string;
  /** Provider ID */
  providerId: OAuthProviderId;
  /** PKCE challenge */
  pkce?: PKCEChallenge;
  /** Created at */
  createdAt: Date;
  /** Expires at */
  expiresAt: Date;
  /** Redirect URI used */
  redirectUri: string;
}

// ============================================================================
// Model Profiles
// ============================================================================

/**
 * Authentication type
 */
export type AuthType = 'api_key' | 'oauth';

/**
 * Model profile for multi-provider failover
 */
export interface ModelProfile {
  /** Profile ID */
  id: string;
  /** Display name */
  name: string;
  /** Provider ID */
  providerId: OAuthProviderId | 'grok' | 'ollama' | 'lmstudio';
  /** Authentication type */
  authType: AuthType;
  /** OAuth credential ID (if OAuth) */
  credentialId?: string;
  /** API key (if api_key auth) */
  apiKey?: string;
  /** Base URL override */
  baseUrl?: string;
  /** Priority (higher = preferred) */
  priority: number;
  /** Supported models */
  models: string[];
  /** Default model */
  defaultModel?: string;
  /** Is enabled */
  enabled: boolean;
  /** Failure count */
  failureCount: number;
  /** Last failure time */
  lastFailureAt?: Date;
  /** Circuit breaker state */
  circuitState: 'closed' | 'open' | 'half-open';
}

/**
 * Profile selection result
 */
export interface ProfileSelection {
  /** Selected profile */
  profile: ModelProfile;
  /** Selected model */
  model: string;
  /** Reason for selection */
  reason: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * OAuth manager configuration
 */
export interface OAuthConfig {
  /** Token storage path */
  storagePath: string;
  /** Encrypt stored tokens */
  encryptTokens: boolean;
  /** Auto-refresh tokens */
  autoRefresh: boolean;
  /** Refresh threshold (ms before expiry) */
  refreshThresholdMs: number;
  /** State expiry (ms) */
  stateExpiryMs: number;
  /** Local server port for redirect */
  localServerPort: number;
}

/**
 * Default OAuth configuration
 */
export const DEFAULT_OAUTH_CONFIG: OAuthConfig = {
  storagePath: '~/.codebuddy/auth',
  encryptTokens: true,
  autoRefresh: true,
  refreshThresholdMs: 5 * 60 * 1000, // 5 minutes
  stateExpiryMs: 10 * 60 * 1000, // 10 minutes
  localServerPort: 9876,
};

// ============================================================================
// Events
// ============================================================================

/**
 * OAuth events
 */
export interface OAuthEvents {
  'auth:started': (providerId: OAuthProviderId) => void;
  'auth:success': (credential: StoredCredential) => void;
  'auth:failed': (providerId: OAuthProviderId, error: Error) => void;
  'token:refreshed': (providerId: OAuthProviderId) => void;
  'token:expired': (providerId: OAuthProviderId) => void;
  'profile:selected': (selection: ProfileSelection) => void;
  'profile:failover': (from: string, to: string) => void;
  'error': (error: Error) => void;
}
