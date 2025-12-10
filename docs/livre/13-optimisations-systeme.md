# Chapitre 13 : Optimisations Système — Diviser les Coûts par 3

---

## 1. Le Problème

15 000 euros ce mois. 4 secondes de latence moyenne. 60% des requêtes triviales utilisent le modèle le plus cher. Les outils s'exécutent en série. 3 secondes de démarrage.

**L'erreur classique** : Un seul modèle pour tout, exécution séquentielle, chargement monolithique.

```typescript
// ❌ Agent non optimisé
const agent = {
  model: 'gpt-4-turbo',           // $0.03 pour "quelle heure ?"
  tools: allTools,                 // 47 outils pour chaque requête
  execution: 'sequential',         // Lire 5 fichiers = 5 × 200ms
  loading: 'eager'                 // 50 modules au démarrage
};

// Coût: $2.50/session, Latence: 4.2s, Startup: 3s

// ✅ Agent optimisé
const agent = {
  routing: new ModelRouter(),      // Modèle adapté à la tâche
  tools: toolFilter.filter(query), // Outils pertinents seulement
  execution: new ParallelExecutor(), // Exécution par niveaux
  loading: 'lazy'                  // Modules à la demande
};

// Coût: $0.75/session, Latence: 1.5s, Startup: 37ms
```

---

## 2. La Solution Rapide : Model Router (FrugalGPT)

```typescript
enum ModelTier {
  FAST = 'fast',          // gpt-4o-mini, $0.0001/1k tokens
  BALANCED = 'balanced',  // gpt-4o, $0.002/1k tokens
  POWERFUL = 'powerful'   // gpt-4-turbo, $0.01/1k tokens
}

class ModelRouter {
  async selectTier(task: string): Promise<ModelTier> {
    const features = this.extractFeatures(task);
    const score = this.calculateComplexity(features);

    if (score < 0.3) return ModelTier.FAST;
    if (score < 0.7) return ModelTier.BALANCED;
    return ModelTier.POWERFUL;
  }

  private calculateComplexity(features: TaskFeatures): number {
    let score = 0;

    // Facteurs de complexité
    if (features.mentionsArchitecture) score += 0.25;
    if (features.mentionsSecurity) score += 0.30;
    if (features.requiresMultiStep) score += 0.15;
    if (features.hasCodeBlocks && features.promptLength > 500) score += 0.10;

    // Facteurs de simplicité
    if (features.isSimpleQuestion) score -= 0.30;
    if (features.isFormatting) score -= 0.20;

    return Math.max(0, Math.min(1, score));
  }

  // Cascade : escalade automatique si qualité insuffisante
  async executeWithCascade<T>(task: string, executor: (model: string) => Promise<{ value: T; quality: number }>): Promise<T> {
    const tiers = [ModelTier.FAST, ModelTier.BALANCED, ModelTier.POWERFUL];
    const startTier = await this.selectTier(task);

    for (let i = tiers.indexOf(startTier); i < tiers.length; i++) {
      const result = await executor(tiers[i]);
      if (result.quality >= 0.8 || i === tiers.length - 1) {
        return result.value;
      }
      console.log(`⬆️ Escalating ${tiers[i]} → ${tiers[i + 1]}`);
    }
    throw new Error('All tiers failed');
  }
}
```

| Type de Tâche | Tier | Coût/requête | Économie |
|---------------|:----:|:------------:|:--------:|
| "Quelle heure ?" | Fast | $0.001 | 97% |
| "Indente ce JSON" | Fast | $0.001 | 97% |
| "Écris une fonction" | Balanced | $0.02 | 33% |
| "Conçois l'architecture" | Powerful | $0.03 | 0% |

**Résultat Stanford** : 73% des requêtes peuvent utiliser le modèle le moins cher.

---

## 3. Deep Dive : Parallélisation des Outils (LLMCompiler)

### 3.1 Le Problème Séquentiel

```
Séquentiel : Read A → Read B → Read C → Edit D
             200ms    200ms    200ms    100ms = 700ms

Parallèle  : [Read A, Read B, Read C] → Edit D
                    200ms                100ms = 300ms
```

### 3.2 Implémentation par Graphe de Dépendances

```typescript
class ParallelExecutor {
  async executeTools(tools: ToolCall[]): Promise<ToolResult[]> {
    // 1. Construire le graphe de dépendances
    const graph = this.buildDependencyGraph(tools);

    // 2. Trier topologiquement (Kahn's algorithm)
    const levels = this.calculateLevels(graph);

    // 3. Exécuter niveau par niveau
    const results = new Map<string, ToolResult>();

    for (const level of levels) {
      // Exécution parallèle au sein du niveau
      const levelResults = await Promise.all(
        level.map(tool => this.execute(tool))
      );
      levelResults.forEach(r => results.set(r.toolId, r));
    }

    return tools.map(t => results.get(t.id)!);
  }

  private buildDependencyGraph(tools: ToolCall[]): DependencyGraph {
    const nodes = new Map<string, { tool: ToolCall; deps: Set<string> }>();

    for (const tool of tools) {
      nodes.set(tool.id, {
        tool,
        deps: new Set(this.findDependencies(tool, tools))
      });
    }

    return nodes;
  }

  private findDependencies(tool: ToolCall, allTools: ToolCall[]): string[] {
    // Edit dépend de Read du même fichier
    if (tool.name === 'Edit') {
      const readDeps = allTools
        .filter(t => t.name === 'Read' && t.params.path === tool.params.path)
        .map(t => t.id);
      return readDeps;
    }
    return [];
  }
}
```

**Résultat Berkeley** : 2.5x à 4.6x d'accélération sans perte de précision.

---

## 4. Edge Cases et Pièges

