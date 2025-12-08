# Chapitre 10 — Tool-Use et Tool-Calling 🔧

---

## 🎬 Scène d'ouverture

*Lina a construit le reasoning, la mémoire, le RAG. Son agent peut réfléchir et se souvenir. Mais il ne peut toujours pas **agir**.*

**Lina** : "Crée un fichier test.txt"

**Agent** : *"Voici comment créer un fichier test.txt : utilisez la commande `touch test.txt` ou ouvrez votre éditeur..."*

**Lina** *(frustrée)* : "Non ! Je ne veux pas que tu m'**expliques**. Je veux que tu le **fasses** !"

**Marc** *(passant par là)* : "Ton agent est un cerveau sans mains. Il peut penser, mais pas agir sur le monde."

**Lina** : "Comment je lui donne des mains ?"

**Marc** : "Avec des **outils**. Chaque outil est une capacité d'action : lire un fichier, exécuter une commande, chercher dans le code. Le LLM décide quel outil utiliser, et ton code l'exécute."

*Lina ouvre son carnet. C'est le moment de donner des mains à son agent.*

---

## 📋 Table des matières

| Section | Titre | Description |
|:-------:|-------|-------------|
| 10.1 | 🔩 Anatomie d'un Outil | Interface et structure |
| 10.2 | 🔄 Protocole de Tool-Calling | Le flow complet |
| 10.3 | 📦 Les 41 Outils Grok-CLI | Catalogue complet |
| 10.4 | 🔒 Validation et Sécurité | Protéger l'exécution |
| 10.5 | ⚙️ Orchestration | Exécution et parallélisme |
| 10.6 | 🚨 Gestion des Erreurs | Récupération automatique |
| 10.7 | 📝 Bonnes Pratiques | Design patterns |

---

## 10.1 🔩 Anatomie d'un Outil

### 10.1.1 Interface standard

Un outil est une **fonction** que le LLM peut invoquer. Il a un nom, une description, un schéma d'entrée, et une méthode d'exécution.

```typescript
// src/tools/types.ts

export interface Tool {
  // 🏷️ Identité
  name: string;                    // Identifiant unique
  description: string;             // Description pour le LLM

  // 📐 Schema
  inputSchema: JSONSchema;         // Paramètres acceptés
  outputSchema?: JSONSchema;       // Format de sortie (optionnel)

  // ⚙️ Comportement
  requiresConfirmation?: boolean;  // Demander avant d'exécuter
  timeout?: number;                // Timeout en ms
  category?: string;               // Pour regroupement

  // ▶️ Exécution
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

![Structure d'un outil](images/tool-structure.svg)

| Champ | Type | Obligatoire | Description |
|-------|------|:-----------:|-------------|
| `name` | string | ✅ | Identifiant unique (snake_case) |
| `description` | string | ✅ | Description détaillée pour le LLM |
| `inputSchema` | JSONSchema | ✅ | Schéma des paramètres |
| `requiresConfirmation` | boolean | ❌ | Demander avant d'exécuter |
| `timeout` | number | ❌ | Timeout en ms (défaut: 30s) |
| `execute` | function | ✅ | Méthode d'exécution |

### 10.1.2 Exemple complet : read_file

Voici l'implémentation complète d'un outil de lecture de fichiers :

```typescript
// src/tools/text-editor.ts

export class ReadFileTool implements Tool {
  name = 'read_file';

  description = `Read the contents of a file at the specified path.
Returns the file content as a string. For large files, content may be truncated.
Supports text files, code files, and common formats like JSON, YAML, etc.`;

  inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path to the file to read'
      },
      startLine: {
        type: 'number',
        description: 'Optional: First line to read (1-indexed)'
      },
      endLine: {
        type: 'number',
        description: 'Optional: Last line to read (1-indexed)'
      },
      encoding: {
        type: 'string',
        enum: ['utf-8', 'utf-16', 'ascii', 'base64'],
        default: 'utf-8',
        description: 'File encoding'
      }
    },
    required: ['path']
  };

  requiresConfirmation = false;  // Lecture = safe
  timeout = 10_000;              // 10 secondes
  category = 'filesystem';

  async execute(args: {
    path: string;
    startLine?: number;
    endLine?: number;
    encoding?: BufferEncoding;
  }): Promise<ToolResult> {
    try {
      // 1️⃣ Valider le chemin (sécurité)
      const safePath = this.validatePath(args.path);

      // 2️⃣ Vérifier que le fichier existe
      const stats = await fs.stat(safePath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: `Path is not a file: ${args.path}`
        };
      }

      // 3️⃣ Vérifier la taille (éviter les fichiers énormes)
      const MAX_SIZE = 1_000_000;  // 1 MB
      if (stats.size > MAX_SIZE) {
        return {
          success: false,
          error: `File too large (${stats.size} bytes). Max: ${MAX_SIZE}`
        };
      }

      // 4️⃣ Lire le fichier
      let content = await fs.readFile(safePath, {
        encoding: args.encoding ?? 'utf-8'
      });

      // 5️⃣ Extraire les lignes demandées
      if (args.startLine || args.endLine) {
        const lines = content.split('\n');
        const start = (args.startLine ?? 1) - 1;
        const end = args.endLine ?? lines.length;
        content = lines.slice(start, end).join('\n');
      }

      // 6️⃣ Tronquer si trop long
      const MAX_OUTPUT = 50_000;
      let truncated = false;
      if (content.length > MAX_OUTPUT) {
        content = content.substring(0, MAX_OUTPUT);
        truncated = true;
      }

      return {
        success: true,
        output: content,
        metadata: {
          path: safePath,
          size: stats.size,
          lines: content.split('\n').length,
          truncated,
          encoding: args.encoding ?? 'utf-8'
        }
      };

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { success: false, error: `File not found: ${args.path}` };
      }
      return { success: false, error: `Failed: ${(error as Error).message}` };
    }
  }

  private validatePath(inputPath: string): string {
    const resolved = path.resolve(process.cwd(), inputPath);

    // 🔒 Empêcher la traversée de répertoire
    if (!resolved.startsWith(process.cwd())) {
      throw new Error('Path traversal detected');
    }

    // 🔒 Bloquer les fichiers sensibles
    const blocked = ['.env', '.git/config', 'id_rsa', '.ssh'];
    if (blocked.some(b => resolved.includes(b))) {
      throw new Error('Access to sensitive file blocked');
    }

    return resolved;
  }
}
```

---

## 10.2 🔄 Protocole de Tool-Calling

### 10.2.1 Le flow complet

Le tool-calling est un protocole standardisé entre le LLM et l'agent :

![Tool Calling Flow](images/tool-calling-flow.svg)

### 10.2.2 Format des messages

```typescript
// Format OpenAI/Grok pour les tool calls

// 1. Réponse du LLM avec tool call
interface AssistantMessage {
  role: 'assistant';
  content: null;  // Pas de texte quand il y a des tool calls
  tool_calls: ToolCall[];
}

interface ToolCall {
  id: string;                  // Identifiant unique du call
  type: 'function';
  function: {
    name: string;              // Nom de l'outil
    arguments: string;         // JSON stringifié des arguments
  };
}

// 2. Résultat retourné au LLM
interface ToolMessage {
  role: 'tool';
  tool_call_id: string;       // Référence au call
  content: string;             // Résultat (stringifié)
}
```

### 10.2.3 Parallel tool calls

Les modèles modernes peuvent demander **plusieurs outils en parallèle** dans une seule réponse :

```typescript
// Réponse LLM avec multiple tool calls
{
  "tool_calls": [
    {
      "id": "call_1",
      "name": "read_file",
      "arguments": { "path": "src/index.ts" }
    },
    {
      "id": "call_2",
      "name": "read_file",
      "arguments": { "path": "src/types.ts" }
    },
    {
      "id": "call_3",
      "name": "search",
      "arguments": { "query": "import.*types" }
    }
  ]
}

