# Chapitre 11 : MCP — L'Architecture de Plugins Universelle

---

## 1. Le Problème

41 outils intégrés. 17 demandes d'intégration en attente. Jira, API interne, monitoring, Slack, Confluence. Chaque nouvel outil = modifier le code de l'agent, rebuild, redéployer.

**L'erreur classique** : Coder tous les outils en dur. Monolithique, non-extensible, maintenance cauchemardesque.

```typescript
// ❌ Agent monolithique
class Agent {
  tools = [
    readFile, writeFile, bash,      // 41 outils
    gitStatus, gitCommit,            // tous hardcodés
    jiraCreate, slackSend,           // impossible à étendre
    // ... et chaque nouveau besoin = modifier ce fichier
  ];
}

// ✅ Agent extensible via MCP
class Agent {
  async loadTools(): Promise<Tool[]> {
    const builtin = getBuiltinTools();
    const mcp = await mcpManager.getTools();  // Outils externes à la demande
    return [...builtin, ...mcp];
  }
}
```

---

## 2. La Solution Rapide : Client MCP en 40 Lignes

```typescript
import { spawn } from 'child_process';

class MCPClient {
  private process: ChildProcess;
  private pending = new Map<string, (r: any) => void>();

  async connect(command: string, args: string[]): Promise<void> {
    this.process = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let buffer = '';
    this.process.stdout!.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines.filter(l => l.trim())) {
        const msg = JSON.parse(line);
        this.pending.get(msg.id)?.(msg);
        this.pending.delete(msg.id);
      }
    });

    // Handshake
    await this.request('initialize', {
      protocolVersion: '0.1.0',
      clientInfo: { name: 'my-agent', version: '1.0.0' },
      capabilities: { tools: {} }
    });
  }

  async listTools(): Promise<MCPTool[]> {
    const { tools } = await this.request('tools/list', {});
    return tools;
  }

  async callTool(name: string, args: unknown): Promise<any> {
    return this.request('tools/call', { name, arguments: args });
  }

  private request(method: string, params: unknown): Promise<any> {
    return new Promise((resolve) => {
      const id = Date.now().toString();
      this.pending.set(id, resolve);
      this.process.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }
}

// Utilisation
const client = new MCPClient();
await client.connect('npx', ['-y', '@anthropic/mcp-server-filesystem']);
const tools = await client.listTools();  // read_file, write_file, list_dir...
```

---

## 3. Deep Dive : Le Protocole MCP

### 3.1 Architecture

MCP (Model Context Protocol) est le standard d'Anthropic pour connecter des outils aux LLMs. Communication JSON-RPC 2.0 via stdio ou HTTP.

| Composant | Rôle | Exemples |
|-----------|------|----------|
| **Client** | L'agent qui appelle | Claude Code, votre agent |
| **Server** | Expose les outils | filesystem, github, postgres |
| **Transport** | Canal de communication | stdio (local), HTTP (distant) |

### 3.2 Les 4 Primitives MCP

```typescript
// 1. Tools - Actions exécutables
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

// 2. Resources - Données accessibles
interface MCPResource {
  uri: string;           // "config://app/settings"
  name: string;
  mimeType: string;
}

// 3. Prompts - Templates réutilisables
interface MCPPrompt {
  name: string;
  arguments: { name: string; required: boolean }[];
}

// 4. Sampling - Génération LLM (server → client)
interface MCPSamplingRequest {
  messages: Message[];
  maxTokens: number;
}
```

### 3.3 Configuration Multi-Serveurs

```json
// .grok/mcp.json
{
  "servers": [
    {
      "id": "filesystem",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem"],
      "enabled": true
    },
    {
      "id": "github",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    {
      "id": "custom-api",
      "url": "http://localhost:3001",
      "transport": "http"
    }
  ]
}
```

### 3.4 MCPManager : Agrégation des Outils

```typescript
class MCPManager {
  private clients = new Map<string, MCPClient>();
  private tools = new Map<string, { client: MCPClient; tool: MCPTool }>();

  async loadConfig(configPath: string): Promise<void> {
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

    for (const server of config.servers.filter(s => s.enabled !== false)) {
      const client = new MCPClient();

      if (server.url) {
        await client.connectHTTP(server.url);
      } else {
        const env = this.resolveEnv(server.env || {});
        await client.connect(server.command, server.args || [], { env });
      }

      this.clients.set(server.id, client);

      // Enregistrer les outils avec namespace
      for (const tool of await client.listTools()) {
        this.tools.set(`mcp:${server.id}:${tool.name}`, { client, tool });
      }
    }
  }

  // Retourner tous les outils MCP comme des Tool standards
  getTools(): Tool[] {
    return Array.from(this.tools.entries()).map(([name, { tool }]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: (args) => this.executeTool(name, args)
    }));
  }

  private async executeTool(name: string, args: unknown): Promise<ToolResult> {
    const { client, tool } = this.tools.get(name)!;
    const result = await client.callTool(tool.name, args);

    return result.isError
      ? { success: false, error: result.content[0]?.text }
      : { success: true, output: result.content.map(c => c.text).join('\n') };
  }
}
```

