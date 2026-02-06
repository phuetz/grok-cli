/**
 * Error Diagnostics
 *
 * Advanced diagnostic functions including report generation,
 * recoverability checks, retry delay calculation, error grouping,
 * and error summaries.
 */

import { ErrorCategory, ErrorSeverity, getErrorCategory, getErrorSeverity } from "./error-categories.js";
import { ErrorContext, ERROR_TEMPLATES } from "./error-templates.js";
import { createErrorContext } from "./error-context.js";
import { formatStackTrace, formatSuccess } from "./error-formatters.js";

/**
 * Interface pour les informations de diagnostic
 */
export interface DiagnosticInfo {
  /** Code d'erreur */
  code: string;
  /** Categorie de l'erreur */
  category: ErrorCategory;
  /** Severite de l'erreur */
  severity: ErrorSeverity;
  /** Message traduit */
  translatedMessage: string;
  /** Message original */
  originalMessage: string;
  /** Timestamp de l'erreur */
  timestamp: string;
  /** Stack trace formatee */
  stackTrace: string[];
  /** Suggestions de resolution */
  suggestions: string[];
  /** Environnement systeme */
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cwd: string;
  };
}

/**
 * Genere un rapport de diagnostic complet pour une erreur
 */
export function generateDiagnosticReport(error: Error, template?: keyof typeof ERROR_TEMPLATES): DiagnosticInfo {
  const ctx = createErrorContext(error, template);

  return {
    code: ctx.code,
    category: getErrorCategory(ctx.code),
    severity: getErrorSeverity(ctx.code),
    translatedMessage: ctx.message,
    originalMessage: error.message,
    timestamp: new Date().toISOString(),
    stackTrace: formatStackTrace(error, 10),
    suggestions: ctx.quickActions?.map(a => a.description) || [],
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
    },
  };
}

/**
 * Formate un rapport de diagnostic pour l'affichage
 */
export function formatDiagnosticReport(diagnostic: DiagnosticInfo): string {
  const lines: string[] = [];

  lines.push("\u2550".repeat(60));
  lines.push("  RAPPORT DE DIAGNOSTIC");
  lines.push("\u2550".repeat(60));
  lines.push("");

  lines.push(`\uD83D\uDCCB Code d'erreur: ${diagnostic.code}`);
  lines.push(`\uD83D\uDCC1 Categorie: ${diagnostic.category}`);
  lines.push(`\u26A1 Severite: ${diagnostic.severity}`);
  lines.push(`\uD83D\uDD50 Timestamp: ${diagnostic.timestamp}`);
  lines.push("");

  lines.push("\u2500".repeat(40));
  lines.push("MESSAGE");
  lines.push("\u2500".repeat(40));
  lines.push(`  ${diagnostic.translatedMessage}`);
  if (diagnostic.originalMessage !== diagnostic.translatedMessage) {
    lines.push("");
    lines.push("  Message technique:");
    lines.push(`  ${diagnostic.originalMessage}`);
  }
  lines.push("");

  if (diagnostic.suggestions.length > 0) {
    lines.push("\u2500".repeat(40));
    lines.push("SUGGESTIONS");
    lines.push("\u2500".repeat(40));
    diagnostic.suggestions.forEach((suggestion, i) => {
      lines.push(`  ${i + 1}. ${suggestion}`);
    });
    lines.push("");
  }

  if (diagnostic.stackTrace.length > 0) {
    lines.push("\u2500".repeat(40));
    lines.push("STACK TRACE");
    lines.push("\u2500".repeat(40));
    lines.push(...diagnostic.stackTrace);
    lines.push("");
  }

  lines.push("\u2500".repeat(40));
  lines.push("ENVIRONNEMENT");
  lines.push("\u2500".repeat(40));
  lines.push(`  Node.js: ${diagnostic.environment.nodeVersion}`);
  lines.push(`  Plateforme: ${diagnostic.environment.platform}`);
  lines.push(`  Architecture: ${diagnostic.environment.arch}`);
  lines.push(`  Repertoire: ${diagnostic.environment.cwd}`);
  lines.push("");

  lines.push("\u2550".repeat(60));

  return lines.join("\n");
}

/**
 * Verifie si une erreur est recuperable (peut etre retentee)
 */
export function isRecoverableError(error: Error): boolean {
  const ctx = createErrorContext(error);
  const recoverableCodes = [
    "RATE_LIMITED",
    "API_OVERLOADED",
    "API_SERVER_ERROR",
    "TIMEOUT",
    "NETWORK_ERROR",
    "FILE_LOCKED",
    "API_INVALID_RESPONSE",
  ];
  return recoverableCodes.includes(ctx.code);
}

/**
 * Calcule le delai de retry recommande pour une erreur recuperable (en ms)
 */
export function getRetryDelay(error: Error, attempt: number = 1): number {
  const ctx = createErrorContext(error);
  const baseDelays: Record<string, number> = {
    RATE_LIMITED: 60000, // 1 minute
    API_OVERLOADED: 30000, // 30 secondes
    API_SERVER_ERROR: 10000, // 10 secondes
    TIMEOUT: 5000, // 5 secondes
    NETWORK_ERROR: 5000, // 5 secondes
    FILE_LOCKED: 2000, // 2 secondes
    API_INVALID_RESPONSE: 3000, // 3 secondes
  };

  const baseDelay = baseDelays[ctx.code] || 5000;
  // Backoff exponentiel avec jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 1000;

  return Math.min(exponentialDelay + jitter, 300000); // Max 5 minutes
}

/**
 * Groupe les erreurs par categorie pour un rapport resume
 */
export function groupErrorsByCategory(errors: Error[]): Map<ErrorCategory, ErrorContext[]> {
  const grouped = new Map<ErrorCategory, ErrorContext[]>();

  for (const error of errors) {
    const ctx = createErrorContext(error);
    const category = getErrorCategory(ctx.code);

    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(ctx);
  }

  return grouped;
}

/**
 * Cree un resume des erreurs pour l'affichage
 */
export function createErrorSummary(errors: Error[]): string {
  if (errors.length === 0) {
    return formatSuccess("Aucune erreur detectee");
  }

  const grouped = groupErrorsByCategory(errors);
  const lines: string[] = [];

  lines.push("\u2550".repeat(50));
  lines.push(`  RESUME DES ERREURS (${errors.length} au total)`);
  lines.push("\u2550".repeat(50));
  lines.push("");

  grouped.forEach((contexts, category) => {
    const severities = contexts.map(c => getErrorSeverity(c.code));
    const hasCritical = severities.includes(ErrorSeverity.CRITICAL);
    const hasError = severities.includes(ErrorSeverity.ERROR);

    const icon = hasCritical ? "\uD83D\uDD34" : hasError ? "\uD83D\uDFE0" : "\uD83D\uDFE1";
    lines.push(`${icon} ${category}: ${contexts.length} erreur(s)`);

    // Lister les codes uniques
    const uniqueCodes = Array.from(new Set(contexts.map(c => c.code)));
    uniqueCodes.forEach(code => {
      const count = contexts.filter(c => c.code === code).length;
      lines.push(`   - ${code} (${count}x)`);
    });
    lines.push("");
  });

  // Ajouter des conseils generaux
  const allContexts: ErrorContext[] = [];
  grouped.forEach(contexts => allContexts.push(...contexts));
  const hasRecoverable = allContexts.some(c => {
    const err = c.cause || new Error(c.message);
    return isRecoverableError(err);
  });

  if (hasRecoverable) {
    lines.push("\uD83D\uDCA1 Certaines erreurs peuvent etre resolues en reessayant.");
  }

  return lines.join("\n");
}