// L'agent peut exécuter en parallèle !
const results = await Promise.all(
  toolCalls.map(call => executor.execute(call))
);
```

![Parallel vs Sequential](images/parallel-vs-sequential.svg)

---

## 10.3 📦 Les 41 Outils de Grok-CLI

### 10.3.1 Catalogue complet

Grok-CLI inclut 41 outils organisés par catégorie :

![Catalogue d'outils Grok-CLI](images/tool-catalog.svg)

| Catégorie | Nombre | Exemples |
|-----------|:------:|----------|
| 📁 Fichiers | 12 | read, write, edit, search |
| ⚡ Shell | 4 | bash, background_task |
| 🔀 Git | 5 | status, diff, commit |
| 🔍 Recherche | 4 | search_code, find_symbol |
| 🎬 Médias | 5 | screenshot, transcribe |
| 📄 Documents | 5 | pdf_extract, excel |
| 🖥️ Système | 6 | memory, http, spawn |

### 10.3.2 Outils critiques

**1. 🔥 bash — Exécution de commandes shell**

L'outil le plus puissant et le plus dangereux :

```typescript
export class BashTool implements Tool {
  name = 'bash';

  description = `Execute a shell command and return the output.
Use for: running builds, tests, git commands, package management.
⚠️ Dangerous operations require confirmation.`;

  inputSchema = {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' },
      timeout: { type: 'number', default: 30000, description: 'Timeout (ms)' },
      cwd: { type: 'string', description: 'Working directory' }
    },
    required: ['command']
  };

  requiresConfirmation = true;  // ⚠️ Toujours demander !
  timeout = 60_000;

  async execute(args: { command: string; timeout?: number; cwd?: string }) {
    // 🔒 Bloquer les commandes dangereuses
    if (this.isDangerous(args.command)) {
      return {
        success: false,
        error: '🚫 Command blocked: potentially destructive'
      };
    }

    try {
      const { stdout, stderr } = await execAsync(args.command, {
        timeout: args.timeout ?? 30_000,
        cwd: args.cwd ?? process.cwd(),
        maxBuffer: 10 * 1024 * 1024  // 10 MB
      });

      return {
        success: true,
        output: stdout + (stderr ? `\n[stderr]\n${stderr}` : ''),
        metadata: { exitCode: 0 }
      };

    } catch (error) {
      const e = error as ExecException;
      return {
        success: false,
        output: e.stdout,
        error: e.stderr || e.message,
        metadata: { exitCode: e.code }
      };
    }
  }

  private isDangerous(command: string): boolean {
    const dangerous = [
      /rm\s+-rf\s+[\/~]/,       // rm -rf /
      /mkfs/,                    // Format disks
      /dd\s+.*of=\/dev/,         // Write to devices
      /chmod\s+777\s+\//,        // Chmod root
      /:(){ :|:& };:/            // Fork bomb
    ];
    return dangerous.some(p => p.test(command));
  }
}
```

**2. ✏️ edit_file — Modification chirurgicale**

```typescript
export class EditFileTool implements Tool {
  name = 'edit_file';

  description = `Edit a file by replacing specific text.
Provide the EXACT text to find and its replacement.
Use for: bug fixes, code updates, configuration changes.`;

  inputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to file' },
      old_text: { type: 'string', description: 'Exact text to find' },
      new_text: { type: 'string', description: 'Replacement text' },
      occurrence: { type: 'number', default: 1, description: '0 = all' }
    },
    required: ['path', 'old_text', 'new_text']
  };

  requiresConfirmation = true;

  async execute(args: {
    path: string;
    old_text: string;
    new_text: string;
    occurrence?: number;
  }) {
    const safePath = this.validatePath(args.path);
    const content = await fs.readFile(safePath, 'utf-8');

    // ❌ Vérifier que le texte existe
    if (!content.includes(args.old_text)) {
      return {
        success: false,
        error: `Text not found: "${args.old_text.substring(0, 50)}..."`
      };
    }

    // Compter les occurrences
    const count = (content.match(new RegExp(
      escapeRegex(args.old_text), 'g'
    )) || []).length;

    // Remplacer
    let newContent: string;
    if (args.occurrence === 0) {
      // Toutes les occurrences
      newContent = content.split(args.old_text).join(args.new_text);
    } else {
      // Occurrence spécifique
      let i = 0;
      newContent = content.replace(
        new RegExp(escapeRegex(args.old_text), 'g'),
        match => (++i === args.occurrence ? args.new_text : match)
      );
    }

    await fs.writeFile(safePath, newContent, 'utf-8');

    return {
      success: true,
      output: `✅ Replaced ${args.occurrence === 0 ? count : 1} occurrence(s)`,
      metadata: { occurrencesFound: count }
    };
  }
}
```

**3. 🔄 multi_edit — Éditions atomiques**

Pour les refactorings qui touchent plusieurs fichiers :

```typescript
export class MultiEditTool implements Tool {
  name = 'multi_edit';

