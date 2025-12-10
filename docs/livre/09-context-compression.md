# Chapitre 9 : Compression de Contexte — 70% de Tokens en Moins

---

## 1. Le Problème

3h47 du matin. Alerte budget : "$847 en 12 jours". 50K tokens par requête. Les mêmes 500 lignes de logs npm envoyées 10 fois. L'historique complet accumulé comme des couches géologiques.

**L'erreur classique** : Envoyer tout le contexte à chaque requête sans filtrer. Le modèle reçoit des informations obsolètes, se perd au milieu, et vous payez pour du bruit.

```typescript
// ❌ Ce que vous envoyez
const context = [
  systemPrompt,           // 500 tokens
  historyFrom10MessagesAgo, // 2000 tokens (obsolète)
  npmInstallOutput,       // 3000 tokens (déjà vu)
  fullFileContent,        // 5000 tokens (seul 50 lignes pertinentes)
  // Total: 10,500 tokens × 15 requêtes = $$$
];
```

---

## 2. La Solution Rapide : Compression par Priorité

```typescript
interface MessageWithPriority {
  content: string;
  tokens: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

function compressContext(messages: MessageWithPriority[], maxTokens: number): string[] {
  // 1. Trier par priorité
  const sorted = messages.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  // 2. Garder jusqu'au budget
  const result: string[] = [];
  let totalTokens = 0;

  for (const msg of sorted) {
    if (totalTokens + msg.tokens <= maxTokens) {
      result.push(msg.content);
      totalTokens += msg.tokens;
    } else if (msg.priority === 'critical') {
      // Critique = toujours garder, résumer si nécessaire
      const summarized = await summarize(msg.content, maxTokens - totalTokens);
      result.push(summarized);
      break;
    }
  }

  return result;
}

// Assignation automatique des priorités
function assignPriority(message: Message): MessageWithPriority {
  const content = message.content;

  // Critique : ne jamais supprimer
  if (message.role === 'system') return { ...message, priority: 'critical' };
  if (message.isCurrentTask) return { ...message, priority: 'critical' };

  // Haute : important pour le contexte
  if (content.includes('```') && isRecentCode(message)) return { ...message, priority: 'high' };
  if (message.role === 'user' && isRecent(message, 3)) return { ...message, priority: 'high' };

  // Moyenne : utile mais résumable
  if (message.role === 'tool' && isRecent(message, 5)) return { ...message, priority: 'medium' };

  // Basse : peut être supprimé
  return { ...message, priority: 'low' };
}
```

---

## 3. Deep Dive : Lost in the Middle

### 3.1 La découverte de Stanford (2023)

Les chercheurs ont caché un "fait clé" à différentes positions dans un contexte de 128K tokens :

| Position | Précision |
|----------|-----------|
| **Début** | 98% |
| **Milieu** | 45% |
| **Fin** | 95% |

Le modèle "oublie" ce qu'il lit au milieu. Ce n'est pas un bug, c'est une limitation architecturale des Transformers.

### 3.2 Implication pour la compression

```typescript
// ❌ Ordre naïf : chronologique
const messages = [
  systemPrompt,    // Début ✓
  oldHistory,      // Milieu ✗ (oublié)
  currentTask      // Fin ✓
];

// ✅ Ordre optimisé : critique aux extrémités
function orderForAttention(messages: MessageWithPriority[]): string[] {
  const critical = messages.filter(m => m.priority === 'critical');
  const high = messages.filter(m => m.priority === 'high');
  const rest = messages.filter(m => m.priority !== 'critical' && m.priority !== 'high');

  return [
    ...critical,     // Début (haute attention)
    ...rest,         // Milieu (basse attention) - info moins importante
    ...high          // Fin (haute attention)
  ];
}
```

### 3.3 Observation Masking

Les résultats d'outils anciens ne servent plus mais polluent le contexte :

```typescript
// ❌ Garder tous les résultats d'outils
messages = [
  { role: 'tool', content: '... 500 lignes de npm install ...' },  // Round 1
  { role: 'tool', content: '... 500 lignes de npm install ...' },  // Round 5
  { role: 'tool', content: '... 500 lignes de npm install ...' },  // Round 10
  // 1500 tokens de la même info
];