### Piège 1 : Routing incorrect dégrade la qualité

```typescript
// ❌ Tâche complexe envoyée au modèle rapide
const task = "Analyse les vulnérabilités de sécurité de ce code";
const tier = router.selectTier(task);  // → FAST (erreur!)

// ✅ Mots-clés de sécurité → tier puissant
private extractFeatures(task: string): TaskFeatures {
  return {
    mentionsSecurity: /security|vulnerab|exploit|auth|injection/i.test(task),
    // Si sécurité mentionnée, score += 0.30 → tier puissant
  };
}
```

**Contournement** : Mots-clés de domaines critiques (sécurité, architecture) forcent le tier puissant.

### Piège 2 : Parallélisation avec dépendances cachées

```typescript
// ❌ Paralléliser sans vérifier les dépendances
await Promise.all([
  exec('Edit', { path: 'a.ts' }),  // Besoin de lire a.ts d'abord!
  exec('Read', { path: 'a.ts' })
]);

// ✅ Graphe de dépendances explicite
const graph = buildDependencyGraph([
  { name: 'Read', params: { path: 'a.ts' } },   // Niveau 0
  { name: 'Edit', params: { path: 'a.ts' } }    // Niveau 1 (dépend de Read)
]);
```

**Contournement** : Toujours construire le graphe de dépendances avant parallélisation.

### Piège 3 : Cold start au premier usage d'un module

```typescript
// ❌ Premier appel PDF = 300ms de chargement
const processor = await moduleRegistry.get('PDFProcessor');

// ✅ Préchargement prédictif
ui.on('message', (msg) => {
  if (msg.includes('.pdf')) {
    // Précharger en arrière-plan
    setImmediate(() => moduleRegistry.get('PDFProcessor'));
  }
});
```

**Contournement** : Préchargement basé sur le contenu du message.

---

## 5. Optimisation : Filtrage Dynamique des Outils (Less-is-More)

Découverte contre-intuitive : **moins d'outils = meilleure précision**.

```typescript
class ToolFilter {
  private categories = new Map([
    ['file_ops', { tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'], triggers: ['file', 'read', 'write'] }],
    ['shell', { tools: ['Bash'], triggers: ['run', 'npm', 'git'] }],
    ['document', { tools: ['PDFProcessor', 'ExcelProcessor'], triggers: ['pdf', 'excel'] }],
    ['web', { tools: ['WebFetch', 'WebSearch'], triggers: ['url', 'search'] }]
  ]);

  filterTools(query: string, allTools: ToolDefinition[]): ToolDefinition[] {
    const relevant = new Set(['Read', 'Edit', 'Bash', 'Glob', 'Grep']);  // Base

    // Ajouter les outils des catégories détectées
    for (const [_, cat] of this.categories) {
      if (cat.triggers.some(t => query.toLowerCase().includes(t))) {
        cat.tools.forEach(t => relevant.add(t));
      }
    }

    const filtered = allTools.filter(t => relevant.has(t.name));
    console.log(`🔧 ${filtered.length}/${allTools.length} tools`);
    return filtered;
  }
}
```

| Métriques | 47 outils | 8 outils (filtré) | Amélioration |
|-----------|:---------:|:-----------------:|:------------:|
| Précision | 74% | 93% | **+26%** |
| Tokens/requête | 3,200 | 800 | **-75%** |
| Latence | 1.8s | 1.2s | **-33%** |

---

## 6. Lazy Loading : Démarrage en 37ms

```typescript
// ❌ Chargement synchrone (~3s)
import { PDFProcessor } from './pdf';     // 300ms
import { ExcelProcessor } from './excel'; // 250ms
// ... 50 imports

// ✅ Chargement différé (~37ms)
class ModuleRegistry {
  private cache = new Map();

  async get<T>(name: string): Promise<T> {
    if (this.cache.has(name)) return this.cache.get(name);

    const module = await this.load(name);
    this.cache.set(name, module);
    return module;
  }

  private async load(name: string): Promise<unknown> {
    switch (name) {
      case 'PDFProcessor':
        return (await import('./pdf')).PDFProcessor;
      case 'SemanticCache':
        return (await import('./cache')).SemanticCache;
      // ... autres modules
    }
  }
}

// Démarrage minimal
async function main() {
  const ui = await import('./ui');      // 20ms
  const agent = await import('./agent'); // 10ms
  // Prêt en ~37ms

  // Préchargement en arrière-plan
  setImmediate(() => moduleRegistry.get('SemanticCache'));
}
```

---

## Tableau Récapitulatif

| Optimisation | Technique | Impact | Risque |
|--------------|-----------|:------:|:------:|
| **Model Routing** | FrugalGPT | -68% coût | Moyen |
| **Parallélisation** | LLMCompiler | 3.8x speedup | Faible |
| **Tool Filtering** | Less-is-More | +26% précision | Moyen |
| **Lazy Loading** | Import dynamique | -98% startup | Faible |
| **Streaming** | Affichage progressif | -65% latence perçue | Faible |

| Métrique | Avant | Après | Amélioration |
|----------|:-----:|:-----:|:------------:|
| Coût/session | $2.50 | $0.75 | **-70%** |
| Latence moyenne | 4.2s | 1.5s | **-64%** |
| Startup | 3.0s | 37ms | **-99%** |
| Précision | 74% | 93% | **+26%** |

---

## Ce Qui Vient Ensuite

L'agent est rapide et économique, mais chaque session repart de zéro. Le **Chapitre 14** introduit l'apprentissage persistant : comment un agent peut se souvenir de vos préférences et apprendre de ses erreurs.

---

[Chapitre 12](12-optimisations-cognitives.md) | [Table des Matières](README.md) | [Chapitre 14](14-apprentissage-persistant.md)