  description = `Apply multiple edits atomically across files.
All edits succeed together or all fail together (rollback).
Use for: renaming, refactoring across the codebase.`;

  inputSchema = {
    type: 'object',
    properties: {
      edits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            old_text: { type: 'string' },
            new_text: { type: 'string' }
          },
          required: ['path', 'old_text', 'new_text']
        }
      }
    },
    required: ['edits']
  };

  async execute(args: { edits: Edit[] }) {
    // ═══════════════════════════════════════════════════════════
    // PHASE 1 : Validation (avant de toucher quoi que ce soit)
    // ═══════════════════════════════════════════════════════════
    const backups: Map<string, string> = new Map();

    for (const edit of args.edits) {
      const safePath = this.validatePath(edit.path);
      const content = await fs.readFile(safePath, 'utf-8');

      if (!content.includes(edit.old_text)) {
        return {
          success: false,
          error: `❌ Validation failed: text not found in ${edit.path}`
        };
      }
      backups.set(safePath, content);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 2 : Application
    // ═══════════════════════════════════════════════════════════
    const applied: string[] = [];

    try {
      for (const edit of args.edits) {
        const safePath = this.validatePath(edit.path);
        const content = backups.get(safePath)!;
        const newContent = content.replace(edit.old_text, edit.new_text);

        await fs.writeFile(safePath, newContent, 'utf-8');
        applied.push(safePath);
      }

      const uniqueFiles = [...new Set(applied)];
      return {
        success: true,
        output: `✅ Applied ${args.edits.length} edits to ${uniqueFiles.length} files`,
        metadata: { filesModified: uniqueFiles }
      };

    } catch (error) {
      // ═══════════════════════════════════════════════════════════
      // PHASE 3 : Rollback en cas d'erreur
      // ═══════════════════════════════════════════════════════════
      for (const [path, content] of backups) {
        if (applied.includes(path)) {
          await fs.writeFile(path, content, 'utf-8');
        }
      }

      return {
        success: false,
        error: `❌ Failed, all changes rolled back: ${(error as Error).message}`
      };
    }
  }
}
```

---

## 10.4 🔒 Validation et Sécurité

### 10.4.1 Validation des arguments

Les arguments viennent du LLM — ils peuvent être malformés ou dangereux.

```typescript
// src/tools/validator.ts
import Ajv from 'ajv';

export class ToolValidator {
  private ajv = new Ajv({ allErrors: true });

  validate(tool: Tool, args: unknown): ValidationResult {
    const validate = this.ajv.compile(tool.inputSchema);
    const valid = validate(args);

    if (!valid) {
      return {
        valid: false,
        errors: validate.errors?.map(e => ({
          path: e.instancePath,
          message: e.message,
          keyword: e.keyword
        }))
      };
    }

    return { valid: true };
  }
}
```

### 10.4.2 Système de permissions

![Systeme de permissions](images/permission-system.svg)

```typescript
// src/tools/permissions.ts

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  NETWORK = 'network',
  SYSTEM = 'system'
}

const TOOL_PERMISSIONS: Record<string, Permission[]> = {
  'read_file': [Permission.READ],
  'write_file': [Permission.WRITE],
  'edit_file': [Permission.READ, Permission.WRITE],
  'bash': [Permission.EXECUTE, Permission.READ, Permission.WRITE],
  'http_request': [Permission.NETWORK],
  'search_web': [Permission.NETWORK]
};

export class PermissionManager {
  private granted: Set<Permission>;

  constructor(mode: 'read-only' | 'auto' | 'full-access') {
    switch (mode) {
      case 'read-only':
        this.granted = new Set([Permission.READ]);
        break;
      case 'auto':
        this.granted = new Set([Permission.READ, Permission.WRITE, Permission.EXECUTE]);
        break;
      case 'full-access':
        this.granted = new Set(Object.values(Permission));
        break;
    }
  }

  canExecute(toolName: string): boolean {
    const required = TOOL_PERMISSIONS[toolName] ?? [];
    return required.every(p => this.granted.has(p));
  }

