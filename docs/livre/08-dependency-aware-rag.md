# Chapitre 8 : Dependency-Aware RAG — Le Contexte Complet

---

## 1. Le Problème

Votre RAG trouve `processPayment`, mais quand vous demandez "Quel est le type `PaymentResult` ?", il hallucine. Pourtant, `PaymentResult` est défini dans `types.ts`, juste à côté.

**L'erreur classique** : Le RAG trouve les fichiers demandés mais ignore leurs **dépendances**. `processPayment` importe `PaymentResult`, mais le RAG ne suit pas cet import.

```typescript
// src/payments/processor.ts
import { PaymentRequest, PaymentResult } from './types';  // ← RAG ignore cet import
import { StripeClient } from '../services/stripe';

export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  // ...
}

// Résultat : RAG retourne processor.ts mais pas types.ts ni stripe.ts
// Le LLM hallucine PaymentResult au lieu de le lire
```

---

## 2. La Solution Rapide : Expansion par Graphe

```typescript
interface DependencyNode {
  id: string;
  file: string;
  name: string;
  type: 'file' | 'function' | 'class' | 'type';
  imports: string[];      // Ce nœud importe...
  importedBy: string[];   // Ce nœud est importé par...
}

class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();

  // Construire le graphe depuis le codebase
  async build(directory: string): Promise<void> {
    const files = await glob(`${directory}/**/*.{ts,js}`);

    for (const file of files) {
      const ast = parse(await readFile(file, 'utf-8'));
      const imports = extractImports(ast);
      const exports = extractExports(ast);

      // Ajouter les nœuds
      for (const exp of exports) {
        this.nodes.set(`${file}:${exp.name}`, {
          id: `${file}:${exp.name}`,
          file,
          name: exp.name,
          type: exp.type,
          imports: imports.map(i => this.resolveImport(file, i)),
          importedBy: []
        });
      }
    }

    // Calculer les relations inverses (importedBy)
    for (const node of this.nodes.values()) {
      for (const imp of node.imports) {
        this.nodes.get(imp)?.importedBy.push(node.id);
      }
    }
  }

  // Expansion BFS : récupérer les dépendances jusqu'à profondeur N
  expand(startId: string, maxDepth = 2): DependencyNode[] {
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
    const result: DependencyNode[] = [];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node) continue;

      result.push(node);

      // Ajouter les dépendances sortantes
      for (const imp of node.imports) {
        queue.push({ id: imp, depth: depth + 1 });
      }
    }

    return result;
  }
}

// Utilisation avec RAG
async function ragWithDependencies(query: string, store: VectorStore, graph: DependencyGraph): Promise<Chunk[]> {
  // 1. RAG classique
  const initial = await store.similaritySearch(query, 5);

  // 2. Expansion par dépendances
  const expanded = new Set<string>();
  for (const chunk of initial) {
    const deps = graph.expand(`${chunk.file}:${chunk.name}`, 2);
    deps.forEach(d => expanded.add(d.id));
  }

  // 3. Récupérer le contenu des dépendances
  const allChunks = [...initial];
  for (const depId of expanded) {
    const chunk = store.getById(depId);
    if (chunk && !allChunks.includes(chunk)) {
      allChunks.push(chunk);
    }
  }

  return allChunks;
}
```

---

## 3. Deep Dive : Extraction des Dépendances

### 3.1 Parser les imports TypeScript

```typescript
import * as ts from 'typescript';

function extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const importClause = node.importClause;

      if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          imports.push({
            name: element.name.text,
            from: moduleSpecifier,
            type: 'named'
          });
        }
      }

      if (importClause?.name) {
        imports.push({
          name: importClause.name.text,
          from: moduleSpecifier,
          type: 'default'
        });
      }
    }
  });

  return imports;
}
```

### 3.2 Types de relations

