# Chapitre 18 : Productivité CLI — Les Fonctionnalités qui Font la Différence

> *"Un bon outil disparaît dans le flux de travail. Un excellent outil l'amplifie."*

Ce chapitre couvre les fonctionnalités avancées inspirées des meilleurs CLI du marché (Claude Code, Aider, Gemini CLI, GitHub Copilot CLI). Ces features transforment Grok-CLI d'un simple chatbot en un véritable assistant de développement intégré.

---

## 1. Input Multimodal

### 1.1 Support des Images (Vision)

**Inspiration** : Codex CLI, Aider, Claude Code

Permettez aux utilisateurs d'inclure des images dans leurs prompts pour les modèles vision.

```typescript
// src/tools/image-input.ts

export interface ImageInput {
  type: 'base64' | 'url';
  data: string;
  mimeType: string;
  source: string;
}

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Parse image input (file path, URL, or base64)
 */
export async function parseImageInput(input: string): Promise<ImageInput> {
  // Data URL déjà encodée
  if (input.startsWith('data:image/')) {
    const mimeMatch = input.match(/data:(image\/[^;]+);/);
    return {
      type: 'base64',
      data: input,
      mimeType: mimeMatch ? mimeMatch[1] : 'image/png',
      source: 'base64',
    };
  }

  // URL distante
  if (isUrl(input)) {
    return loadImageFromUrl(input);
  }

  // Fichier local
  return loadImageFromFile(input);
}

/**
 * Charger image depuis fichier
 */
async function loadImageFromFile(filePath: string): Promise<ImageInput> {
  const absolutePath = path.resolve(filePath);
  const mimeType = getMimeType(absolutePath);
  const buffer = await fs.readFile(absolutePath);
  const base64 = buffer.toString('base64');

  return {
    type: 'base64',
    data: `data:${mimeType};base64,${base64}`,
    mimeType,
    source: filePath,
  };
}
```

**Utilisation** :

```bash
# Via argument
grok "Implémente ce design" --image mockup.png

# Via référence dans le texte
grok "Analyse cette architecture @diagram.png et suggère des améliorations"

# Via URL
grok "Qu'est-ce que ce graphique montre?" --image https://example.com/chart.png
```

**Construction du message multimodal** :

```typescript
export function buildMultimodalContent(
  text: string,
  images: ImageInput[],
  detail: 'low' | 'high' | 'auto' = 'auto'
): Array<{ type: 'text'; text: string } | ImageContent> {
  const content: Array<{ type: 'text'; text: string } | ImageContent> = [];

  // Texte d'abord
  content.push({ type: 'text', text });

  // Images ensuite
  for (const image of images) {
    content.push({
      type: 'image_url',
      image_url: { url: image.data, detail },
    });
  }

  return content;
}
```

### 1.2 Input Vocal (Whisper)

**Inspiration** : Aider

Permettez aux utilisateurs de dicter leurs prompts au lieu de taper.

```typescript
// src/tools/voice-input.ts

export interface VoiceConfig {
  apiKey?: string;           // Clé Whisper API
  useLocal?: boolean;        // Utiliser whisper.cpp local
  duration?: number;         // Durée d'enregistrement (0 = manuel)
  language?: string;         // Code langue ('en', 'fr')
  modelSize?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
}

export interface VoiceResult {
  success: boolean;
  text: string;
  duration: number;
  error?: string;
}

/**
 * Enregistrer et transcrire
 */
export async function getVoiceInput(config: VoiceConfig = {}): Promise<VoiceResult> {
  const startTime = Date.now();

  // Vérifier capacité d'enregistrement
  if (!(await hasRecordingCapability())) {
    return {
      success: false,
      text: '',
      duration: 0,
      error: 'Installez sox ou ffmpeg pour l\'enregistrement audio.',
    };
  }

  console.log('Appuyez sur Entrée pour commencer...');
  await waitForEnter();

  console.log('Enregistrement... Appuyez sur Entrée pour arrêter.');
  const audioPath = await recordAudio(config.duration || 0);

  // Transcrire
  let text: string;
  if (config.useLocal && await hasLocalWhisper()) {
    text = await transcribeWithLocalWhisper(audioPath, config.modelSize || 'base');
  } else if (config.apiKey) {
    text = await transcribeWithWhisperAPI(audioPath, config.apiKey, config.language);
  } else {
    throw new Error('Pas de clé API et whisper local non trouvé');
  }

  await fs.remove(audioPath);

  return {
    success: true,
    text: text.trim(),
    duration: Date.now() - startTime,
  };
}
```