  getMissing(toolName: string): Permission[] {
    const required = TOOL_PERMISSIONS[toolName] ?? [];
    return required.filter(p => !this.granted.has(p));
  }
}
```

### 10.4.3 Confirmation utilisateur

```typescript
// src/tools/confirmation.ts

export class ConfirmationService {
  // Outils safe = pas besoin de confirmation
  private safePatterns: RegExp[] = [
    /^read_file$/,
    /^list_directory$/,
    /^search/,
    /^find_/
  ];

  async confirm(
    toolCall: ToolCall,
    mode: 'auto' | 'always' | 'never'
  ): Promise<ConfirmationResult> {
    // Mode never = YOLO
    if (mode === 'never') {
      return { approved: true };
    }

    // Mode auto = approuver les outils safe
    if (mode === 'auto') {
      if (this.safePatterns.some(p => p.test(toolCall.name))) {
        return { approved: true };
      }
    }

    // Demander à l'utilisateur
    console.log(`\n🔧 Tool: ${toolCall.name}`);
    console.log(`📝 Args: ${this.formatArgs(toolCall.arguments)}`);

    const answer = await this.prompt('Execute? [y/N/e(dit)] ');

    switch (answer.toLowerCase()) {
      case 'y':
      case 'yes':
        return { approved: true };
      case 'e':
      case 'edit':
        const edited = await this.editArguments(toolCall);
        return { approved: true, modifiedArgs: edited };
      default:
        return { approved: false, reason: 'User rejected' };
    }
  }
}
```

---

## 10.5 ⚙️ Orchestration des Outils

### 10.5.1 Tool Executor

Le Tool Executor coordonne tout le processus :

```typescript
// src/tools/executor.ts

export class ToolExecutor {
  private tools: Map<string, Tool>;
  private validator: ToolValidator;
  private permissions: PermissionManager;
  private confirmation: ConfirmationService;

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const startTime = Date.now();

    // 1️⃣ Trouver l'outil
    const tool = this.tools.get(toolCall.name);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${toolCall.name}` };
    }

    // 2️⃣ Parser les arguments
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.arguments);
    } catch {
      return { success: false, error: 'Invalid JSON arguments' };
    }

    // 3️⃣ Valider
    const validation = this.validator.validate(tool, args);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`
      };
    }

    // 4️⃣ Vérifier les permissions
    if (!this.permissions.canExecute(toolCall.name)) {
      const missing = this.permissions.getMissing(toolCall.name);
      return {
        success: false,
        error: `Permission denied. Missing: ${missing.join(', ')}`
      };
    }

    // 5️⃣ Demander confirmation si nécessaire
    if (tool.requiresConfirmation) {
      const conf = await this.confirmation.confirm(toolCall, this.mode);
      if (!conf.approved) {
        return { success: false, error: `Cancelled: ${conf.reason}` };
      }
      if (conf.modifiedArgs) {
        args = conf.modifiedArgs;
      }
    }

    // 6️⃣ Exécuter avec timeout
    try {
      const result = await withTimeout(
        tool.execute(args),
        tool.timeout ?? 30_000
      );

      // 7️⃣ Logger pour audit
      await this.auditLog({
        tool: toolCall.name,
        args,
        result,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      if (error instanceof TimeoutError) {
        return {
          success: false,
          error: `Timeout after ${tool.timeout}ms`
        };
      }
      return { success: false, error: (error as Error).message };
    }
  }
}
```

### 10.5.2 Exécution parallèle intelligente

```typescript
// src/tools/parallel-executor.ts

export class ParallelToolExecutor {
  private executor: ToolExecutor;
  private maxConcurrency = 5;

  async executeParallel(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    // Grouper par dépendance
    const groups = this.groupByDependency(toolCalls);
    const results: ToolResult[] = [];

    // Exécuter groupe par groupe
    for (const group of groups) {
      const groupResults = await this.executeGroup(group);
      results.push(...groupResults);

      // Arrêter si erreur critique
      if (groupResults.some(r => !r.success && this.isCritical(r))) {
        break;
      }
    }

    return results;
  }

