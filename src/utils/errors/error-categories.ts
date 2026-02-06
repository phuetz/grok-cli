/**
 * Error Categories and Severities
 *
 * Defines error classification enums, category/severity mappings,
 * and lookup functions.
 */

// ===============================================================================
// SYSTEME DE CATEGORIES D'ERREURS
// ===============================================================================

/**
 * Categories d'erreurs pour une meilleure organisation et filtrage
 */
export enum ErrorCategory {
  API = "API",
  AUTHENTICATION = "AUTH",
  FILE_SYSTEM = "FS",
  GIT = "GIT",
  NETWORK = "NET",
  CONFIGURATION = "CONFIG",
  SECURITY = "SEC",
  RESOURCE = "RES",
  VALIDATION = "VAL",
  RUNTIME = "RUN",
  PLUGIN = "PLUGIN",
  MCP = "MCP",
  SESSION = "SESSION",
  UNKNOWN = "UNK",
}

/**
 * Severite des erreurs pour le tri et l'affichage
 */
export enum ErrorSeverity {
  /** Erreur critique - arret immediat */
  CRITICAL = "critical",
  /** Erreur bloquante - operation impossible */
  ERROR = "error",
  /** Avertissement - operation continue avec precautions */
  WARNING = "warning",
  /** Information - notification sans blocage */
  INFO = "info",
}

/**
 * Mapping des codes d'erreur vers leurs categories
 */
export const ERROR_CATEGORIES: Record<string, ErrorCategory> = {
  // API
  API_KEY_MISSING: ErrorCategory.AUTHENTICATION,
  API_KEY_INVALID: ErrorCategory.AUTHENTICATION,
  RATE_LIMITED: ErrorCategory.API,
  API_QUOTA_EXCEEDED: ErrorCategory.API,
  API_SERVER_ERROR: ErrorCategory.API,
  API_OVERLOADED: ErrorCategory.API,
  API_INVALID_RESPONSE: ErrorCategory.API,
  API_CONTENT_FILTERED: ErrorCategory.API,

  // Network
  NETWORK_ERROR: ErrorCategory.NETWORK,
  TIMEOUT: ErrorCategory.NETWORK,

  // File System
  FILE_NOT_FOUND: ErrorCategory.FILE_SYSTEM,
  PERMISSION_DENIED: ErrorCategory.FILE_SYSTEM,
  FILE_TOO_LARGE: ErrorCategory.FILE_SYSTEM,
  FILE_LOCKED: ErrorCategory.FILE_SYSTEM,
  FILE_ENCODING_ERROR: ErrorCategory.FILE_SYSTEM,
  DISK_FULL: ErrorCategory.FILE_SYSTEM,
  PATH_TRAVERSAL: ErrorCategory.SECURITY,

  // Git
  GIT_CONFLICT: ErrorCategory.GIT,
  GIT_NOT_INITIALIZED: ErrorCategory.GIT,
  GIT_UNCOMMITTED_CHANGES: ErrorCategory.GIT,
  GIT_BRANCH_EXISTS: ErrorCategory.GIT,
  GIT_PUSH_REJECTED: ErrorCategory.GIT,
  GIT_MERGE_FAILED: ErrorCategory.GIT,

  // Configuration
  CONFIG_INVALID: ErrorCategory.CONFIGURATION,
  MODEL_NOT_FOUND: ErrorCategory.CONFIGURATION,
  WORKSPACE_NOT_FOUND: ErrorCategory.CONFIGURATION,
  PROJECT_NOT_NODE: ErrorCategory.CONFIGURATION,

  // Security
  SANDBOX_VIOLATION: ErrorCategory.SECURITY,
  UNSAFE_COMMAND_BLOCKED: ErrorCategory.SECURITY,
  SECRETS_DETECTED: ErrorCategory.SECURITY,

  // Resources
  COST_LIMIT: ErrorCategory.RESOURCE,
  MEMORY_LIMIT: ErrorCategory.RESOURCE,
  CONTEXT_TOO_LARGE: ErrorCategory.RESOURCE,
  PROCESS_KILLED: ErrorCategory.RESOURCE,

  // Validation
  VALIDATION_ERROR: ErrorCategory.VALIDATION,
  JSON_PARSE_ERROR: ErrorCategory.VALIDATION,
  TYPESCRIPT_ERROR: ErrorCategory.VALIDATION,
  LINT_ERROR: ErrorCategory.VALIDATION,
  SCRIPT_SYNTAX_ERROR: ErrorCategory.VALIDATION,
  BUILD_FAILED: ErrorCategory.VALIDATION,

  // Runtime
  TOOL_FAILED: ErrorCategory.RUNTIME,
  COMMAND_NOT_FOUND: ErrorCategory.RUNTIME,
  DEPENDENCY_MISSING: ErrorCategory.RUNTIME,
  PACKAGE_INSTALL_FAILED: ErrorCategory.RUNTIME,

  // Plugins
  PLUGIN_NOT_FOUND: ErrorCategory.PLUGIN,
  PLUGIN_LOAD_ERROR: ErrorCategory.PLUGIN,
  PLUGIN_VERSION_MISMATCH: ErrorCategory.PLUGIN,

  // MCP
  MCP_CONNECTION_FAILED: ErrorCategory.MCP,

  // Session
  SESSION_EXPIRED: ErrorCategory.SESSION,
  CHECKPOINT_NOT_FOUND: ErrorCategory.SESSION,

  // Docker
  DOCKER_NOT_RUNNING: ErrorCategory.RUNTIME,
};