**Commandes d'enregistrement supportées** :

| Outil | Plateforme | Commande |
|-------|------------|----------|
| sox/rec | Cross-platform | `rec -q output.wav rate 16000 channels 1` |
| ffmpeg | Cross-platform | `ffmpeg -f avfoundation -i ":0" -ar 16000 -ac 1 output.wav` |
| arecord | Linux (ALSA) | `arecord -f S16_LE -r 16000 -c 1 output.wav` |

---

## 2. Exécution Directe

### 2.1 Shell Prefix `!`

**Inspiration** : Gemini CLI

Exécutez des commandes shell directement sans passer par l'IA.

```typescript
// src/commands/shell-prefix.ts

export function isShellCommand(input: string): boolean {
  return input.trim().startsWith('!');
}

export function extractShellCommand(input: string): string {
  return input.trim().slice(1).trim();
}

export async function executeShellCommand(
  command: string,
  cwd: string = process.cwd(),
  timeout: number = 30000
): Promise<ShellResult> {
  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const execError = error as ExecError;
    return {
      success: false,
      stdout: execError.stdout?.trim() || '',
      stderr: execError.stderr?.trim() || execError.message,
      exitCode: execError.code || 1,
      duration: Date.now() - startTime,
    };
  }
}
```

**Utilisation** :

```bash
grok> !git status
# Exécute directement, pas d'interprétation IA

grok> !npm test
# Lance les tests immédiatement

grok> !cat package.json | jq .version
# Pipelines shell supportés
```

**Intégration dans la boucle principale** :

```typescript
async function handleInput(input: string): Promise<void> {
  // Shell direct ?
  if (isShellCommand(input)) {
    const cmd = extractShellCommand(input);
    const result = await executeShellCommand(cmd);

    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    return;
  }

  // Sinon, envoyer à l'IA
  await agent.chat(input);
}
```

---

## 3. Fichiers de Contexte

### 3.1 Auto-chargement de Contexte

**Inspiration** : Gemini CLI (GEMINI.md), Claude Code (CLAUDE.md)

Chargez automatiquement des instructions projet au démarrage.

```typescript
// src/context/context-files.ts

const CONTEXT_FILE_LOCATIONS = [
  { pattern: '.grok/CONTEXT.md', source: 'project', priority: 1 },
  { pattern: 'GROK.md', source: 'project', priority: 2 },
  { pattern: '.grok/context.md', source: 'project', priority: 3 },
  { pattern: 'CLAUDE.md', source: 'project', priority: 4 },  // Compatibilité
  { pattern: 'AGENTS.md', source: 'project', priority: 5 },
];

export interface LoadedContext {
  content: string;
  sources: ContextSource[];
  totalTokens: number;
}

export async function loadContext(projectDir: string): Promise<LoadedContext> {
  const sources: ContextSource[] = [];
  let totalContent = '';

  for (const location of CONTEXT_FILE_LOCATIONS) {
    const filePath = path.join(projectDir, location.pattern);

    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      const tokens = estimateTokens(content);

      sources.push({
        path: filePath,
        pattern: location.pattern,
        source: location.source,
        priority: location.priority,
        tokens,
        loadedAt: new Date(),
      });

      totalContent += `\n\n<!-- From ${location.pattern} -->\n${content}`;
    }
  }

  return {
    content: totalContent.trim(),
    sources,
    totalTokens: estimateTokens(totalContent),
  };
}
```

**Format recommandé pour `.grok/CONTEXT.md`** :