  /**
   * Groupe les calls indépendants ensemble.
   * Ex: read_file(a) et read_file(b) peuvent être parallèles.
   * Mais write_file(a) et read_file(a) doivent être séquentiels.
   */
  private groupByDependency(calls: ToolCall[]): ToolCall[][] {
    const groups: ToolCall[][] = [];
    const seenPaths = new Set<string>();
    let currentGroup: ToolCall[] = [];

    for (const call of calls) {
      const paths = this.extractPaths(call);
      const hasConflict = paths.some(p => seenPaths.has(p));

      if (hasConflict) {
        if (currentGroup.length > 0) groups.push(currentGroup);
        currentGroup = [call];
        seenPaths.clear();
        paths.forEach(p => seenPaths.add(p));
      } else {
        currentGroup.push(call);
        paths.forEach(p => seenPaths.add(p));
      }
    }

    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
  }
}
```

---

## 10.6 🚨 Gestion des Erreurs

### 10.6.1 Types d'erreurs

```typescript
// src/tools/errors.ts

export enum ErrorCode {
  // Validation
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  MISSING_REQUIRED = 'MISSING_REQUIRED',

  // Permission
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  USER_REJECTED = 'USER_REJECTED',

  // Exécution
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  COMMAND_FAILED = 'COMMAND_FAILED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Système
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  DISK_FULL = 'DISK_FULL'
}

export class ToolError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public recoverable: boolean = false,
    public suggestion?: string
  ) {
    super(message);
  }
}
```

![Matrice d'erreurs](images/error-matrix.svg)

### 10.6.2 Récupération automatique

```typescript
// src/tools/recovery.ts

export class ToolRecovery {
  async attemptRecovery(
    error: ToolError,
    toolCall: ToolCall
  ): Promise<RecoveryAction> {
    switch (error.code) {

      case ErrorCode.FILE_NOT_FOUND:
        // Suggérer des fichiers similaires
        const similar = await this.findSimilarFiles(toolCall.arguments.path);
        if (similar.length > 0) {
          return {
            action: 'suggest_alternative',
            alternatives: similar,
            message: `File not found. Did you mean: ${similar[0]}?`
          };
        }
        break;

      case ErrorCode.TIMEOUT:
        // Réessayer avec timeout plus long
        return {
          action: 'retry',
          modifiedArgs: {
            ...toolCall.arguments,
            timeout: (toolCall.arguments.timeout ?? 30000) * 2
          },
          message: 'Retrying with longer timeout'
        };

      case ErrorCode.NETWORK_ERROR:
        // Retry avec backoff exponentiel
        return {
          action: 'retry',
          delayMs: 1000 * Math.pow(2, this.retryCount),
          message: 'Retrying after network error'
        };

      case ErrorCode.PERMISSION_DENIED:
        return {
          action: 'request_permission',
          requiredPermissions: error.suggestion,
          message: 'Requesting additional permissions'
        };
    }

    return { action: 'fail', message: error.message };
  }
}
```

---

## 10.7 📝 Bonnes Pratiques

### 10.7.1 Design des outils

| ✅ Faire | ❌ Ne pas faire |
|----------|-----------------|
| Noms clairs et descriptifs | Noms cryptiques (`do_thing`) |
| Une responsabilité par outil | Outils fourre-tout |
| Descriptions détaillées | Descriptions vagues |
| Valeurs par défaut sensées | Exiger tous les paramètres |
| Messages d'erreur utiles | Erreurs génériques |

### 10.7.2 Sécurité

| ✅ Faire | ❌ Ne pas faire |
|----------|-----------------|
| Valider tous les inputs | Faire confiance aux arguments |
| Limiter les permissions | Donner accès à tout |
| Confirmer les actions destructives | Auto-approuver les suppressions |
| Logger les exécutions | Exécuter silencieusement |
| Sandbox si possible | Exécuter dans l'env principal |

### 10.7.3 Performance

| ✅ Faire | ❌ Ne pas faire |
|----------|-----------------|
| Timeouts appropriés | Attendre indéfiniment |
| Exécution parallèle quand possible | Tout séquentiel |
| Tronquer les outputs longs | Retourner des MB de données |
| Cache les résultats répétés | Recalculer à chaque fois |

---

## ⚠️ 10.8 Limites et Risques

### 🚧 Limites Techniques

| Limite | Description | Mitigation |
|--------|-------------|------------|
| **Hallucination d'arguments** | Le LLM peut inventer des chemins/paramètres | Validation stricte + suggestions |
| **Combinaisons invalides** | Appels d'outils dans le mauvais ordre | Analyse de dépendances |
| **Latence cumulée** | 10 outils × 100ms = 1s de latence | Parallélisation intelligente |
| **Limites des schémas JSON** | Pas de validation sémantique profonde | Validators custom |
| **Conflit d'outils** | Deux outils modifiant le même fichier | Transactions atomiques |

### ⚠️ Risques Opérationnels

| Risque | Probabilité | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| **Exécution de code malveillant** | Faible | Critique | Sandbox, liste blanche |
| **Suppression accidentelle** | Moyenne | Élevé | Confirmation obligatoire, backups |
| **Injection de commandes** | Moyenne | Critique | Échappement strict, validation regex |
| **Déni de service (boucle infinie)** | Faible | Moyen | Timeouts, max rounds |
| **Fuite de données via outils** | Faible | Critique | Redaction, audit logging |

### 📚 Patterns Anti-Sécurité à Éviter

```typescript
// ❌ DANGEREUX : Exécution directe sans validation
await bash(userInput);

