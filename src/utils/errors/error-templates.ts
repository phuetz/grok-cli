/**
 * Error Templates
 *
 * Defines QuickAction and ErrorContext interfaces, plus
 * the comprehensive ERROR_TEMPLATES mapping with user-friendly messages
 * and actionable suggestions.
 */

import { EXIT_CODES, ExitCode } from "../exit-codes.js";

/**
 * Quick action that can be executed to fix an error
 */
export interface QuickAction {
  /** Label describing the action */
  label: string;
  /** Command to run (for display purposes) */
  command?: string;
  /** Description of what the action does */
  description: string;
}

/**
 * Error context for structured output
 */
export interface ErrorContext {
  /** Error code identifier */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional details about the error */
  details?: string;

  /** Actionable suggestion to fix the error */
  suggestion?: string;

  /** Link to documentation */
  docUrl?: string;

  /** Related error (cause) */
  cause?: Error;

  /** Exit code for CLI */
  exitCode?: ExitCode;

  /** Quick actions the user can take */
  quickActions?: QuickAction[];

  /** File path related to the error (for file errors) */
  filePath?: string;

  /** Whether to show the stack trace */
  showStackTrace?: boolean;
}

/**
 * Common error templates with user-friendly messages
 */
export const ERROR_TEMPLATES = {
  API_KEY_MISSING: {
    code: "API_KEY_MISSING",
    message: "La cle API n'est pas configuree",
    suggestion: "Configurez votre cle API pour utiliser Code Buddy",
    docUrl: "https://github.com/phuetz/code-buddy#configuration",
    exitCode: EXIT_CODES.AUTHENTICATION_ERROR,
    quickActions: [
      {
        label: "Configurer la cle API",
        command: "grok config --set-api-key VOTRE_CLE",
        description: "Configure la cle API de maniere interactive",
      },
      {
        label: "Utiliser une variable d'environnement",
        command: "export GROK_API_KEY=votre_cle",
        description: "Definit la cle via l'environnement",
      },
    ],
  },

  API_KEY_INVALID: {
    code: "API_KEY_INVALID",
    message: "La cle API est invalide ou a expire",
    suggestion: "Verifiez que votre cle API est correcte et active sur console.x.ai",
    docUrl: "https://github.com/phuetz/code-buddy#configuration",
    exitCode: EXIT_CODES.AUTHENTICATION_ERROR,
    quickActions: [
      {
        label: "Verifier la cle sur x.ai",
        command: "open https://console.x.ai/api-keys",
        description: "Ouvre la console xAI pour verifier votre cle",
      },
      {
        label: "Mettre a jour la cle",
        command: "grok config --set-api-key",
        description: "Configure une nouvelle cle API",
      },
    ],
  },

  RATE_LIMITED: {
    code: "RATE_LIMITED",
    message: "Limite de requetes API atteinte",
    suggestion: "L'API a recu trop de requetes. Attendez quelques minutes avant de reessayer.",
    exitCode: EXIT_CODES.API_ERROR,
    quickActions: [
      {
        label: "Attendre et reessayer",
        description: "Patientez 1-2 minutes puis relancez votre commande",
      },
      {
        label: "Verifier votre forfait",
        command: "open https://console.x.ai/billing",
        description: "Consultez et augmentez eventuellement votre limite",
      },
    ],
  },

  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    message: "Connexion a l'API echouee",
    suggestion: "Verifiez votre connexion internet et que l'API est accessible",
    exitCode: EXIT_CODES.NETWORK_ERROR,
    quickActions: [
      {
        label: "Verifier la connexion",
        command: "ping api.x.ai",
        description: "Teste la connectivite reseau vers l'API",
      },
      {
        label: "Verifier le proxy",
        description: "Assurez-vous que votre proxy/VPN n'interfere pas",
      },
    ],
  },

  TIMEOUT: {
    code: "TIMEOUT",
    message: "La requete a expire (timeout)",
    suggestion: "Le serveur met trop de temps a repondre. Essayez avec une demande plus simple.",
    exitCode: EXIT_CODES.TIMEOUT,
    quickActions: [
      {
        label: "Reessayer",
        description: "Relancez la meme commande",
      },
      {
        label: "Simplifier la requete",
        description: "Divisez votre demande en parties plus petites",
      },
      {
        label: "Augmenter le timeout",
        command: "export GROK_TIMEOUT=120000",
        description: "Augmente le delai d'attente a 2 minutes",
      },
    ],
  },

  FILE_NOT_FOUND: {
    code: "FILE_NOT_FOUND",
    message: "Fichier ou dossier introuvable",
    suggestion: "Le chemin specifie n'existe pas. Verifiez l'orthographe et le chemin.",
    exitCode: EXIT_CODES.FILE_NOT_FOUND,
    quickActions: [
      {
        label: "Lister les fichiers",
        command: "ls -la",
        description: "Affiche les fichiers du repertoire courant",
      },
      {
        label: "Rechercher le fichier",
        command: "find . -name 'nom_fichier'",
        description: "Recherche le fichier dans le projet",
      },
      {
        label: "Creer le fichier",
        description: "Voulez-vous creer ce fichier?",
      },
    ],
  },

  PERMISSION_DENIED: {
    code: "PERMISSION_DENIED",
    message: "Permission refusee",
    suggestion: "Vous n'avez pas les droits necessaires pour cette operation",
    exitCode: EXIT_CODES.PERMISSION_DENIED,
    quickActions: [
      {
        label: "Verifier les permissions",
        command: "ls -la chemin/fichier",
        description: "Affiche les permissions du fichier",
      },
      {
        label: "Modifier les permissions",
        command: "chmod u+rw chemin/fichier",
        description: "Ajoute les droits de lecture/ecriture",
      },
      {
        label: "Executer en sudo",
        command: "sudo grok ...",
        description: "Execute avec les privileges administrateur (attention!)",
      },
    ],
  },

  COST_LIMIT: {
    code: "COST_LIMIT",
    message: "Limite de cout de session atteinte",
    suggestion: "La session a atteint le plafond de depenses configure pour eviter les surprises",
    docUrl: "https://github.com/phuetz/code-buddy#cost-management",
    exitCode: EXIT_CODES.COST_LIMIT_EXCEEDED,
    quickActions: [
      {
        label: "Augmenter la limite",
        command: "export MAX_COST=20",
        description: "Augmente la limite a $20 pour cette session",
      },
      {
        label: "Nouvelle session",
        command: "grok",
        description: "Demarre une nouvelle session avec le budget remis a zero",
      },
      {
        label: "Voir les couts",
        command: "/cost",
        description: "Affiche le detail des couts de la session",
      },
    ],
  },

  MODEL_NOT_FOUND: {
    code: "MODEL_NOT_FOUND",
    message: "Modele non disponible",
    suggestion: "Le modele demande n'existe pas ou n'est pas accessible avec votre cle API",
    exitCode: EXIT_CODES.MODEL_NOT_AVAILABLE,
    quickActions: [
      {
        label: "Voir les modeles disponibles",
        command: "/model",
        description: "Liste tous les modeles accessibles",
      },
      {
        label: "Utiliser le modele par defaut",
        command: "grok config --reset-model",
        description: "Revient au modele par defaut",
      },
    ],
  },

  CONFIG_INVALID: {
    code: "CONFIG_INVALID",
    message: "Fichier de configuration invalide",
    suggestion: "Le fichier de configuration contient des erreurs de syntaxe ou de format",
    docUrl: "https://github.com/phuetz/code-buddy#configuration",
    exitCode: EXIT_CODES.CONFIG_ERROR,
    quickActions: [
      {
        label: "Voir la configuration",
        command: "grok config --show",
        description: "Affiche la configuration actuelle",
      },
      {
        label: "Reinitialiser la config",
        command: "grok config --reset",
        description: "Remet la configuration par defaut",
      },
      {
        label: "Editer manuellement",
        command: "code ~/.config/grok/config.json",
        description: "Ouvre le fichier de configuration dans l'editeur",
      },
    ],
  },

  MCP_CONNECTION_FAILED: {
    code: "MCP_CONNECTION_FAILED",
    message: "Connexion au serveur MCP echouee",
    suggestion: "Le serveur MCP ne repond pas. Verifiez qu'il est demarre et configure correctement.",
    docUrl: "https://github.com/phuetz/code-buddy#mcp-servers",
    exitCode: EXIT_CODES.MCP_ERROR,
    quickActions: [
      {
        label: "Verifier les serveurs MCP",
        command: "/mcp status",
        description: "Affiche l'etat des serveurs MCP configures",
      },
      {
        label: "Redemarrer le serveur",
        command: "/mcp restart",
        description: "Tente de redemarrer le serveur MCP",
      },
      {
        label: "Voir la configuration MCP",
        command: "cat ~/.config/grok/mcp.json",
        description: "Affiche la configuration des serveurs MCP",
      },
    ],
  },

  TOOL_FAILED: {
    code: "TOOL_FAILED",
    message: "L'execution de l'outil a echoue",
    suggestion: "L'outil n'a pas pu s'executer correctement. Verifiez les parametres.",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
    quickActions: [
      {
        label: "Voir l'aide de l'outil",
        command: "/tools",
        description: "Liste les outils disponibles et leur usage",
      },
      {
        label: "Reessayer",
        description: "Relancez avec des parametres differents",
      },
    ],
  },

  PATH_TRAVERSAL: {
    code: "PATH_TRAVERSAL",
    message: "Acces bloque: tentative de sortie du repertoire projet",
    suggestion: "Pour des raisons de securite, les chemins doivent rester dans le projet",
    exitCode: EXIT_CODES.SECURITY_ERROR,
    quickActions: [
      {
        label: "Utiliser un chemin relatif",
        description: "Utilisez des chemins relatifs au projet (ex: ./src/fichier.ts)",
      },
      {
        label: "Changer de repertoire de travail",
        command: "cd /chemin/vers/projet && grok",
        description: "Lancez grok depuis le repertoire souhaite",
      },
    ],
  },

  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    message: "Donnees invalides",
    suggestion: "Les donnees fournies ne respectent pas le format attendu",
    exitCode: EXIT_CODES.VALIDATION_ERROR,
    quickActions: [
      {
        label: "Voir le format attendu",
        description: "Consultez la documentation pour le format correct",
      },
    ],
  },

  SESSION_EXPIRED: {
    code: "SESSION_EXPIRED",
    message: "La session a expire",
    suggestion: "Votre session n'est plus active. Demarrez une nouvelle session.",
    exitCode: EXIT_CODES.SESSION_ERROR,
    quickActions: [
      {
        label: "Nouvelle session",
        command: "grok",
        description: "Demarre une nouvelle session interactive",
      },
      {
        label: "Reprendre une session",
        command: "grok --resume",
        description: "Tente de reprendre la derniere session",
      },
    ],
  },

  CHECKPOINT_NOT_FOUND: {
    code: "CHECKPOINT_NOT_FOUND",
    message: "Point de restauration introuvable",
    suggestion: "Le checkpoint demande n'existe pas ou a ete supprime",
    exitCode: EXIT_CODES.CHECKPOINT_ERROR,
    quickActions: [
      {
        label: "Voir les checkpoints",
        command: "/checkpoints",
        description: "Liste tous les points de restauration disponibles",
      },
      {
        label: "Creer un checkpoint",
        command: "/checkpoint create",
        description: "Cree un nouveau point de restauration",
      },
    ],
  },

  MEMORY_LIMIT: {
    code: "MEMORY_LIMIT",
    message: "Limite de memoire atteinte",
    suggestion: "L'operation utilise trop de memoire. Essayez avec moins de donnees.",
    exitCode: EXIT_CODES.RESOURCE_ERROR,
    quickActions: [
      {
        label: "Traiter par lots",
        description: "Divisez l'operation en parties plus petites",
      },
      {
        label: "Fermer d'autres applications",
        description: "Liberez de la memoire en fermant d'autres programmes",
      },
      {
        label: "Augmenter la limite Node.js",
        command: "export NODE_OPTIONS='--max-old-space-size=4096'",
        description: "Augmente la memoire disponible pour Node.js",
      },
    ],
  },

  DEPENDENCY_MISSING: {
    code: "DEPENDENCY_MISSING",
    message: "Dependance manquante",
    suggestion: "Une bibliotheque requise n'est pas installee",
    exitCode: EXIT_CODES.DEPENDENCY_ERROR,
    quickActions: [
      {
        label: "Installer les dependances",
        command: "npm install",
        description: "Installe toutes les dependances du projet",
      },
      {
        label: "Reinstaller",
        command: "rm -rf node_modules && npm install",
        description: "Reinstallation complete des dependances",
      },
    ],
  },

  SANDBOX_VIOLATION: {
    code: "SANDBOX_VIOLATION",
    message: "Operation bloquee par le mode securise",
    suggestion: "Cette commande necessite des permissions supplementaires pour s'executer",
    docUrl: "https://github.com/phuetz/code-buddy#security-modes",
    exitCode: EXIT_CODES.SECURITY_ERROR,
    quickActions: [
      {
        label: "Autoriser cette fois",
        description: "Approuvez l'operation lorsque demande",
      },
      {
        label: "Passer en mode auto-edit",
        command: "/security auto-edit",
        description: "Autorise les modifications de fichiers sans confirmation",
      },
      {
        label: "Mode full-auto (attention!)",
        command: "/security full-auto",
        description: "Desactive toutes les confirmations - utilisez avec precaution",
      },
    ],
  },

  CONTEXT_TOO_LARGE: {
    code: "CONTEXT_TOO_LARGE",
    message: "Contexte trop volumineux",
    suggestion: "Le contexte depasse la capacite du modele. Reduisez la quantite de donnees.",
    exitCode: EXIT_CODES.CONTEXT_ERROR,
    quickActions: [
      {
        label: "Compacter le contexte",
        command: "/compact",
        description: "Resume et compresse le contexte de conversation",
      },
      {
        label: "Nouvelle conversation",
        command: "/clear",
        description: "Demarre une nouvelle conversation sans historique",
      },
      {
        label: "Exclure des fichiers",
        description: "Specifiez moins de fichiers dans votre demande",
      },
    ],
  },

  GIT_CONFLICT: {
    code: "GIT_CONFLICT",
    message: "Conflit Git detecte",
    suggestion: "Des conflits empechent l'operation Git. Resolvez-les avant de continuer.",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
    quickActions: [
      {
        label: "Voir les conflits",
        command: "git status",
        description: "Liste les fichiers en conflit",
      },
      {
        label: "Annuler l'operation",
        command: "git merge --abort",
        description: "Annule le merge en cours",
      },
    ],
  },

  DOCKER_NOT_RUNNING: {
    code: "DOCKER_NOT_RUNNING",
    message: "Docker n'est pas disponible",
    suggestion: "Le daemon Docker n'est pas demarre ou n'est pas installe",
    exitCode: EXIT_CODES.DEPENDENCY_ERROR,
    quickActions: [
      {
        label: "Demarrer Docker",
        command: "sudo systemctl start docker",
        description: "Demarre le service Docker",
      },
      {
        label: "Verifier Docker",
        command: "docker info",
        description: "Affiche les informations Docker",
      },
    ],
  },

  JSON_PARSE_ERROR: {
    code: "JSON_PARSE_ERROR",
    message: "Erreur de parsing JSON",
    suggestion: "Le fichier JSON contient des erreurs de syntaxe",
    exitCode: EXIT_CODES.VALIDATION_ERROR,
    quickActions: [
      {
        label: "Valider le JSON",
        command: "cat fichier.json | jq .",
        description: "Verifie et formate le JSON",
      },
    ],
  },

  // ===============================================================================
  // ERREURS API AVANCEES
  // ===============================================================================

  API_QUOTA_EXCEEDED: {
    code: "API_QUOTA_EXCEEDED",
    message: "Quota API mensuel depasse",
    suggestion: "Votre forfait API a atteint sa limite mensuelle. Attendez le renouvellement ou passez au forfait superieur.",
    docUrl: "https://console.x.ai/billing",
    exitCode: EXIT_CODES.API_ERROR,
    quickActions: [
      {
        label: "Voir votre consommation",
        command: "open https://console.x.ai/usage",
        description: "Consulte les statistiques d'utilisation de votre compte",
      },
      {
        label: "Mettre a niveau le forfait",
        command: "open https://console.x.ai/billing/upgrade",
        description: "Augmente votre limite mensuelle",
      },
      {
        label: "Utiliser un modele plus economique",
        command: "/model grok-2-mini",
        description: "Le modele mini consomme moins de quota",
      },
    ],
  },

  API_SERVER_ERROR: {
    code: "API_SERVER_ERROR",
    message: "Erreur interne du serveur API (5xx)",
    suggestion: "Le serveur xAI rencontre des problemes temporaires. Ce n'est pas de votre faute!",
    exitCode: EXIT_CODES.API_ERROR,
    quickActions: [
      {
        label: "Verifier le statut xAI",
        command: "open https://status.x.ai",
        description: "Consulte l'etat des services xAI",
      },
      {
        label: "Reessayer dans quelques minutes",
        description: "Les erreurs serveur sont generalement temporaires",
      },
      {
        label: "Utiliser un endpoint alternatif",
        command: "export GROK_BASE_URL=https://api.x.ai/v2",
        description: "Tente d'utiliser un endpoint de secours",
      },
    ],
  },

  API_OVERLOADED: {
    code: "API_OVERLOADED",
    message: "API surchargee (503)",
    suggestion: "L'API est momentanement surchargee. Reessayez dans quelques instants.",
    exitCode: EXIT_CODES.API_ERROR,
    quickActions: [
      {
        label: "Attendre et reessayer",
        description: "Patientez 30 secondes puis relancez",
      },
      {
        label: "Activer le mode retry automatique",
        command: "export GROK_AUTO_RETRY=true",
        description: "Active les tentatives automatiques avec backoff",
      },
    ],
  },

  API_INVALID_RESPONSE: {
    code: "API_INVALID_RESPONSE",
    message: "Reponse API invalide ou corrompue",
    suggestion: "L'API a renvoye une reponse inattendue. Cela peut indiquer un probleme temporaire.",
    exitCode: EXIT_CODES.API_ERROR,
    quickActions: [
      {
        label: "Reessayer la requete",
        description: "Relancez votre demande",
      },
      {
        label: "Verifier les logs",
        command: "cat ~/.config/grok/logs/latest.log | tail -50",
        description: "Examine les logs recents pour plus de details",
      },
      {
        label: "Signaler le probleme",
        command: "open https://github.com/phuetz/code-buddy/issues/new",
        description: "Creez un rapport de bug si le probleme persiste",
      },
    ],
  },

  API_CONTENT_FILTERED: {
    code: "API_CONTENT_FILTERED",
    message: "Contenu filtre par la moderation",
    suggestion: "Votre demande a ete bloquee par les filtres de securite de l'API.",
    exitCode: EXIT_CODES.API_ERROR,
    quickActions: [
      {
        label: "Reformuler la demande",
        description: "Essayez de formuler votre requete differemment",
      },
      {
        label: "Diviser la requete",
        description: "Si vous traitez un fichier, divisez-le en parties plus petites",
      },
    ],
  },

  // ===============================================================================
  // ERREURS TYPESCRIPT / COMPILATION
  // ===============================================================================

  TYPESCRIPT_ERROR: {
    code: "TYPESCRIPT_ERROR",
    message: "Erreur de compilation TypeScript",
    suggestion: "Le code contient des erreurs TypeScript qui empechent la compilation.",
    exitCode: EXIT_CODES.VALIDATION_ERROR,
    quickActions: [
      {
        label: "Voir les erreurs detaillees",
        command: "npm run typecheck",
        description: "Lance la verification de types",
      },
      {
        label: "Corriger automatiquement",
        description: "Demandez a Code Buddy de corriger les erreurs TypeScript",
      },
      {
        label: "Ignorer temporairement",
        command: "// @ts-ignore",
        description: "Ajoute un commentaire pour ignorer l'erreur (deconseille)",
      },
    ],
  },

  BUILD_FAILED: {
    code: "BUILD_FAILED",
    message: "Echec de la compilation du projet",
    suggestion: "Le build a echoue. Verifiez les erreurs ci-dessus et corrigez-les.",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
    quickActions: [
      {
        label: "Voir le build verbose",
        command: "npm run build -- --verbose",
        description: "Affiche plus de details sur l'echec",
      },
      {
        label: "Nettoyer et rebuilder",
        command: "rm -rf dist && npm run build",
        description: "Supprime le cache et rebuild",
      },
      {
        label: "Verifier les dependances",
        command: "npm ls",
        description: "Liste les dependances et leurs versions",
      },
    ],
  },

  LINT_ERROR: {
    code: "LINT_ERROR",
    message: "Erreurs de linting detectees",
    suggestion: "Le code ne respecte pas les regles de style configurees.",
    exitCode: EXIT_CODES.VALIDATION_ERROR,
    quickActions: [
      {
        label: "Corriger automatiquement",
        command: "npm run lint -- --fix",
        description: "Corrige automatiquement les erreurs corrigeables",
      },
      {
        label: "Voir les regles violees",
        command: "npm run lint",
        description: "Affiche toutes les erreurs de linting",
      },
    ],
  },

  // ===============================================================================
  // ERREURS GIT AVANCEES
  // ===============================================================================

  GIT_NOT_INITIALIZED: {
    code: "GIT_NOT_INITIALIZED",
    message: "Ce repertoire n'est pas un depot Git",
    suggestion: "Initialisez Git ou naviguez vers un repertoire contenant un projet Git.",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
    quickActions: [
      {
        label: "Initialiser Git",
        command: "git init",
        description: "Cree un nouveau depot Git dans ce repertoire",
      },
      {
        label: "Cloner un depot",
        command: "git clone <url>",
        description: "Clone un depot existant",
      },
    ],
  },

  GIT_UNCOMMITTED_CHANGES: {
    code: "GIT_UNCOMMITTED_CHANGES",
    message: "Modifications non commitees detectees",
    suggestion: "Vous avez des changements locaux. Commitez ou stashez-les avant de continuer.",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
    quickActions: [
      {
        label: "Voir les changements",
        command: "git status",
        description: "Affiche les fichiers modifies",
      },
      {
        label: "Stasher temporairement",
        command: "git stash",
        description: "Met de cote les changements temporairement",
      },
      {
        label: "Commiter les changements",
        command: "git add -A && git commit -m 'WIP'",
        description: "Sauvegarde les changements dans un commit",
      },
    ],
  },

  GIT_BRANCH_EXISTS: {
    code: "GIT_BRANCH_EXISTS",
    message: "La branche existe deja",
    suggestion: "Une branche avec ce nom existe deja. Choisissez un autre nom ou supprimez l'existante.",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
    quickActions: [
      {
        label: "Lister les branches",
        command: "git branch -a",
        description: "Affiche toutes les branches",
      },
      {
        label: "Basculer sur la branche",
        command: "git checkout nom-branche",
        description: "Bascule sur la branche existante",
      },
      {
        label: "Supprimer la branche",
        command: "git branch -d nom-branche",
        description: "Supprime la branche (attention!)",
      },
    ],
  },

  GIT_PUSH_REJECTED: {
    code: "GIT_PUSH_REJECTED",
    message: "Push rejete par le serveur distant",
    suggestion: "Le serveur a rejete votre push. Cela arrive souvent quand la branche distante a des commits que vous n'avez pas.",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
    quickActions: [
      {
        label: "Pull puis push",
        command: "git pull --rebase && git push",
        description: "Integre les changements distants puis pousse",
      },
      {
        label: "Voir les differences",
        command: "git fetch && git log HEAD..origin/main",
        description: "Compare votre branche avec la distante",
      },
    ],
  },

  GIT_MERGE_FAILED: {
    code: "GIT_MERGE_FAILED",
    message: "Echec du merge",
    suggestion: "Le merge automatique a echoue. Des conflits necessitent une resolution manuelle.",
    exitCode: EXIT_CODES.TOOL_EXECUTION_FAILED,
    quickActions: [
      {
        label: "Voir les fichiers en conflit",
        command: "git diff --name-only --diff-filter=U",
        description: "Liste les fichiers avec conflits",
      },
      {
        label: "Annuler le merge",
        command: "git merge --abort",
        description: "Revient a l'etat avant le merge",
      },
      {
        label: "Resoudre avec l'editeur",
        description: "Ouvrez les fichiers en conflit et resolvez manuellement",
      },
    ],
  },

  // ===============================================================================
  // ERREURS WORKSPACE / PROJET
  // ===============================================================================

  WORKSPACE_NOT_FOUND: {
    code: "WORKSPACE_NOT_FOUND",
    message: "Workspace introuvable",
    suggestion: "Le workspace specifie n'existe pas ou n'est plus accessible.",
    exitCode: EXIT_CODES.FILE_NOT_FOUND,
    quickActions: [
      {
        label: "Lister les workspaces",
        command: "/workspace list",
        description: "Affiche tous les workspaces disponibles",
      },
      {
        label: "Creer un workspace",
        command: "/workspace create nom",
        description: "Cree un nouveau workspace",
      },
    ],
  },

  PROJECT_NOT_NODE: {
    code: "PROJECT_NOT_NODE",
    message: "Ce n'est pas un projet Node.js",
    suggestion: "Aucun fichier package.json trouve. Initialisez un projet Node.js ou naviguez vers un projet existant.",
    exitCode: EXIT_CODES.VALIDATION_ERROR,
    quickActions: [
      {
        label: "Initialiser npm",
        command: "npm init -y",
        description: "Cree un package.json minimal",
      },
      {
        label: "Chercher package.json",
        command: "find . -name 'package.json' -not -path '*/node_modules/*'",
        description: "Recherche un package.json dans les sous-dossiers",
      },
    ],
  },

  PACKAGE_INSTALL_FAILED: {
    code: "PACKAGE_INSTALL_FAILED",
    message: "Echec de l'installation des packages",
    suggestion: "npm install a echoue. Verifiez votre connexion et les erreurs ci-dessus.",
    exitCode: EXIT_CODES.DEPENDENCY_ERROR,
    quickActions: [
      {
        label: "Nettoyer le cache npm",
        command: "npm cache clean --force",
        description: "Vide le cache npm qui peut etre corrompu",
      },
      {
        label: "Supprimer node_modules",
        command: "rm -rf node_modules package-lock.json && npm install",
        description: "Reinstallation complete depuis zero",
      },
      {
        label: "Verifier le registre npm",
        command: "npm config get registry",
        description: "S'assure que le registre npm est accessible",
      },
    ],
  },

  // ===============================================================================
  // ERREURS FICHIERS AVANCEES
  // ===============================================================================

  FILE_TOO_LARGE: {
    code: "FILE_TOO_LARGE",
    message: "Fichier trop volumineux",
    suggestion: "Le fichier depasse la taille maximale supportee pour cette operation.",
    exitCode: EXIT_CODES.RESOURCE_ERROR,
    quickActions: [
      {
        label: "Voir la taille",
        command: "ls -lh fichier",
        description: "Affiche la taille du fichier",
      },
      {
        label: "Traiter par parties",
        description: "Divisez le fichier en parties plus petites",
      },
      {
        label: "Compresser d'abord",
        command: "gzip fichier",
        description: "Compresse le fichier avant traitement",
      },
    ],
  },

  FILE_LOCKED: {
    code: "FILE_LOCKED",
    message: "Fichier verrouille par un autre processus",
    suggestion: "Un autre programme utilise ce fichier. Fermez-le ou attendez qu'il soit libere.",
    exitCode: EXIT_CODES.PERMISSION_DENIED,
    quickActions: [
      {
        label: "Trouver le processus",
        command: "lsof fichier",
        description: "Identifie quel processus verrouille le fichier",
      },
      {
        label: "Attendre et reessayer",
        description: "Patientez quelques secondes puis relancez",
      },
    ],
  },

  FILE_ENCODING_ERROR: {
    code: "FILE_ENCODING_ERROR",
    message: "Erreur d'encodage du fichier",
    suggestion: "Le fichier n'est pas en UTF-8 ou contient des caracteres invalides.",
    exitCode: EXIT_CODES.VALIDATION_ERROR,
    quickActions: [
      {
        label: "Detecter l'encodage",
        command: "file -i fichier",
        description: "Identifie l'encodage actuel du fichier",
      },
      {
        label: "Convertir en UTF-8",
        command: "iconv -f ENCODAGE_SOURCE -t UTF-8 fichier > fichier.utf8",
        description: "Convertit le fichier en UTF-8",
      },
    ],
  },

  DISK_FULL: {
    code: "DISK_FULL",
    message: "Espace disque insuffisant",
    suggestion: "Le disque est plein ou n'a pas assez d'espace pour cette operation.",
    exitCode: EXIT_CODES.RESOURCE_ERROR,
    quickActions: [
      {
        label: "Voir l'espace disque",
        command: "df -h",
        description: "Affiche l'utilisation de l'espace disque",
      },
      {
        label: "Trouver les gros fichiers",
        command: "du -sh * | sort -rh | head -20",
        description: "Liste les 20 plus gros elements",
      },
      {
        label: "Vider le cache npm",
        command: "npm cache clean --force",
        description: "Libere l'espace utilise par le cache npm",
      },
    ],
  },

  // ===============================================================================
  // ERREURS SECURITE
  // ===============================================================================

  UNSAFE_COMMAND_BLOCKED: {
    code: "UNSAFE_COMMAND_BLOCKED",
    message: "Commande potentiellement dangereuse bloquee",
    suggestion: "Cette commande a ete bloquee car elle pourrait causer des dommages irreversibles.",
    docUrl: "https://github.com/phuetz/code-buddy#security-modes",
    exitCode: EXIT_CODES.SECURITY_ERROR,
    quickActions: [
      {
        label: "Comprendre le risque",
        description: "La commande pourrait supprimer des fichiers ou modifier le systeme",
      },
      {
        label: "Executer manuellement",
        description: "Si vous etes sur, executez la commande directement dans votre terminal",
      },
      {
        label: "Activer YOLO mode",
        command: "/yolo on",
        description: "Desactive les protections (utilisez avec precaution!)",
      },
    ],
  },

  SECRETS_DETECTED: {
    code: "SECRETS_DETECTED",
    message: "Secrets ou credentials detectes dans le code",
    suggestion: "Des cles API, mots de passe ou tokens semblent etre presents dans le code.",
    exitCode: EXIT_CODES.SECURITY_ERROR,
    quickActions: [
      {
        label: "Scanner les secrets",
        command: "git secrets --scan",
        description: "Recherche les secrets dans le code",
      },
      {
        label: "Utiliser des variables d'env",
        description: "Deplacez les secrets vers des variables d'environnement",
      },
      {
        label: "Ajouter au .gitignore",
        command: "echo 'fichier_secret' >> .gitignore",
        description: "Exclut le fichier du depot Git",
      },
    ],
  },

  // ===============================================================================
  // ERREURS EXECUTION / RUNTIME
  // ===============================================================================

  PROCESS_KILLED: {
    code: "PROCESS_KILLED",
    message: "Processus termine de force",
    suggestion: "Le processus a ete tue, probablement par manque de memoire ou timeout.",
    exitCode: EXIT_CODES.RESOURCE_ERROR,
    quickActions: [
      {
        label: "Verifier la memoire",
        command: "free -h",
        description: "Affiche la memoire disponible",
      },
      {
        label: "Augmenter la memoire Node.js",
        command: "export NODE_OPTIONS='--max-old-space-size=4096'",
        description: "Alloue plus de memoire au processus",
      },
    ],
  },

  COMMAND_NOT_FOUND: {
    code: "COMMAND_NOT_FOUND",
    message: "Commande introuvable",
    suggestion: "La commande n'existe pas ou n'est pas dans votre PATH.",
    exitCode: EXIT_CODES.DEPENDENCY_ERROR,
    quickActions: [
      {
        label: "Verifier l'installation",
        command: "which nom_commande",
        description: "Verifie si la commande est installee",
      },
      {
        label: "Installer via npm",
        command: "npm install -g nom_package",
        description: "Installe globalement le package",
      },
      {
        label: "Verifier le PATH",
        command: "echo $PATH",
        description: "Affiche les repertoires dans le PATH",
      },
    ],
  },

  SCRIPT_SYNTAX_ERROR: {
    code: "SCRIPT_SYNTAX_ERROR",
    message: "Erreur de syntaxe dans le script",
    suggestion: "Le script contient une erreur de syntaxe qui empeche son execution.",
    exitCode: EXIT_CODES.VALIDATION_ERROR,
    quickActions: [
      {
        label: "Verifier la syntaxe",
        description: "Consultez le numero de ligne indique dans l'erreur",
      },
      {
        label: "Linter le fichier",
        command: "npx eslint fichier.js",
        description: "Analyse le fichier pour trouver les erreurs",
      },
    ],
  },

  // ===============================================================================
  // ERREURS PLUGINS / EXTENSIONS
  // ===============================================================================

  PLUGIN_NOT_FOUND: {
    code: "PLUGIN_NOT_FOUND",
    message: "Plugin introuvable",
    suggestion: "Le plugin demande n'est pas installe ou n'existe pas dans le registre.",
    exitCode: EXIT_CODES.DEPENDENCY_ERROR,
    quickActions: [
      {
        label: "Lister les plugins",
        command: "/plugins list",
        description: "Affiche tous les plugins installes",
      },
      {
        label: "Rechercher dans le marketplace",
        command: "/plugins search nom",
        description: "Recherche un plugin dans le marketplace",
      },
      {
        label: "Installer le plugin",
        command: "/plugins install nom",
        description: "Installe le plugin depuis le marketplace",
      },
    ],
  },

  PLUGIN_LOAD_ERROR: {
    code: "PLUGIN_LOAD_ERROR",
    message: "Erreur de chargement du plugin",
    suggestion: "Le plugin n'a pas pu etre charge. Il peut etre corrompu ou incompatible.",
    exitCode: EXIT_CODES.DEPENDENCY_ERROR,
    quickActions: [
      {
        label: "Reinstaller le plugin",
        command: "/plugins reinstall nom",
        description: "Desinstalle et reinstalle le plugin",
      },
      {
        label: "Voir les logs du plugin",
        command: "cat ~/.config/grok/plugins/nom/error.log",
        description: "Consulte les logs d'erreur du plugin",
      },
      {
        label: "Desactiver le plugin",
        command: "/plugins disable nom",
        description: "Desactive temporairement le plugin",
      },
    ],
  },

  PLUGIN_VERSION_MISMATCH: {
    code: "PLUGIN_VERSION_MISMATCH",
    message: "Version du plugin incompatible",
    suggestion: "Le plugin n'est pas compatible avec cette version de Code Buddy.",
    exitCode: EXIT_CODES.DEPENDENCY_ERROR,
    quickActions: [
      {
        label: "Mettre a jour le plugin",
        command: "/plugins update nom",
        description: "Met a jour vers la derniere version compatible",
      },
      {
        label: "Mettre a jour Code Buddy",
        command: "npm update -g @phuetz/grok",
        description: "Met a jour Code Buddy vers la derniere version",
      },
    ],
  },
} as const;