```markdown
# Instructions Projet

## Architecture
- Framework: Next.js 14 avec App Router
- Base de données: PostgreSQL avec Prisma
- Tests: Jest + React Testing Library

## Conventions
- Commits: Conventional Commits
- Branches: feature/, bugfix/, hotfix/
- Code style: ESLint + Prettier

## Fichiers Importants
- `src/lib/db.ts` - Client Prisma singleton
- `src/middleware.ts` - Auth et rate limiting
- `.env.example` - Variables requises

## À Éviter
- Ne JAMAIS modifier `src/generated/`
- Ne pas commiter `.env`
- Pas de `any` en TypeScript
```

---

## 4. Watch Mode — IDE Integration

### 4.1 Commentaires AI! et AI?

**Inspiration** : Aider

Déclenchez l'IA directement depuis vos fichiers avec des commentaires spéciaux.

```typescript
// src/commands/watch-mode.ts

const COMMENT_PATTERNS = [
  // Hash comments (Python, Ruby, Shell, YAML)
  { regex: /#\s*AI!\s*(.+)$/gm, type: 'action' as const },
  { regex: /#\s*AI\?\s*(.+)$/gm, type: 'question' as const },

  // Double slash (JavaScript, TypeScript, C, Java, Go, Rust)
  { regex: /\/\/\s*AI!\s*(.+)$/gm, type: 'action' as const },
  { regex: /\/\/\s*AI\?\s*(.+)$/gm, type: 'question' as const },

  // Double dash (SQL, Lua, Haskell)
  { regex: /--\s*AI!\s*(.+)$/gm, type: 'action' as const },
  { regex: /--\s*AI\?\s*(.+)$/gm, type: 'question' as const },

  // HTML/XML
  { regex: /<!--\s*AI!\s*(.+?)\s*-->/gm, type: 'action' as const },
  { regex: /<!--\s*AI\?\s*(.+?)\s*-->/gm, type: 'question' as const },
];

export interface AIComment {
  type: 'action' | 'question';
  content: string;
  filePath: string;
  lineNumber: number;
  context: string;  // Code environnant
}
```

**Exemples d'utilisation** :

```python
# AI! Add input validation for email format
def create_user(email: str):
    pass
```

```typescript
// AI? Why does this function return undefined sometimes?
function processData(input: unknown) {
  if (typeof input === 'string') {
    return input.toUpperCase();
  }
}
```

```sql
-- AI! Optimize this query for large datasets
SELECT * FROM users
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY score DESC;
```

**Le Watch Manager** :

```typescript
export class WatchModeManager extends EventEmitter {
  private watchers: FSWatcher[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private processedComments: Set<string> = new Set();

  async start(): Promise<void> {
    for (const watchPath of this.config.paths) {
      const watcher = watch(watchPath, { recursive: true }, (event, filename) => {
        if (event === 'change' && filename) {
          const filePath = path.join(watchPath, filename);
          if (this.shouldWatch(filePath)) {
            this.handleFileChange(filePath);
          }
        }
      });
      this.watchers.push(watcher);
    }
    this.emit('started', { paths: this.config.paths });
  }

  private shouldWatch(filePath: string): boolean {
    const ignored = ['node_modules', '.git', 'dist', 'build', '.min.'];
    return !ignored.some(pattern => filePath.includes(pattern));
  }

  private async processFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const comments = extractAIComments(content, filePath);

    for (const comment of comments) {
      const key = `${comment.filePath}:${comment.lineNumber}:${comment.content}`;

      if (!this.processedComments.has(key)) {
        this.processedComments.add(key);
        this.emit('comment', comment);
      }
    }
  }
}
```

**Lancement** :

```bash
grok --watch
# ou
grok -w

# Watch mode actif. Ajoutez AI! ou AI? dans vos fichiers...
```

---

## 5. Slash Command `/compress`

### 5.1 Compression à la Demande

**Inspiration** : Gemini CLI

Permettez aux utilisateurs de compresser manuellement le contexte de conversation.

```typescript
// src/commands/compress.ts

export interface CompressResult {
  success: boolean;
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savingsPercent: number;
  summary: string;
}

export async function compressContext(
  messages: ChatCompletionMessageParam[],
  llmCall: (prompt: string) => Promise<string>,
  estimateTokens: (text: string) => number
): Promise<CompressResult> {
  // Calculer tokens originaux
  const originalTokens = messages.reduce(
    (sum, msg) => sum + estimateTokens(String(msg.content)),
    0
  );

  // Construire le résumé
  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');

  const summaryPrompt = `Résume cette conversation en préservant:
