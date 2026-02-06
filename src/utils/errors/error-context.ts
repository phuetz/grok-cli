/**
 * Error Context Module
 *
 * Context-building utilities including automatic error detection,
 * error context creation, technical error translation, and
 * file path extraction.
 */

import { EXIT_CODES, ExitCode } from "../exit-codes.js";
import { ErrorContext, QuickAction, ERROR_TEMPLATES } from "./error-templates.js";

/**
 * Regles de detection automatique des erreurs
 * Chaque regle contient des patterns a matcher et le template correspondant
 */
const ERROR_DETECTION_RULES: Array<{
  patterns: RegExp[];
  template: keyof typeof ERROR_TEMPLATES;
}> = [
  // ===============================================================================
  // AUTHENTIFICATION & API KEY
  // ===============================================================================
  {
    patterns: [/api.?key.*missing/i, /missing.*api.?key/i, /no.*api.?key/i],
    template: "API_KEY_MISSING",
  },
  {
    patterns: [/unauthorized/i, /\b401\b/, /invalid.*key/i, /key.*invalid/i, /authentication.*failed/i],
    template: "API_KEY_INVALID",
  },

  // ===============================================================================
  // RATE LIMITING & QUOTAS
  // ===============================================================================
  {
    patterns: [/rate.?limit/i, /too.?many.?requests/i, /\b429\b/],
    template: "RATE_LIMITED",
  },
  {
    patterns: [/quota.*exceeded/i, /exceeded.*quota/i, /monthly.*limit/i, /usage.*limit/i],
    template: "API_QUOTA_EXCEEDED",
  },

  // ===============================================================================
  // ERREURS SERVEUR API
  // ===============================================================================
  {
    patterns: [/\b50[0-4]\b/, /internal.*server.*error/i, /server.*error/i],
    template: "API_SERVER_ERROR",
  },
  {
    patterns: [/\b503\b/, /service.*unavailable/i, /overloaded/i, /capacity/i],
    template: "API_OVERLOADED",
  },
  {
    patterns: [/invalid.*response/i, /malformed.*response/i, /unexpected.*response/i, /json.*parse.*error.*api/i],
    template: "API_INVALID_RESPONSE",
  },
  {
    patterns: [/content.*filter/i, /moderation/i, /blocked.*safety/i, /flagged/i],
    template: "API_CONTENT_FILTERED",
  },

  // ===============================================================================
  // RESEAU & CONNEXION
  // ===============================================================================
  {
    patterns: [/timeout/i, /timed?.?out/i, /deadline.*exceeded/i],
    template: "TIMEOUT",
  },
  {
    patterns: [
      /econnrefused/i, /econnreset/i, /network/i, /fetch.*failed/i,
      /unable.*connect/i, /connection.*refused/i, /dns/i, /enotfound/i
    ],
    template: "NETWORK_ERROR",
  },

  // ===============================================================================
  // FICHIERS & SYSTEME DE FICHIERS
  // ===============================================================================
  {
    patterns: [/enoent/i, /no.*such.*file/i, /file.*not.*found/i, /path.*not.*exist/i],
    template: "FILE_NOT_FOUND",
  },
  {
    patterns: [/eacces/i, /permission.*denied/i, /access.*denied/i, /not.*permitted/i, /eperm/i],
    template: "PERMISSION_DENIED",
  },
  {
    patterns: [/file.*too.*large/i, /payload.*too.*large/i, /entity.*too.*large/i, /\b413\b/],
    template: "FILE_TOO_LARGE",
  },
  {
    patterns: [/ebusy/i, /file.*locked/i, /resource.*busy/i, /being.*used/i],
    template: "FILE_LOCKED",
  },
  {
    patterns: [/encoding/i, /invalid.*character/i, /utf-?8/i, /charset/i, /decode/i],
    template: "FILE_ENCODING_ERROR",
  },
  {
    patterns: [/enospc/i, /no.*space/i, /disk.*full/i, /quota.*exceeded.*disk/i],
    template: "DISK_FULL",
  },
  {
    patterns: [/path.*traversal/i, /directory.*traversal/i, /\.\.\/.*security/i],
    template: "PATH_TRAVERSAL",
  },

  // ===============================================================================
  // GIT
  // ===============================================================================
  {
    patterns: [/not.*git.*repository/i, /fatal.*not.*git/i, /git.*init/i],
    template: "GIT_NOT_INITIALIZED",
  },
  {
    patterns: [/conflict/i, /merge.*conflict/i, /unmerged/i],
    template: "GIT_CONFLICT",
  },
  {
    patterns: [/uncommitted.*changes/i, /working.*tree.*clean/i, /unstaged.*changes/i],
    template: "GIT_UNCOMMITTED_CHANGES",
  },
  {
    patterns: [/branch.*already.*exists/i, /fatal.*branch.*exists/i],
    template: "GIT_BRANCH_EXISTS",
  },
  {
    patterns: [/push.*rejected/i, /non-fast-forward/i, /failed.*push/i],
    template: "GIT_PUSH_REJECTED",
  },
  {
    patterns: [/merge.*failed/i, /automatic.*merge.*failed/i],
    template: "GIT_MERGE_FAILED",
  },

  // ===============================================================================
  // CONFIGURATION & MODELES
  // ===============================================================================
  {
    patterns: [/config.*invalid/i, /invalid.*config/i, /configuration.*error/i],
    template: "CONFIG_INVALID",
  },
  {
    patterns: [/model.*not.*found/i, /model.*not.*available/i, /unknown.*model/i, /invalid.*model/i],
    template: "MODEL_NOT_FOUND",
  },
  {
    patterns: [/workspace.*not.*found/i, /workspace.*not.*exist/i],
    template: "WORKSPACE_NOT_FOUND",
  },
  {
    patterns: [/package\.json.*not.*found/i, /not.*node.*project/i, /npm.*init/i],
    template: "PROJECT_NOT_NODE",
  },

  // ===============================================================================
  // SECURITE
  // ===============================================================================
  {
    patterns: [/sandbox/i, /violation/i, /blocked.*security/i],
    template: "SANDBOX_VIOLATION",
  },
  {
    patterns: [/unsafe.*command/i, /dangerous.*command/i, /command.*blocked/i],
    template: "UNSAFE_COMMAND_BLOCKED",
  },
  {
    patterns: [/secret.*detected/i, /credential.*found/i, /api.?key.*code/i, /password.*found/i],
    template: "SECRETS_DETECTED",
  },

  // ===============================================================================
  // RESSOURCES
  // ===============================================================================
  {
    patterns: [/cost.*limit/i, /spending.*limit/i, /budget.*exceeded/i],
    template: "COST_LIMIT",
  },
  {
    patterns: [/memory.*limit/i, /out.*of.*memory/i, /heap.*out/i, /enomem/i, /javascript.*heap/i],
    template: "MEMORY_LIMIT",
  },
  {
    patterns: [/context.*too.*large/i, /token.*limit/i, /max.*tokens/i, /context.*length/i],
    template: "CONTEXT_TOO_LARGE",
  },
  {
    patterns: [/killed/i, /sigkill/i, /sigterm/i, /process.*terminated/i],
    template: "PROCESS_KILLED",
  },

  // ===============================================================================
  // VALIDATION & BUILD
  // ===============================================================================
  {
    patterns: [/json.*parse/i, /unexpected.*token/i, /invalid.*json/i, /json.*syntax/i],
    template: "JSON_PARSE_ERROR",
  },
  {
    patterns: [/typescript.*error/i, /ts\d{4}/i, /type.*error/i, /cannot.*find.*module/i],
    template: "TYPESCRIPT_ERROR",
  },
  {
    patterns: [/build.*failed/i, /compilation.*failed/i, /compile.*error/i],
    template: "BUILD_FAILED",
  },
  {
    patterns: [/lint.*error/i, /eslint/i, /prettier/i, /formatting.*error/i],
    template: "LINT_ERROR",
  },
  {
    patterns: [/syntax.*error/i, /unexpected.*end/i, /unexpected.*identifier/i],
    template: "SCRIPT_SYNTAX_ERROR",
  },

  // ===============================================================================
  // RUNTIME & DEPENDANCES
  // ===============================================================================
  {
    patterns: [/command.*not.*found/i, /is.*not.*recognized/i, /unknown.*command/i],
    template: "COMMAND_NOT_FOUND",
  },
  {
    patterns: [/dependency.*missing/i, /module.*not.*found/i, /cannot.*resolve/i, /peer.*dep/i],
    template: "DEPENDENCY_MISSING",
  },
  {
    patterns: [/npm.*install.*failed/i, /npm.*err/i, /package.*install/i],
    template: "PACKAGE_INSTALL_FAILED",
  },
  {
    patterns: [/tool.*failed/i, /tool.*execution/i, /tool.*error/i],
    template: "TOOL_FAILED",
  },

  // ===============================================================================
  // PLUGINS
  // ===============================================================================
  {
    patterns: [/plugin.*not.*found/i, /plugin.*not.*installed/i],
    template: "PLUGIN_NOT_FOUND",
  },
  {
    patterns: [/plugin.*load.*error/i, /failed.*load.*plugin/i, /plugin.*corrupt/i],
    template: "PLUGIN_LOAD_ERROR",
  },
  {
    patterns: [/plugin.*version/i, /incompatible.*plugin/i, /plugin.*mismatch/i],
    template: "PLUGIN_VERSION_MISMATCH",
  },

  // ===============================================================================
  // MCP & SESSIONS
  // ===============================================================================
  {
    patterns: [/mcp.*connection/i, /mcp.*failed/i, /mcp.*error/i],
    template: "MCP_CONNECTION_FAILED",
  },
  {
    patterns: [/session.*expired/i, /session.*invalid/i, /session.*timeout/i],
    template: "SESSION_EXPIRED",
  },
  {
    patterns: [/checkpoint.*not.*found/i, /checkpoint.*missing/i],
    template: "CHECKPOINT_NOT_FOUND",
  },

  // ===============================================================================
  // DOCKER
  // ===============================================================================
  {
    patterns: [/docker.*not.*running/i, /docker.*daemon/i, /cannot.*connect.*docker/i],
    template: "DOCKER_NOT_RUNNING",
  },
];