// ✅ Masquer les anciens, garder une trace
function maskOldObservations(messages: Message[], keepRecent = 3): Message[] {
  const toolMessages = messages.filter(m => m.role === 'tool');
  const recentTools = toolMessages.slice(-keepRecent);

  return messages.map(msg => {
    if (msg.role === 'tool' && !recentTools.includes(msg)) {
      return {
        role: 'tool',
        content: `[Output masqué - ${msg.tokens} tokens - disponible si besoin]`
      };
    }
    return msg;
  });
}
```

---

## 4. Edge Cases et Pièges

### Piège 1 : Supprimer du contexte critique

```typescript
// ❌ Compression trop agressive
const compressed = messages.slice(-5);  // Garde seulement les 5 derniers
// Problème : perd le system prompt !

// ✅ Protéger les messages critiques
function safeCompress(messages: Message[], maxTokens: number): Message[] {
  const protected = messages.filter(m =>
    m.role === 'system' || m.isCurrentTask
  );
  const protectedTokens = countTokens(protected);

  const rest = messages.filter(m => !protected.includes(m));
  const compressed = compressToFit(rest, maxTokens - protectedTokens);

  return [...protected, ...compressed];
}
```

**Contournement** : Toujours protéger system prompt et tâche courante.

### Piège 2 : Résumer tue le contexte

```typescript
// ❌ Résumer du code = perte d'information
const summary = await summarize(codeBlock);
// "Cette fonction calcule un total" - inutile pour comprendre le bug

// ✅ Tronquer plutôt que résumer pour le code
function compressCode(code: string, maxLines = 50): string {
  const lines = code.split('\n');
  if (lines.length <= maxLines) return code;

  const head = lines.slice(0, 20).join('\n');
  const tail = lines.slice(-20).join('\n');
  return `${head}\n\n// ... ${lines.length - 40} lignes omises ...\n\n${tail}`;
}
```

**Contournement** : Pour le code, tronquer > résumer.

### Piège 3 : Compression statique

```typescript
// ❌ Même compression pour toutes les requêtes
const maxTokens = 10000;  // Toujours

// ✅ Adapter au type de tâche
function getMaxTokens(taskType: string): number {
  const budgets = {
    'simple_question': 4000,
    'code_review': 20000,
    'architecture': 50000,
    'debug': 15000
  };
  return budgets[taskType] || 10000;
}
```

**Contournement** : Budget dynamique selon la complexité.

---

## 5. Optimisation : Les Chiffres de JetBrains

L'étude JetBrains 2024 a mesuré l'impact de chaque technique :

| Technique | Réduction tokens | Impact qualité |
|-----------|:----------------:|:--------------:|
| Sans compression | 0% | Baseline |
| Priority-based | -40% | +1.2% |
| + Summarization | -55% | +2.1% |
| + Observation masking | -62% | +2.4% |
| **Combiné** | **-70%** | **+2.6%** |

**Conclusion contre-intuitive** : Moins de contexte = meilleure qualité. Le modèle se concentre mieux.

```typescript
// Configuration optimale
const compressionConfig = {
  maxTokens: 20000,
  priorities: {
    system: 'critical',
    currentCode: 'critical',
    recentHistory: 'high',      // 3 derniers échanges
    toolResults: 'medium',       // Masquer après 3 rounds
    oldHistory: 'low'            // Supprimer après 10 échanges
  },
  observationMasking: {
    keepRecent: 3,
    summarizeOld: true
  }
};
```

---

## Tableau Récapitulatif

| Avant | Après | Économie |
|-------|-------|----------|
| 50K tokens/requête | 15K tokens/requête | **-70%** |
| $847/12 jours | $254/12 jours | **-$593** |
| Qualité baseline | Qualité +2.6% | **Meilleure** |

---

## Ce Qui Vient Ensuite

Le contexte est optimisé, mais l'agent a besoin d'**outils** pour agir. Le **Chapitre 10** détaille les 41+ outils de Grok-CLI : lecture, écriture, exécution, avec sécurité intégrée.

---

[⬅️ Chapitre 8](08-dependency-aware-rag.md) | [📚 Table des Matières](README.md) | [➡️ Chapitre 10](10-tool-use.md)