// ❌ DANGEREUX : Concaténation de commandes
await bash(`cat ${userPath} | grep ${userPattern}`);

// ✅ SÉCURISÉ : Validation et échappement
const safePath = validatePath(userPath);
const safePattern = escapeRegex(userPattern);
await bash(['cat', safePath], { pipe: ['grep', safePattern] });
```

### 💡 Recommandations

> ⚠️ **Attention** : Chaque outil est une surface d'attaque potentielle. Appliquez le principe du moindre privilège : un outil ne devrait avoir accès qu'aux ressources strictement nécessaires.

---

## ⚠️ 10.8 Limites et Risques

### 🚧 Limites Techniques

| Limite | Description | Impact |
|--------|-------------|--------|
| **Hallucination de paramètres** | LLM peut inventer des valeurs pour les arguments | Erreurs d'exécution, comportement inattendu |
| **Mauvais choix d'outil** | LLM peut sélectionner l'outil incorrect | Temps perdu, résultats erronés |
| **Overhead de validation** | Chaque call = parsing + validation + confirmation | Latence accrue |
| **Limites du schéma JSON** | Certaines contraintes complexes inexprimables | Validation incomplète |
| **Dépendance au modèle** | Qualité du tool use varie selon le LLM | Inconsistance entre modèles |

### ⚡ Risques de Sécurité

| Risque | Probabilité | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| **Injection de commandes** | Moyenne | Critique | Échapper tous les paramètres shell |
| **Path traversal** | Moyenne | Élevé | Valider et normaliser les chemins |
| **Exfiltration de données** | Faible | Critique | Blocklist de destinations réseau |
| **Exécution de code arbitraire** | Faible | Critique | Sandbox, whitelist de commandes |
| **Denial of service** | Moyenne | Moyen | Timeouts, limites de ressources |

### 📊 Quand Être Extra-Vigilant

| Situation | Risque | Action |
|-----------|--------|--------|
| Arguments venant de l'utilisateur | Injection | Double validation |
| Fichiers hors du projet | Path traversal | Whitelist de répertoires |
| Commandes avec pipes | Injection shell | Éviter les shells, utiliser spawn |
| Accès réseau | Exfiltration | Proxy/firewall |

> 📌 **À Retenir** : Les outils sont la **surface d'attaque** la plus large d'un agent. Chaque paramètre venant du LLM doit être traité comme potentiellement malveillant. Appliquez le principe du **moindre privilège** : un outil ne devrait avoir accès qu'aux ressources strictement nécessaires pour sa fonction.

> 💡 **Astuce Pratique** : Créez un outil `safe_bash` qui n'autorise qu'une whitelist de commandes prédéfinies. Réservez `bash` brut aux utilisateurs qui ont explicitement activé le mode YOLO.

---

## 📊 Tableau Synthétique — Chapitre 10

| Aspect | Détails |
|--------|---------|
| **Titre** | Tool-Use et Exécution |
| **Interface Tool** | name, description, schema JSON, execute() |
| **41 Outils** | Fichiers, shell, git, recherche, médias, docs |
| **Flow** | LLM → tool_call → validate → confirm → execute → result |
| **Validation** | JSON Schema + règles métier + permissions |
| **Sécurité** | Confirmation, sandbox, audit log |
| **Parallélisme** | Groupement par dépendance, exécution concurrente |
| **Recovery** | Suggestions, retry, alternatives |

---

## 📝 Points Clés

| Concept | Point clé |
|---------|-----------|
| 🔩 **Interface Tool** | name, description, schema, execute |
| 🔄 **Flow** | LLM → tool_call → validate → execute → result → LLM |
| 📦 **41 outils** | Fichiers, shell, git, recherche, médias, docs |
| 🔒 **Sécurité** | Validation + permissions + confirmation |
| ⚡ **Parallélisme** | Analyse dépendances + exécution concurrente |
| 🚨 **Recovery** | Suggestions, retry, alternatives |

---

## 🏋️ Exercices

### Exercice 1 : Créer un outil
**Objectif** : Implémenter `word_count`

```typescript
// Créez un outil qui compte les mots dans un fichier
interface WordCountArgs {
  path: string;
  countLines?: boolean;
  countChars?: boolean;
}
```

### Exercice 2 : Sécurité
**Objectif** : Lister 10 commandes bash dangereuses

| Commande | Danger | Pattern regex |
|----------|--------|---------------|
| `rm -rf /` | Supprime tout | |
| ... | | |

### Exercice 3 : Benchmark parallélisme
**Objectif** : Mesurer le speedup

| Scénario | Séquentiel | Parallèle | Speedup |
|----------|:----------:|:---------:|:-------:|
| 5x read_file | | | |
| 10x read_file | | | |
| Mix read/write | | | |

### Exercice 4 : Recovery
**Objectif** : Implémenter une stratégie pour les erreurs réseau

```typescript
class NetworkRecovery {
  // Implémenter retry avec backoff exponentiel
}
```

---

## 📚 Références

| Type | Référence |
|------|-----------|
| 📖 Docs | OpenAI. "Function Calling Documentation" |
| 📖 Docs | Anthropic. "Tool Use with Claude" |
| 💻 Code | Grok-CLI : `src/tools/` |

---

## 🌅 Épilogue

*Le lendemain matin. Lina teste son agent avec ses nouveaux outils.*

**Lina** : "Crée un fichier test.txt avec le contenu 'Hello World'"

*L'agent réfléchit une seconde, puis...*

**Agent** : *[Calling write_file with path="test.txt", content="Hello World"]*

*Une demande de confirmation apparaît.*

**Lina** *(tape 'y')* : "Yes !"

**Agent** : "✅ Fichier test.txt créé avec succès."

**Lina** *(vérifiant)* : "Il existe vraiment ! Mon agent a des mains maintenant !"

*Elle passe l'heure suivante à explorer. L'agent lit des fichiers, exécute des commandes, recherche dans le code. Puis une idée lui vient.*

**Lina** : "Marc, et si quelqu'un veut ajouter des outils qu'on n'a pas prévus ?"

**Marc** : "Genre ?"

**Lina** : "Genre... notre API interne. Ou Jira. Ou le monitoring de prod. Chaque équipe a ses propres besoins."

**Marc** *(souriant)* : "Tu viens de toucher au cœur du problème. 41 outils, c'est bien. Mais on ne peut pas prévoir tous les besoins de tous les utilisateurs."

*Il ouvre son laptop.*

**Marc** : "Anthropic a justement publié quelque chose là-dessus. Le **Model Context Protocol**. Un standard pour que n'importe qui puisse créer des outils et les brancher à n'importe quel agent."

**Lina** : "Un système de plugins ?"

**Marc** : "Mieux. Un **protocole universel**. Tu codes un serveur MCP une fois, et il marche avec Claude, avec GPT, avec n'importe quel agent compatible."

*Lina sent l'excitation monter.*

**Lina** : "Montre-moi."

---

**À suivre** : *Chapitre 11 — Plugins et MCP*

*Comment transformer un agent fermé en plateforme ouverte ? Le Model Context Protocol change la donne — et soulève des questions de sécurité que Lina n'avait pas anticipées.*

---

<div align="center">

**← [Chapitre 9 : Context Compression](09-context-compression.md)** | **[Sommaire](README.md)** | **[Chapitre 11 : Plugins & MCP](11-plugins-mcp.md) →**

</div>