1. Les décisions techniques prises
2. Les fichiers modifiés
3. Les erreurs rencontrées et solutions
4. L'état actuel du travail

Conversation:
${conversationText}

Résumé structuré:`;

  const summary = await llmCall(summaryPrompt);
  const compressedTokens = estimateTokens(summary);

  return {
    success: true,
    originalTokens,
    compressedTokens,
    savedTokens: originalTokens - compressedTokens,
    savingsPercent: Math.round((1 - compressedTokens / originalTokens) * 100),
    summary,
  };
}
```

**Utilisation** :

```bash
grok> /compress

Compression du contexte...
├── Tokens originaux: 45,230
├── Tokens compressés: 8,450
├── Économie: 36,780 tokens (81%)
└── Résumé généré et appliqué

Le contexte a été compressé. La conversation continue avec le résumé.
```

---

## 6. Délégation Automatique `/delegate`

### 6.1 Création de PR Automatique

**Inspiration** : GitHub Copilot CLI

Déléguez une tâche à l'agent qui crée automatiquement une branche et une PR.

```typescript
// src/commands/delegate.ts

export interface DelegateConfig {
  task: string;
  baseBranch?: string;
  draft?: boolean;
  reviewers?: string[];
  labels?: string[];
}

export interface DelegateResult {
  success: boolean;
  branchName?: string;
  prUrl?: string;
  prNumber?: number;
  error?: string;
}

export function generateBranchName(task: string): string {
  const slug = task
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);

  const hash = crypto.randomBytes(3).toString('hex');
  return `grok/${slug}-${hash}`;
}

export async function delegate(config: DelegateConfig): Promise<DelegateResult> {
  // Validation
  if (!(await isGitRepo())) {
    return { success: false, error: 'Pas un dépôt git' };
  }

  if (!(await hasGhCli())) {
    return { success: false, error: 'gh CLI requis. Installez depuis https://cli.github.com' };
  }

  const currentBranch = await getCurrentBranch();
  const baseBranch = config.baseBranch || currentBranch;
  const branchName = generateBranchName(config.task);

  // Commit les changements non staged
  if (await hasUncommittedChanges()) {
    await commitChanges(`WIP: Starting task - ${config.task}`);
  }

  // Créer et pousser la branche
  await createBranch(branchName);
  await pushBranch(branchName);

  // Créer la PR
  const prBody = `## Task\n\n${config.task}\n\n## Status\n\nCréé par Grok CLI via \`/delegate\`.`;

  const pr = await createPullRequest(
    `[Grok] ${config.task.slice(0, 60)}`,
    prBody,
    baseBranch,
    config.draft !== false,
    config.labels || ['grok-cli', 'automated'],
    config.reviewers || []
  );

  return {
    success: true,
    branchName,
    prUrl: pr.url,
    prNumber: pr.number,
  };
}
```

**Workflow complet** :

```bash
grok> /delegate Fix all TypeScript strict mode errors

Délégation de la tâche...
├── Branche créée: grok/fix-all-typescript-strict-mode-e7f3a2
├── Changes committés: WIP: Starting task
├── Branche poussée vers origin
└── PR créée: https://github.com/user/repo/pull/42

L'agent travaille maintenant sur la tâche en arrière-plan.
Utilisez `gh pr view 42` pour suivre la progression.
```

**Complétion de la délégation** :

```typescript
export async function completeDelegate(
  prNumber: number,
  summary: string,
  reviewers: string[] = []
): Promise<void> {
  // Ajouter commentaire de complétion
  await addPRComment(prNumber, `## Tâche Complétée\n\n${summary}\n\n---\nPrêt pour review.`);

  // Enlever le statut draft
  await markReady(prNumber);

  // Demander review
  if (reviewers.length > 0) {
    await requestReview(prNumber, reviewers);
  }
}
```

---

## 7. Système de Personas

### 7.1 Personnalités Configurables

Permettez aux utilisateurs de définir des "personas" qui modifient le comportement de l'agent.

```typescript
// src/personas/persona-manager.ts

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature?: number;
  preferredModel?: string;
  tools?: {
    enabled?: string[];
    disabled?: string[];
  };
}

