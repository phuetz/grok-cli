# Chapitre 1 : Votre Premier Agent en 30 Minutes

---

## Ce Que Vous Allez Obtenir

| Temps | Résultat |
|-------|----------|
| **10 min** | Un agent qui répond à vos questions |
| **20 min** | Un agent qui lit et modifie vos fichiers |
| **30 min** | Un agent avec garde-fous (pas de facture $847) |

À la fin de ce chapitre, vous aurez un agent fonctionnel qui peut :
- Lire votre code
- Proposer des modifications
- Exécuter des commandes (de manière sécurisée)

---

## 1.1 Le Test des 5 Minutes : Agent ou Simple Prompt ?

Avant de coder, clarifiions ce qui distingue un **agent** d'un simple appel API.

| Simple Prompt | Agent |
|---------------|-------|
| Une question → Une réponse | Un objectif → N actions automatiques |
| "Explique ce code" | "Corrige ce bug et vérifie que les tests passent" |
| Pas de mémoire entre appels | Contexte maintenu sur plusieurs itérations |
| Pas d'outils | Lit fichiers, exécute commandes, appelle APIs |

**Le test** : Si accomplir la tâche nécessite plusieurs étapes que vous devriez faire vous-même entre les appels LLM, vous avez besoin d'un agent.

---

## 1.2 Les 3 Erreurs Fatales (et Comment les Éviter)

### Erreur #1 : L'Agent Sans Limite → $847

```typescript
// ❌ CE CODE VA VOUS RUINER
async function dangerousAgent(goal: string) {
  while (true) {  // Boucle infinie !
    const response = await llm.chat(messages);
    if (response.includes("DONE")) break;
    // ... actions
  }
}
```

**Ce qui s'est passé** : Un de mes premiers agents est parti en boucle infinie pendant 6 heures. Il n'arrivait jamais à résoudre le problème, mais continuait d'essayer. Facture : $847.

```typescript
// ✅ VERSION SÉCURISÉE
const MAX_ITERATIONS = 15;
const MAX_TOKENS_PER_SESSION = 100_000;

async function safeAgent(goal: string) {
  let iterations = 0;
  let totalTokens = 0;

  while (iterations < MAX_ITERATIONS && totalTokens < MAX_TOKENS_PER_SESSION) {
    const response = await llm.chat(messages);
    totalTokens += response.usage.total_tokens;
    iterations++;

    if (response.includes("DONE")) break;
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn("⚠️ Limite d'itérations atteinte");
  }
}
```

### Erreur #2 : L'Agent Qui Supprime Vos Fichiers

```typescript
// ❌ DANGER : L'AGENT PEUT TOUT FAIRE
const tools = [
  { name: "run_command", execute: (cmd) => exec(cmd) }  // rm -rf * ?
];
```

**Ce qui s'est passé** : 23h47, un mardi. Mon agent a décidé que `config.json` était "inutile" et l'a supprimé. La troisième fois cette semaine.

```typescript
// ✅ VERSION SÉCURISÉE
const ALLOWED_COMMANDS = ['ls', 'cat', 'grep', 'npm test', 'npm run build'];
const PROTECTED_PATHS = ['.env', 'config.json', '.git/', 'node_modules/'];

function safeExecute(cmd: string, path?: string): string {
  // Vérifier la commande
  const baseCmd = cmd.split(' ')[0];
  if (!ALLOWED_COMMANDS.some(allowed => cmd.startsWith(allowed))) {
    throw new Error(`Commande non autorisée: ${baseCmd}`);
  }

  // Vérifier le chemin
  if (path && PROTECTED_PATHS.some(p => path.includes(p))) {
    throw new Error(`Chemin protégé: ${path}`);
  }

  return execSync(cmd).toString();
}
```

### Erreur #3 : L'Agent Sans Contexte Suffisant

```typescript
// ❌ L'AGENT NE COMPREND PAS LE PROJET
const messages = [
  { role: "user", content: "Corrige le bug dans auth.ts" }
];
// L'agent ne sait pas : structure du projet, conventions, dépendances...
```

**Ce qui s'est passé** : L'agent a "corrigé" le bug en réécrivant tout le fichier avec des conventions différentes et en cassant 15 imports.