| Relation | Exemple | Importance |
|----------|---------|:----------:|
| `import` | `import { X } from './Y'` | ⭐⭐⭐⭐⭐ |
| `type_reference` | `function f(): TypeX` | ⭐⭐⭐⭐ |
| `extends` | `class A extends B` | ⭐⭐⭐⭐⭐ |
| `implements` | `class A implements B` | ⭐⭐⭐⭐ |
| `call` | `B.method()` | ⭐⭐⭐ |

---

## 4. Edge Cases et Pièges

### Piège 1 : Explosion du graphe

```typescript
// ❌ Profondeur illimitée = récupérer tout le projet
const deps = graph.expand(startId, Infinity);
// 500 fichiers pour une seule requête

// ✅ Limiter la profondeur + budget
function expandWithBudget(startId: string, maxDepth = 2, maxNodes = 20): DependencyNode[] {
  const result: DependencyNode[] = [];
  // ... expansion BFS avec limite
  return result.slice(0, maxNodes);
}
```

**Contournement** : maxDepth=2 et maxNodes=20 couvrent 90% des cas.

### Piège 2 : Dépendances circulaires

```typescript
// A importe B, B importe A
// ❌ BFS naïf = boucle infinie

// ✅ Tracker les visités
const visited = new Set<string>();
if (visited.has(id)) continue;
visited.add(id);
```

**Contournement** : Toujours utiliser un Set de nœuds visités.

### Piège 3 : node_modules inclus

```typescript
// ❌ Expansion inclut les dépendances externes
graph.expand('UserService');
// Retourne : UserService, lodash, react, express... (inutile)

// ✅ Filtrer les dépendances externes
function isInternalImport(importPath: string): boolean {
  return importPath.startsWith('.') || importPath.startsWith('/src');
}
```

**Contournement** : Ignorer tout ce qui ne commence pas par `.` ou `/src`.

---

## 5. Optimisation : Cache du Graphe

Construire le graphe à chaque requête est coûteux. Persistez-le :

```typescript
class CachedDependencyGraph {
  private cacheFile = '.grok/dependency-graph.json';

  async load(): Promise<boolean> {
    if (!await exists(this.cacheFile)) return false;

    const cached = JSON.parse(await readFile(this.cacheFile, 'utf-8'));
    const cacheAge = Date.now() - cached.timestamp;

    // Cache valide 1 heure
    if (cacheAge > 60 * 60 * 1000) return false;

    this.nodes = new Map(cached.nodes);
    return true;
  }

  async save(): Promise<void> {
    await writeFile(this.cacheFile, JSON.stringify({
      timestamp: Date.now(),
      nodes: [...this.nodes.entries()]
    }));
  }

  // Mise à jour incrémentale : seulement les fichiers modifiés
  async updateIncremental(): Promise<void> {
    const modified = await getModifiedFiles(this.lastUpdate);
    for (const file of modified) {
      await this.reindexFile(file);
    }
    await this.save();
  }
}
```

**Économie** : Construction initiale ~10s, mise à jour incrémentale ~100ms.

---

## Tableau Récapitulatif : RAG vs Dependency-Aware RAG

| Aspect | RAG Classique | Dependency-Aware |
|--------|---------------|------------------|
| **Trouve** | Fichier demandé | + imports + types |
| **Contexte** | Isolé | Complet |
| **Précision** | 70% | 92% |
| **Coût tokens** | 1x | 1.5-2x |
| **Complexité** | Simple | Moyenne |

**ROI** : +50% de tokens pour +22% de précision. Rentable pour les questions sur le code.

---

## Ce Qui Vient Ensuite

Maintenant que vous récupérez le bon contexte, comment éviter d'exploser votre budget tokens ? Le **Chapitre 9** introduit la compression de contexte : économiser 70% de tokens tout en améliorant la qualité.

---

[⬅️ Chapitre 7](07-rag-moderne.md) | [📚 Table des Matières](README.md) | [➡️ Chapitre 9](09-context-compression.md)