const BUILTIN_PERSONAS: Persona[] = [
  {
    id: 'default',
    name: 'Assistant',
    description: 'Assistant équilibré pour toutes tâches',
    systemPrompt: '',  // Utilise le prompt par défaut
  },
  {
    id: 'architect',
    name: 'Architecte',
    description: 'Focus sur design patterns et architecture',
    systemPrompt: `Tu es un architecte logiciel senior.
Avant d'écrire du code, tu proposes toujours une architecture.
Tu utilises des diagrammes ASCII pour expliquer.
Tu questionnes les choix techniques.`,
    temperature: 0.3,
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: 'Code review stricte et constructive',
    systemPrompt: `Tu es un code reviewer exigeant mais bienveillant.
Tu cherches: bugs, sécurité, performance, maintenabilité.
Tu proposes des améliorations concrètes avec exemples.
Tu ne modifies jamais le code toi-même.`,
    tools: { disabled: ['write_file', 'edit_file'] },
  },
  {
    id: 'teacher',
    name: 'Enseignant',
    description: 'Explique et enseigne en détail',
    systemPrompt: `Tu es un enseignant patient.
Tu expliques étape par étape avec des analogies.
Tu poses des questions pour vérifier la compréhension.
Tu donnes des exercices pratiques.`,
    temperature: 0.7,
  },
];

export class PersonaManager {
  private personas: Map<string, Persona> = new Map();
  private currentPersona: Persona;

  constructor() {
    // Charger personas built-in
    for (const persona of BUILTIN_PERSONAS) {
      this.personas.set(persona.id, persona);
    }
    this.currentPersona = this.personas.get('default')!;
  }

  async loadUserPersonas(configPath: string): Promise<void> {
    if (await fs.pathExists(configPath)) {
      const userPersonas = await fs.readJson(configPath);
      for (const persona of userPersonas) {
        this.personas.set(persona.id, persona);
      }
    }
  }

  switch(personaId: string): Persona {
    const persona = this.personas.get(personaId);
    if (!persona) {
      throw new Error(`Persona '${personaId}' non trouvée`);
    }
    this.currentPersona = persona;
    return persona;
  }

  list(): Persona[] {
    return Array.from(this.personas.values());
  }
}
```

**Utilisation** :

```bash
grok> /persona architect
Persona changée: Architecte
Focus sur design patterns et architecture

grok> Comment structurer une API REST?

# L'agent répond avec un focus architecture...
```

---

## 8. Système de Skills

### 8.1 Capacités Auto-Activées

Les skills sont des capacités qui s'activent automatiquement selon le contexte.

```typescript
// src/skills/skill-manager.ts

export interface Skill {
  id: string;
  name: string;
  description: string;
  triggers: SkillTrigger[];
  tools: string[];
  systemPromptAddition?: string;
}

export interface SkillTrigger {
  type: 'file_extension' | 'keyword' | 'tool_result' | 'manual';
  pattern: string | RegExp;
}

const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'typescript',
    name: 'TypeScript Expert',
    description: 'Expertise TypeScript activée',
    triggers: [
      { type: 'file_extension', pattern: '.ts' },
      { type: 'file_extension', pattern: '.tsx' },
      { type: 'keyword', pattern: /typescript|tsc|tsconfig/i },
    ],
    tools: ['typescript_check', 'eslint'],
    systemPromptAddition: 'Tu as une expertise TypeScript. Utilise les types stricts.',
  },
  {
    id: 'testing',
    name: 'Testing Expert',
    description: 'Expertise tests activée',
    triggers: [
      { type: 'file_extension', pattern: '.test.ts' },
      { type: 'file_extension', pattern: '.spec.ts' },
      { type: 'keyword', pattern: /jest|vitest|test|spec/i },
    ],
    tools: ['run_tests', 'coverage'],
    systemPromptAddition: 'Tu écris des tests exhaustifs. Tu vises 80%+ de couverture.',
  },
  {
    id: 'git',
    name: 'Git Expert',
    description: 'Expertise Git activée',
    triggers: [
      { type: 'keyword', pattern: /git|commit|branch|merge|rebase/i },
      { type: 'tool_result', pattern: 'git' },
    ],
    tools: ['git_status', 'git_diff', 'git_commit'],
    systemPromptAddition: 'Tu suis les conventions de commit. Tu fais des commits atomiques.',
  },
];

