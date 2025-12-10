# Chapitre 10 : Tool-Use — Donner des Mains à Votre Agent

---

## 1. Le Problème

"Crée un fichier test.txt" → L'agent répond : "Voici comment créer un fichier : utilisez `touch test.txt`..."

**L'erreur classique** : L'agent explique au lieu d'agir. C'est un cerveau sans mains. Il peut penser mais pas interagir avec le monde.

```typescript
// ❌ Agent sans outils
const response = await llm.chat("Crée un fichier test.txt");
// "Pour créer un fichier, vous pouvez utiliser..."

// ✅ Agent avec outils
const response = await llm.chat({
  messages: [{ role: 'user', content: "Crée un fichier test.txt" }],
  tools: [writeFileTool, readFileTool, bashTool]
});
// Le LLM appelle write_file({ path: "test.txt", content: "" })
```

---

## 2. La Solution Rapide : Outil Minimal

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Exemple : outil de lecture de fichier
const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file at the specified path.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' }
    },
    required: ['path']
  },
  async execute({ path }) {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return { success: true, output: content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Exécution d'un tool call du LLM
async function handleToolCall(toolCall: ToolCall, tools: Tool[]): Promise<ToolResult> {
  const tool = tools.find(t => t.name === toolCall.name);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolCall.name}` };
  }

  // Valider les arguments
  const validation = validate(toolCall.args, tool.inputSchema);
  if (!validation.valid) {
    return { success: false, error: `Invalid args: ${validation.errors.join(', ')}` };
  }

  return await tool.execute(toolCall.args);
}
```

---

## 3. Deep Dive : Catalogue des 41 Outils

### 3.1 Catégories

| Catégorie | Outils | Exemples |
|-----------|:------:|----------|
| **Filesystem** | 8 | read_file, write_file, list_dir, search_files |
| **Shell** | 3 | bash, run_command, background_task |
| **Git** | 6 | git_status, git_diff, git_commit, git_log |
| **Search** | 5 | grep, find_symbol, semantic_search |
| **Web** | 4 | fetch_url, web_search, screenshot |
| **Agent** | 3 | spawn_agent, delegate_task, ask_user |
| **Memory** | 4 | save_memory, recall, checkpoint, undo |
| **Code** | 8 | parse_ast, refactor, run_tests, lint |

### 3.2 Les 5 Outils Essentiels

```typescript
// 1. read_file - Lecture sécurisée
const readFile: Tool = {
  name: 'read_file',
  description: 'Read file contents. Returns truncated output for large files.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      startLine: { type: 'number' },
      endLine: { type: 'number' }
    },
    required: ['path']
  },
  async execute({ path, startLine, endLine }) {
    // Validation de chemin (sécurité)
    if (!isPathAllowed(path)) {
      return { success: false, error: 'Path outside allowed directory' };
    }

    const content = await fs.readFile(path, 'utf-8');
    const lines = content.split('\n');

    if (startLine || endLine) {
      return { success: true, output: lines.slice(startLine - 1, endLine).join('\n') };
    }

    // Tronquer si trop long
    if (lines.length > 500) {
      return {
        success: true,
        output: lines.slice(0, 500).join('\n') + `\n\n... [${lines.length - 500} more lines]`
      };
    }

    return { success: true, output: content };
  }
};

// 2. write_file - Écriture avec confirmation
const writeFile: Tool = {
  name: 'write_file',
  description: 'Write content to a file. Creates parent directories if needed.',
  requiresConfirmation: true,  // ← Important !
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['path', 'content']
  },
  async execute({ path, content }) {
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, content, 'utf-8');
    return { success: true, output: `Wrote ${content.length} bytes to ${path}` };
  }
};

// 3. bash - Exécution shell contrôlée
const bash: Tool = {
  name: 'bash',
  description: 'Execute a shell command. Some commands require confirmation.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string' },
      timeout: { type: 'number', default: 30000 }
    },
    required: ['command']
  },
  async execute({ command, timeout = 30000 }) {
    // Vérifier la blacklist
    if (isBlacklisted(command)) {
      return { success: false, error: 'Command not allowed' };
    }

    const { stdout, stderr } = await exec(command, { timeout });
    return { success: true, output: stdout || stderr };
  }
};

// 4. search_files - Recherche dans le code
const searchFiles: Tool = {
  name: 'search_files',
  description: 'Search for files matching a pattern or containing text.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern (e.g., **/*.ts)' },
      content: { type: 'string', description: 'Text to search for' }
    }
  },
  async execute({ pattern, content }) {
    if (content) {
      const { stdout } = await exec(`grep -r "${content}" --include="${pattern || '*'}" .`);
      return { success: true, output: stdout };
    }
    const files = await glob(pattern || '**/*');
    return { success: true, output: files.join('\n') };
  }
};

// 5. ask_user - Demander clarification
const askUser: Tool = {
  name: 'ask_user',
  description: 'Ask the user a question when clarification is needed.',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string' }
    },
    required: ['question']
  },
  async execute({ question }) {
    const answer = await prompt(question);
    return { success: true, output: answer };
  }
};
```

---

## 4. Edge Cases et Pièges

### Piège 1 : Outil sans timeout

```typescript
// ❌ Commande qui peut bloquer indéfiniment
async execute({ command }) {
  return await exec(command);  // npm install peut prendre 10 minutes
}

// ✅ Toujours un timeout
async execute({ command }) {
  return await exec(command, {
    timeout: 5 * 60 * 1000,  // 5 minutes max
    killSignal: 'SIGKILL'
  });
}
```

**Contournement** : Timeout par défaut de 30s, extensible à 5min pour les longues opérations.

### Piège 2 : Description vague

```typescript
// ❌ Le LLM ne sait pas quand utiliser cet outil
const tool = {
  name: 'process',
  description: 'Process data',
  // ...
};

// ✅ Description explicite avec exemples
const tool = {
  name: 'format_json',
  description: `Format and validate a JSON string.
Use this when you need to:
- Pretty-print JSON for readability
- Validate JSON syntax
- Fix common JSON errors (trailing commas, single quotes)

Example: format_json({ input: '{"a":1}' }) → '{\n  "a": 1\n}'`,
  // ...
};
```

**Contournement** : Description de 50+ mots avec cas d'usage explicites.

### Piège 3 : Exécution parallèle sans contrôle

```typescript
// ❌ Le LLM demande 20 tool calls en parallèle
for (const call of toolCalls) {
  await execute(call);  // Séquentiel = lent
}

// ❌ Tout en parallèle = explosion de ressources
await Promise.all(toolCalls.map(execute));

// ✅ Parallélisme contrôlé
import pLimit from 'p-limit';
const limit = pLimit(5);  // Max 5 en parallèle
await Promise.all(toolCalls.map(call => limit(() => execute(call))));
```

**Contournement** : Limiter à 5 exécutions parallèles.

---

## 5. Optimisation : Validation JSON Schema

Validez les arguments AVANT l'exécution pour éviter les erreurs coûteuses :

```typescript
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

function validateToolArgs(tool: Tool, args: unknown): ValidationResult {
  const validate = ajv.compile(tool.inputSchema);
  const valid = validate(args);

  if (!valid) {
    return {
      valid: false,
      errors: validate.errors?.map(e => `${e.instancePath} ${e.message}`) || []
    };
  }

  return { valid: true };
}

// Utilisation
const result = validateToolArgs(readFileTool, { path: 123 });
// { valid: false, errors: ['/path must be string'] }
// → Erreur détectée AVANT l'appel filesystem
```

**Économie** : Évite 1 round-trip LLM pour chaque erreur de paramètre.

---

## Tableau Récapitulatif : Niveaux de Danger

| Niveau | Outils | Confirmation |
|--------|--------|:------------:|
| **Safe** | read_file, search, list_dir | Non |
| **Moderate** | write_file, edit_file | Oui |
| **Dangerous** | bash, delete, git push | Toujours |

---

## Ce Qui Vient Ensuite

Les outils sont prêts, mais comment les **étendre** sans modifier le code ? Le **Chapitre 11** introduit MCP (Model Context Protocol) : l'architecture de plugins qui permet d'ajouter des outils à la volée.

---

[⬅️ Chapitre 9](09-context-compression.md) | [📚 Table des Matières](README.md) | [➡️ Chapitre 11](11-plugins-mcp.md)
