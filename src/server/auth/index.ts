/**
 * Authentication Module
 *
 * Exports all authentication utilities.
 */

export {
  generateApiKey,
  hashApiKey,
  createApiKey,
  validateApiKey,
  hasScope,
  hasAnyScope,
  revokeApiKey,
  listApiKeys,
  deleteApiKey,
  getApiKeyById,
  updateApiKeyScopes,
  getApiKeyStats,
} from './api-keys.js';

export {
  generateToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenTTL,
  refreshToken,
  createAccessToken,
  createUserToken,
} from './jwt.js';