export class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private activeSkills: Set<string> = new Set();

  detectSkills(context: SkillContext): Skill[] {
    const detected: Skill[] = [];

    for (const skill of this.skills.values()) {
      for (const trigger of skill.triggers) {
        if (this.matchesTrigger(trigger, context)) {
          detected.push(skill);
          break;
        }
      }
    }

    return detected;
  }

  private matchesTrigger(trigger: SkillTrigger, context: SkillContext): boolean {
    switch (trigger.type) {
      case 'file_extension':
        return context.files?.some(f => f.endsWith(trigger.pattern as string)) ?? false;
      case 'keyword':
        return (trigger.pattern as RegExp).test(context.userMessage);
      case 'tool_result':
        return context.lastToolResult?.includes(trigger.pattern as string) ?? false;
      default:
        return false;
    }
  }
}
```

**Activation automatique** :

```
grok> Aide-moi à écrire des tests pour UserService

[Skill activé: Testing Expert]
[Skill activé: TypeScript Expert]

Je vais t'aider à écrire des tests complets pour UserService...
```

---

## 9. Mode Hors-Ligne

### 9.1 Fonctionnement Sans Internet

```typescript
// src/offline/offline-mode.ts

export interface OfflineConfig {
  localModels: LocalModelConfig[];
  cacheResponses: boolean;
  fallbackBehavior: 'cache' | 'local' | 'error';
}

export class OfflineManager {
  private isOnline: boolean = true;
  private responseCache: Map<string, CachedResponse> = new Map();

  async checkConnectivity(): Promise<boolean> {
    try {
      await fetch('https://api.x.ai/health', {
        method: 'HEAD',
        timeout: 5000
      });
      this.isOnline = true;
    } catch {
      this.isOnline = false;
    }
    return this.isOnline;
  }

  async handleRequest(request: ChatRequest): Promise<ChatResponse> {
    if (this.isOnline) {
      const response = await this.sendToAPI(request);
      await this.cacheResponse(request, response);
      return response;
    }

    // Mode hors-ligne
    switch (this.config.fallbackBehavior) {
      case 'cache':
        return this.findCachedResponse(request);
      case 'local':
        return this.useLocalModel(request);
      case 'error':
        throw new Error('Mode hors-ligne: pas de connexion API');
    }
  }
}
```

---

## 10. Récapitulatif des Commandes

| Commande | Description | Exemple |
|----------|-------------|---------|
| `!cmd` | Exécution shell directe | `!git status` |
| `/compress` | Compresser le contexte | `/compress` |
| `/delegate` | Créer PR automatique | `/delegate Fix bug #123` |
| `/persona` | Changer de persona | `/persona architect` |
| `/watch` | Activer watch mode | `/watch src/` |
| `--image` | Ajouter image | `grok "Analyse" --image ui.png` |
| `--voice` | Input vocal | `grok --voice` |

---

## Points Clés

1. **Input Multimodal** : Images et voix élargissent les interactions possibles
2. **Shell Direct** : `!` pour les commandes sans IA
3. **Context Files** : Instructions projet auto-chargées
4. **Watch Mode** : Intégration IDE via commentaires AI!/AI?
5. **Délégation** : Automatisation complète du workflow PR
6. **Personas** : Personnalités adaptées aux tâches
7. **Skills** : Activation contextuelle de capacités

Ces fonctionnalités transforment un simple CLI en un véritable environnement de développement assisté.

---

[← Chapitre 17](17-perspectives-futures.md) | [Table des Matières](README.md) | [Annexe A →](annexe-a-transformers.md)