---

## 4. Edge Cases et Pièges

### Piège 1 : Serveur MCP qui crash silencieusement

```typescript
// ❌ Pas de gestion d'erreur
const client = new MCPClient();
await client.connect('my-server', []);
// Si le serveur crash, aucune notification

// ✅ Health check et reconnexion
class ResilientMCPClient {
  private healthCheckInterval: NodeJS.Timer;

  async connect(command: string, args: string[]): Promise<void> {
    await this.doConnect(command, args);

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.request('ping', {}, { timeout: 5000 });
      } catch {
        console.warn(`[MCP] Server ${command} unresponsive, reconnecting...`);
        await this.doConnect(command, args);
      }
    }, 30_000);
  }
}
```

**Contournement** : Health check toutes les 30s + reconnexion automatique.

### Piège 2 : Timeout sur outils lents

```typescript
// ❌ Timeout par défaut = request bloquée indéfiniment
const result = await client.callTool('query_database', { sql: 'SELECT * FROM logs' });

// ✅ Timeout explicite par outil
async callTool(name: string, args: unknown, timeout = 30_000): Promise<any> {
  return Promise.race([
    this.request('tools/call', { name, arguments: args }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tool ${name} timeout after ${timeout}ms`)), timeout)
    )
  ]);
}
```

**Contournement** : Timeout de 30s par défaut, configurable par outil.

### Piège 3 : Collision de noms d'outils

```typescript
// ❌ Deux serveurs exposent "read_file"
// filesystem:read_file et custom:read_file → conflit

// ✅ Namespace obligatoire
const fullName = `mcp:${serverId}:${tool.name}`;
// → "mcp:filesystem:read_file" et "mcp:custom:read_file"
```

**Contournement** : Toujours préfixer avec `mcp:{serverId}:`.

---

## 5. Optimisation : Créer un Serveur MCP Custom

Quand vous avez besoin d'exposer une API interne :

```typescript
// my-mcp-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'internal-api', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// Déclarer les outils
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'query_users',
      description: 'Query users from internal database',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          department: { type: 'string' }
        }
      }
    }
  ]
}));

// Implémenter
server.setRequestHandler('tools/call', async ({ params }) => {
  if (params.name === 'query_users') {
    const users = await db.query('SELECT * FROM users WHERE ...', params.arguments);
    return { content: [{ type: 'text', text: JSON.stringify(users) }] };
  }
  return { isError: true, content: [{ type: 'text', text: 'Unknown tool' }] };
});

// Exposer des ressources
server.setRequestHandler('resources/list', async () => ({
  resources: [
    { uri: 'config://api/endpoints', name: 'API Endpoints', mimeType: 'application/json' }
  ]
}));

// Lancer
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Économie** : Un serveur MCP custom remplace des semaines de développement d'intégration ad-hoc.

---

## 6. Sécurité : Sandboxing des Plugins

| Niveau | Permissions | Exemple |
|--------|-------------|---------|
| **Safe** | Aucun accès système | read_memory, format_json |
| **Moderate** | Réseau externe uniquement | fetch_url, query_api |
| **Dangerous** | Filesystem, shell | write_file, bash |

```typescript
class PluginSandbox {
  constructor(private permissions: string[]) {}

  buildSandbox(): object {
    const sandbox: any = {
      console: { log: (...args) => console.log('[Plugin]', ...args) }
    };

    if (this.permissions.includes('network')) {
      sandbox.fetch = this.sandboxedFetch.bind(this);
    }

    if (this.permissions.includes('filesystem')) {
      sandbox.fs = this.sandboxedFs();
    }

    return sandbox;
  }

  private sandboxedFetch(url: string): Promise<Response> {
    const blocked = ['localhost', '127.0.0.1', '::1'];
    if (blocked.some(b => new URL(url).hostname.includes(b))) {
      throw new Error('Access to local network blocked');
    }
    return fetch(url);
  }

  private sandboxedFs() {
    const allowedDir = path.join(os.homedir(), '.grok/plugin-data');
    return {
      readFile: async (p: string) => {
        const resolved = path.resolve(allowedDir, p);
        if (!resolved.startsWith(allowedDir)) throw new Error('Path escape blocked');
        return fs.readFile(resolved, 'utf-8');
      }
    };
  }
}
```

---

## Tableau Récapitulatif