```typescript
// ✅ VERSION AVEC CONTEXTE
async function buildContext(targetFile: string): Promise<string> {
  const projectInfo = await readFile('package.json', 'utf-8');
  const fileContent = await readFile(targetFile, 'utf-8');
  const imports = extractImports(fileContent);
  const relatedFiles = await Promise.all(
    imports.slice(0, 5).map(f => readFile(f, 'utf-8').catch(() => ''))
  );

  return `
## Projet
${projectInfo}

## Fichier cible: ${targetFile}
${fileContent}

## Fichiers liés
${relatedFiles.map((content, i) => `### ${imports[i]}\n${content}`).join('\n')}
`;
}
```

---

## 1.3 Template MinimalAgent : 50 Lignes, Production-Ready

Voici l'agent minimal qui fonctionne vraiment :

```typescript
import Anthropic from '@anthropic-ai/sdk';

// Configuration
const MAX_ITERATIONS = 15;
const MODEL = 'claude-3-5-sonnet-20241022';

// Outils disponibles
const tools: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Lit le contenu d\'un fichier',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Chemin du fichier' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Écrit dans un fichier (DEMANDE CONFIRMATION)',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Chemin du fichier' },
        content: { type: 'string', description: 'Contenu à écrire' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'run_command',
    description: 'Exécute une commande shell (ls, cat, grep, npm test uniquement)',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Commande à exécuter' }
      },
      required: ['command']
    }
  }
];

// Exécution des outils
async function executeTool(name: string, input: any): Promise<string> {
  switch (name) {
    case 'read_file':
      return await readFile(input.path, 'utf-8');

    case 'write_file':
      // Demander confirmation
      const confirm = await askUser(`Écrire dans ${input.path}? (o/n)`);
      if (confirm !== 'o') return 'Annulé par l\'utilisateur';
      await writeFile(input.path, input.content);
      return `Fichier ${input.path} écrit avec succès`;

    case 'run_command':
      const ALLOWED = ['ls', 'cat', 'grep', 'npm test', 'npm run'];
      if (!ALLOWED.some(cmd => input.command.startsWith(cmd))) {
        return `Erreur: Commande non autorisée. Autorisées: ${ALLOWED.join(', ')}`;
      }
      return execSync(input.command, { encoding: 'utf-8', timeout: 30000 });

    default:
      return `Erreur: Outil inconnu ${name}`;
  }
}

// Boucle principale de l'agent
async function runAgent(goal: string): Promise<void> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: goal }
  ];

  console.log(`🎯 Objectif: ${goal}\n`);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`--- Itération ${i + 1}/${MAX_ITERATIONS} ---`);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: `Tu es un agent de développement. Tu peux lire des fichiers, écrire du code, et exécuter des commandes.
Règles:
- Lis TOUJOURS un fichier avant de le modifier
- Demande confirmation avant d'écrire
- Arrête-toi quand l'objectif est atteint`,
      tools,
      messages
    });

    // Afficher la réponse
    for (const block of response.content) {
      if (block.type === 'text') {
        console.log(`💬 ${block.text}`);
      }
    }

    // Vérifier si terminé
    if (response.stop_reason === 'end_turn') {
      console.log('\n✅ Agent terminé');
      break;
    }

    // Exécuter les outils demandés
    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.MessageParam = {
        role: 'user',
        content: []
      };

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`🔧 ${block.name}(${JSON.stringify(block.input)})`);
          const result = await executeTool(block.name, block.input);
          console.log(`   → ${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`);

          (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result
          });
        }
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push(toolResults);
    }
  }
}

// Exemple d'utilisation
runAgent('Lis le fichier package.json et dis-moi la version du projet');
```

**Ce que fait cet agent :**
1. Reçoit un objectif en langage naturel
2. Utilise des outils pour accomplir l'objectif
3. S'arrête automatiquement quand c'est fait (ou après 15 itérations)
4. Demande confirmation avant d'écrire des fichiers
5. N'exécute que des commandes sûres

---

## 1.4 Exécutez Votre Premier Agent

### Prérequis

```bash
# Node.js 18+
node --version  # v18.0.0 ou plus

# Créer le projet
mkdir mon-premier-agent && cd mon-premier-agent
npm init -y
npm install @anthropic-ai/sdk typescript ts-node @types/node

# Configurer TypeScript
npx tsc --init
```

### Configuration API

```bash
# Créer le fichier .env
echo "ANTHROPIC_API_KEY=votre_clé_ici" > .env