/**
 * Create error context from an Error object
 * Utilise la detection automatique avancee pour trouver le meilleur template
 */
export function createErrorContext(
  error: Error,
  template?: keyof typeof ERROR_TEMPLATES
): ErrorContext {
  // Si un template est specifie explicitement, l'utiliser
  if (template && ERROR_TEMPLATES[template]) {
    const base = ERROR_TEMPLATES[template] as {
      code: string;
      message: string;
      suggestion?: string;
      docUrl?: string;
      exitCode?: ExitCode;
      quickActions?: readonly QuickAction[];
    };
    return {
      code: base.code,
      message: base.message,
      suggestion: base.suggestion,
      docUrl: base.docUrl,
      exitCode: base.exitCode,
      quickActions: base.quickActions ? [...base.quickActions] : undefined,
      details: error.message,
      cause: error,
    };
  }

  // Detection automatique basee sur les regles
  const message = error.message;

  for (const rule of ERROR_DETECTION_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) {
        const base = ERROR_TEMPLATES[rule.template] as {
          code: string;
          message: string;
          suggestion?: string;
          docUrl?: string;
          exitCode?: ExitCode;
          quickActions?: readonly QuickAction[];
        };
        return {
          code: base.code,
          message: base.message,
          suggestion: base.suggestion,
          docUrl: base.docUrl,
          exitCode: base.exitCode,
          quickActions: base.quickActions ? [...base.quickActions] : undefined,
          details: error.message,
          cause: error,
        };
      }
    }
  }

  // Erreur generique si aucun pattern ne correspond
  return {
    code: "UNKNOWN_ERROR",
    message: translateTechnicalError(error.message),
    details: error.message,
    exitCode: EXIT_CODES.GENERAL_ERROR,
    cause: error,
    suggestion: "Si le probleme persiste, consultez les logs ou contactez le support.",
    quickActions: [
      {
        label: "Voir les logs detailles",
        command: "cat ~/.config/grok/logs/latest.log | tail -100",
        description: "Affiche les dernieres lignes du journal",
      },
      {
        label: "Signaler un bug",
        command: "open https://github.com/phuetz/code-buddy/issues/new",
        description: "Ouvrir une issue sur GitHub",
      },
    ],
  };
}