| Aspect | Valeur |
|--------|--------|
| **Protocole** | JSON-RPC 2.0 |
| **Transports** | stdio (local), HTTP (distant) |
| **Primitives** | Tools, Resources, Prompts, Sampling |
| **Namespace** | `mcp:{serverId}:{toolName}` |
| **Timeout recommandé** | 30s par défaut |
| **Health check** | Toutes les 30s |

---

## 7. Skills : Capacités Auto-Activées

Les Skills sont des modules qui s'activent automatiquement selon le contexte. Contrairement aux plugins MCP (explicites), les skills se déclenchent sur des patterns.

```typescript
// src/skills/skill-manager.ts

interface Skill {
  id: string;
  name: string;
  triggers: SkillTrigger[];
  tools: string[];
  systemPromptAddition?: string;
}

interface SkillTrigger {
  type: 'file_extension' | 'keyword' | 'tool_result';
  pattern: string | RegExp;
}

const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'typescript',
    name: 'TypeScript Expert',
    triggers: [
      { type: 'file_extension', pattern: '.ts' },
      { type: 'keyword', pattern: /typescript|tsc|tsconfig/i },
    ],
    tools: ['typescript_check', 'eslint'],
    systemPromptAddition: 'Utilise les types stricts TypeScript.',
  },
  {
    id: 'testing',
    name: 'Testing Expert',
    triggers: [
      { type: 'file_extension', pattern: '.test.ts' },
      { type: 'keyword', pattern: /jest|vitest|test|spec/i },
    ],
    tools: ['run_tests', 'coverage'],
  },
];

class SkillManager {
  detectSkills(context: { files?: string[]; userMessage: string }): Skill[] {
    return BUILTIN_SKILLS.filter(skill =>
      skill.triggers.some(trigger => this.matchesTrigger(trigger, context))
    );
  }
}
```

**Activation automatique** :

```
grok> Aide-moi à corriger les erreurs TypeScript

[Skill activé: TypeScript Expert]
Je vais analyser les erreurs avec tsc --noEmit...
```

---

## 8. Hooks : Interception des Événements

Les hooks permettent d'exécuter du code personnalisé à des points clés du cycle de vie de l'agent.

### Configuration (`.grok/hooks.json`)

```json
{
  "hooks": [
    {
      "event": "preToolUse",
      "command": "echo 'Tool: $TOOL_NAME' >> ~/.grok/audit.log"
    },
    {
      "event": "postToolUse",
      "match": { "tool": "bash" },
      "command": "node scripts/validate-command.js '$TOOL_ARGS'"
    },
    {
      "event": "sessionStart",
      "command": "git status --short"
    }
  ]
}
```

### Événements Disponibles

| Événement | Déclencheur | Variables |
|-----------|-------------|-----------|
| `sessionStart` | Début de session | `$SESSION_ID` |
| `sessionEnd` | Fin de session | `$SESSION_ID`, `$DURATION` |
| `preToolUse` | Avant exécution d'outil | `$TOOL_NAME`, `$TOOL_ARGS` |
| `postToolUse` | Après exécution d'outil | `$TOOL_NAME`, `$TOOL_RESULT` |
| `preMessage` | Avant envoi au LLM | `$MESSAGE` |
| `postMessage` | Après réponse LLM | `$RESPONSE` |

### Implémentation

```typescript
// src/hooks/hook-manager.ts

type HookEvent = 'sessionStart' | 'sessionEnd' | 'preToolUse' | 'postToolUse';

interface Hook {
  event: HookEvent;
  command: string;
  match?: { tool?: string; pattern?: string };
}

class HookManager {
  private hooks: Hook[] = [];

  async trigger(event: HookEvent, context: Record<string, string>): Promise<void> {
    const matching = this.hooks.filter(h => h.event === event);

    for (const hook of matching) {
      if (hook.match?.tool && context.TOOL_NAME !== hook.match.tool) continue;

      // Substituer les variables
      let cmd = hook.command;
      for (const [key, value] of Object.entries(context)) {
        cmd = cmd.replace(new RegExp(`\\$${key}`, 'g'), value);
      }

      await exec(cmd, { timeout: 5000 });
    }
  }
}

// Usage dans l'agent
await hookManager.trigger('preToolUse', {
  TOOL_NAME: 'bash',
  TOOL_ARGS: JSON.stringify(args)
});
```

**Cas d'usage** : Audit de sécurité, logging, validation, notifications Slack.

**Détails complets** : [Chapitre 18 - Productivité CLI](18-productivite-cli.md)

---

## Ce Qui Vient Ensuite

MCP permet d'étendre l'agent indéfiniment, mais 41% des requêtes sont identiques. Le **Chapitre 12** introduit les optimisations cognitives : cache sémantique, batching, et réduction des coûts de 68%.

---

[Chapitre 10](10-tool-use.md) | [Table des Matières](README.md) | [Chapitre 12](12-optimisations-cognitives.md)