# Charger automatiquement
npm install dotenv
```

```typescript
// Au début de votre fichier
import 'dotenv/config';
```

### Premier Test

```bash
# Créer un fichier de test
echo '{"name": "mon-projet", "version": "1.0.0"}' > package.json

# Lancer l'agent
npx ts-node agent.ts
```

**Résultat attendu :**
```
🎯 Objectif: Lis le fichier package.json et dis-moi la version du projet

--- Itération 1/15 ---
🔧 read_file({"path": "package.json"})
   → {"name": "mon-projet", "version": "1.0.0"}
💬 Le projet "mon-projet" est en version 1.0.0.

✅ Agent terminé
```

---

## 1.5 Ajoutez un Système de Coûts

Ne répétez pas mon erreur à $847. Ajoutez un tracker de coûts :

```typescript
// Coûts Claude (décembre 2024)
const COSTS = {
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },  // par million de tokens
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 }
};

class CostTracker {
  private totalCost = 0;
  private readonly maxCost: number;

  constructor(maxCost = 1.0) {  // $1 par défaut
    this.maxCost = maxCost;
  }

  track(model: string, inputTokens: number, outputTokens: number): void {
    const rates = COSTS[model] || COSTS['claude-3-5-sonnet-20241022'];
    const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
    this.totalCost += cost;

    console.log(`💰 Coût: $${cost.toFixed(4)} (Total: $${this.totalCost.toFixed(4)})`);

    if (this.totalCost >= this.maxCost) {
      throw new Error(`⛔ Budget dépassé: $${this.totalCost.toFixed(2)} >= $${this.maxCost}`);
    }
  }

  getTotal(): number {
    return this.totalCost;
  }
}

// Utilisation dans la boucle agent
const costTracker = new CostTracker(0.50);  // Max $0.50

const response = await client.messages.create({ ... });
costTracker.track(MODEL, response.usage.input_tokens, response.usage.output_tokens);
```

---

## 1.6 Checklist Avant Déploiement

Avant de lancer votre agent sur un vrai projet :

| Vérification | Status |
|--------------|--------|
| ☐ Limite d'itérations configurée (`MAX_ITERATIONS`) | |
| ☐ Budget maximum défini (`CostTracker`) | |
| ☐ Liste blanche de commandes (`ALLOWED_COMMANDS`) | |
| ☐ Chemins protégés définis (`PROTECTED_PATHS`) | |
| ☐ Confirmation avant écriture de fichiers | |
| ☐ Timeout sur les commandes (30s recommandé) | |
| ☐ Logs activés pour audit | |

---

## 1.7 Exercice : Votre Agent Personnalisé (30 min)

### Objectif
Modifiez l'agent pour qu'il puisse :
1. Lister les fichiers TypeScript d'un dossier
2. Compter les lignes de code (sans commentaires)
3. Générer un rapport

### Template de départ

```typescript
// Ajoutez ces outils
const additionalTools: Anthropic.Tool[] = [
  {
    name: 'list_files',
    description: 'Liste les fichiers avec un pattern glob',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Pattern glob (ex: **/*.ts)' }
      },
      required: ['pattern']
    }
  },
  {
    name: 'count_lines',
    description: 'Compte les lignes de code d\'un fichier (sans commentaires ni lignes vides)',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' }
      },
      required: ['path']
    }
  }
];

// Implémentez les handlers...
```

### Critères de succès
- [ ] L'agent liste correctement les fichiers `.ts`
- [ ] Le comptage exclut les commentaires (`//` et `/* */`)
- [ ] Un rapport final est affiché avec le total

---

## 1.8 Points Clés du Chapitre

| Concept | À Retenir |
|---------|-----------|
| **Agent vs Prompt** | Agent = boucle autonome avec outils |
| **Limite d'itérations** | TOUJOURS définir un `MAX_ITERATIONS` |
| **Budget** | Tracker les coûts, définir un maximum |
| **Sécurité** | Liste blanche de commandes, chemins protégés |
| **Confirmation** | Demander avant d'écrire/supprimer |

---

## Ce Qui Vient Ensuite

Maintenant que vous avez un agent fonctionnel, le **Chapitre 2** vous montrera comment réduire vos coûts de 70% avec le model routing (FrugalGPT).

---

[📚 Table des Matières](README.md) | [➡️ Chapitre 2 : Les Patterns d'Agents](02-role-des-agents.md)
