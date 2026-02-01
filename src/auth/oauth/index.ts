/**
 * OAuth Authentication Module
 *
 * Provides OAuth 2.0 authentication for AI providers.
 *
 * Features:
 * - PKCE support
 * - Token refresh
 * - Secure storage
 * - Model profiles with failover
 */

// Types
export type {
  OAuthProviderId,
  OAuthProviderConfig,
  OAuthToken,
  StoredCredential,
  OAuthUserInfo,
  PKCEChallenge,
  AuthorizationState,
  OAuthConfig,
  AuthType,
  ModelProfile,
  ProfileSelection,
  OAuthEvents,
} from './types.js';

export {
  OAUTH_PROVIDERS,
  DEFAULT_OAUTH_CONFIG,
} from './types.js';

// Manager
export {
  OAuthManager,
  getOAuthManager,
  resetOAuthManager,
} from './manager.js';

// Model Profiles
export {
  ModelProfileManager,
  getModelProfileManager,
  resetModelProfileManager,
} from './model-profiles.js';

export type {
  ProfileManagerConfig,
} from './model-profiles.js';

export {
  DEFAULT_PROFILE_MANAGER_CONFIG,
} from './model-profiles.js';