/**
 * Traduit les messages d'erreur techniques en langage utilisateur
 */
export function translateTechnicalError(message: string): string {
  const translations: Array<{ pattern: RegExp; translation: string }> = [
    { pattern: /ENOENT/i, translation: "Fichier ou dossier introuvable" },
    { pattern: /EACCES/i, translation: "Permission refusee" },
    { pattern: /EPERM/i, translation: "Operation non permise" },
    { pattern: /ECONNREFUSED/i, translation: "Connexion refusee par le serveur" },
    { pattern: /ECONNRESET/i, translation: "Connexion interrompue" },
    { pattern: /ETIMEDOUT/i, translation: "Delai d'attente depasse" },
    { pattern: /ENOTFOUND/i, translation: "Adresse introuvable (verifiez l'URL)" },
    { pattern: /ENOSPC/i, translation: "Espace disque insuffisant" },
    { pattern: /ENOMEM/i, translation: "Memoire insuffisante" },
    { pattern: /EBUSY/i, translation: "Ressource occupee" },
    { pattern: /EMFILE/i, translation: "Trop de fichiers ouverts" },
    { pattern: /ENFILE/i, translation: "Limite systeme de fichiers atteinte" },
    { pattern: /EISDIR/i, translation: "Impossible: c'est un dossier, pas un fichier" },
    { pattern: /ENOTDIR/i, translation: "Impossible: ce n'est pas un dossier" },
    { pattern: /EEXIST/i, translation: "Le fichier ou dossier existe deja" },
    { pattern: /ENOTEMPTY/i, translation: "Le dossier n'est pas vide" },
    { pattern: /SIGKILL/i, translation: "Processus arrete de force" },
    { pattern: /SIGTERM/i, translation: "Processus interrompu" },
    { pattern: /ERR_INVALID_ARG/i, translation: "Argument invalide" },
    { pattern: /ERR_ASSERTION/i, translation: "Erreur interne (assertion echouee)" },
    { pattern: /Cannot read propert/i, translation: "Valeur manquante ou incorrecte" },
    { pattern: /is not defined/i, translation: "Variable ou fonction non definie" },
    { pattern: /is not a function/i, translation: "Tentative d'appel sur une non-fonction" },
    { pattern: /Maximum call stack/i, translation: "Boucle infinie detectee (stack overflow)" },
  ];

  for (const { pattern, translation } of translations) {
    if (pattern.test(message)) {
      return translation;
    }
  }

  // Si pas de traduction, retourner le message original (nettoye)
  return message
    .replace(/Error:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 200); // Limiter la longueur
}

/**
 * Extrait le chemin de fichier d'un message d'erreur si present
 */
export function extractFilePath(message: string): string | null {
  // Patterns courants pour les chemins de fichiers
  const patterns = [
    /(?:at|in|file)\s+['"]?([/\\]?(?:[\w.-]+[/\\])*[\w.-]+\.\w+)['"]?/i,
    /(?:ENOENT|EACCES)[^']*['"]([^'"]+)['"]/i,
    /(?:reading|writing|opening)\s+['"]?([/\\]?(?:[\w.-]+[/\\])*[\w.-]+\.\w+)['"]?/i,
    /^([/\\]?(?:[\w.-]+[/\\])*[\w.-]+\.\w+):/m,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Cree un contexte d'erreur enrichi avec extraction automatique du chemin
 */
export function createEnrichedErrorContext(
  error: Error,
  template?: keyof typeof ERROR_TEMPLATES
): ErrorContext {
  const ctx = createErrorContext(error, template);

  // Tenter d'extraire le chemin de fichier si non present
  if (!ctx.filePath) {
    const extractedPath = extractFilePath(error.message);
    if (extractedPath) {
      ctx.filePath = extractedPath;
    }
  }

  return ctx;
}