/**
 * Mapping des codes d'erreur vers leur severite
 */
export const ERROR_SEVERITIES: Record<string, ErrorSeverity> = {
  // Critical - arret immediat requis
  API_KEY_MISSING: ErrorSeverity.CRITICAL,
  API_KEY_INVALID: ErrorSeverity.CRITICAL,
  DISK_FULL: ErrorSeverity.CRITICAL,
  MEMORY_LIMIT: ErrorSeverity.CRITICAL,

  // Error - operation impossible
  RATE_LIMITED: ErrorSeverity.ERROR,
  API_QUOTA_EXCEEDED: ErrorSeverity.ERROR,
  API_SERVER_ERROR: ErrorSeverity.ERROR,
  NETWORK_ERROR: ErrorSeverity.ERROR,
  TIMEOUT: ErrorSeverity.ERROR,
  FILE_NOT_FOUND: ErrorSeverity.ERROR,
  PERMISSION_DENIED: ErrorSeverity.ERROR,
  CONFIG_INVALID: ErrorSeverity.ERROR,
  GIT_CONFLICT: ErrorSeverity.ERROR,
  COST_LIMIT: ErrorSeverity.ERROR,
  CONTEXT_TOO_LARGE: ErrorSeverity.ERROR,
  SANDBOX_VIOLATION: ErrorSeverity.ERROR,
  BUILD_FAILED: ErrorSeverity.ERROR,

  // Warning - peut continuer avec precautions
  API_OVERLOADED: ErrorSeverity.WARNING,
  FILE_TOO_LARGE: ErrorSeverity.WARNING,
  FILE_LOCKED: ErrorSeverity.WARNING,
  GIT_UNCOMMITTED_CHANGES: ErrorSeverity.WARNING,
  SECRETS_DETECTED: ErrorSeverity.WARNING,
  PLUGIN_VERSION_MISMATCH: ErrorSeverity.WARNING,
  LINT_ERROR: ErrorSeverity.WARNING,

  // Info - notification simple
  GIT_BRANCH_EXISTS: ErrorSeverity.INFO,
  CHECKPOINT_NOT_FOUND: ErrorSeverity.INFO,
};

/**
 * Obtient la categorie d'une erreur par son code
 */
export function getErrorCategory(code: string): ErrorCategory {
  return ERROR_CATEGORIES[code] || ErrorCategory.UNKNOWN;
}

/**
 * Obtient la severite d'une erreur par son code
 */
export function getErrorSeverity(code: string): ErrorSeverity {
  return ERROR_SEVERITIES[code] || ErrorSeverity.ERROR;
}
