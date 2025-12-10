# Chapitre 4 : Tree-of-Thought — Quand le Raisonnement Linéaire Échoue

---

## 1. Le Problème

Votre agent propose des solutions au hasard. Il essaie une chose, ça échoue, il essaie autre chose sans rapport. Comme un gamin qui appuie sur tous les boutons.

**L'erreur classique** : Le LLM génère token par token. S'il s'engage sur une mauvaise piste au token 50, il continue jusqu'au bout. Pas de retour en arrière possible. Résultat : 4 tentatives de fix, 4 échecs, 0 apprentissage entre les tentatives.

```typescript
// ❌ Raisonnement linéaire : une seule piste à la fois
const fix1 = await llm.chat("Bug: NaN. Fix?");     // "Ajoute un try/catch"
// Échec
const fix2 = await llm.chat("Toujours NaN. Fix?"); // "Vérifie les types" (sans lien avec fix1)
// Échec
const fix3 = await llm.chat("Encore NaN. Fix?");   // "Utilise parseInt" (random)
// L'agent ne CONSTRUIT PAS sur ses échecs
```

---

## 2. La Solution Rapide : ToT en 50 Lignes

```typescript
interface ThoughtNode {
  content: string;
  score: number;      // 0-1, promesse de cette piste
  children: ThoughtNode[];
}

async function treeOfThought(problem: string, options = {
  branching: 3,       // Hypothèses par niveau
  depth: 3,           // Profondeur max
  beamWidth: 2        // Garder les N meilleures
}): Promise<string> {

  // Générer les hypothèses initiales
  let currentLevel: ThoughtNode[] = await generateHypotheses(problem, options.branching);

  // Évaluer et scorer
  for (const node of currentLevel) {
    node.score = await evaluate(node.content, problem);
  }

  // Beam Search : explorer niveau par niveau
  for (let d = 0; d < options.depth; d++) {
    // Garder les meilleures pistes
    currentLevel.sort((a, b) => b.score - a.score);
    const best = currentLevel.slice(0, options.beamWidth);

    // Early stopping : solution trouvée ?
    if (best[0].score > 0.95) {
      return best[0].content;
    }

    // Développer chaque piste
    const nextLevel: ThoughtNode[] = [];
    for (const node of best) {
      const children = await expand(node, problem, options.branching);
      for (const child of children) {
        child.score = await evaluate(child.content, problem);
      }
      nextLevel.push(...children);
    }

    currentLevel = nextLevel;
  }

  // Retourner la meilleure solution trouvée
  return currentLevel.sort((a, b) => b.score - a.score)[0].content;
}

async function generateHypotheses(problem: string, n: number): Promise<ThoughtNode[]> {
  const response = await llm.chat(`
    Problème: ${problem}
    Génère ${n} hypothèses DISTINCTES pour résoudre ce problème.
    Format JSON: [{"content": "hypothèse 1"}, ...]
  `);
  return JSON.parse(response);
}

async function evaluate(thought: string, problem: string): Promise<number> {
  const response = await llm.chat(`
    Problème: ${problem}
    Pensée: ${thought}
    Score de 0 à 1 (0=hors sujet, 1=solution). Réponds UNIQUEMENT un nombre.
  `);
  return parseFloat(response);
}

async function expand(node: ThoughtNode, problem: string, n: number): Promise<ThoughtNode[]> {
  const response = await llm.chat(`
    Problème: ${problem}
    Piste actuelle: ${node.content}
    Développe ${n} sous-hypothèses pour aller plus loin.
    Format JSON: [{"content": "sous-hypothèse 1"}, ...]
  `);
  return JSON.parse(response);
}
```

---

## 3. Deep Dive : Les 3 Stratégies de Recherche

### BFS (Breadth-First Search)

```
Niveau 1: [A, B, C] → évaluer tous
Niveau 2: [A1, A2, B1, B2, C1, C2] → évaluer tous
...
```

**Quand l'utiliser** : Vous ne savez pas du tout où est la solution. Exploration exhaustive.

**Coût** : `branching^depth` appels. Avec B=3, D=4 → 81 appels (~$0.40)

### DFS (Depth-First Search)

```
A → A1 → A1a → A1a1 (impasse)
    ↩ A1b → Solution!
```

**Quand l'utiliser** : Une solution existe sûrement dans une des branches. Économe en mémoire.

**Piège** : Peut s'enliser dans une impasse pendant longtemps.

### Beam Search (Recommandé)

```
Niveau 1: [A=0.8, B=0.6, C=0.4] → garder [A, B]
Niveau 2: [A1=0.9, A2=0.7, B1=0.5, B2=0.3] → garder [A1, A2]
...
```

**Quand l'utiliser** : Meilleur compromis qualité/coût. C'est ce que vous voulez 90% du temps.

**Coût** : `branching × beamWidth × depth` appels. Avec B=3, K=2, D=4 → 24 appels (~$0.12)

---

## 4. Edge Cases et Pièges

### Piège 1 : Évaluation qui favorise le verbeux

```typescript
// ❌ Le LLM donne des scores élevés aux réponses longues
const thought1 = "Vérifier les null";           // Score: 0.6
const thought2 = "Il faudrait implémenter une vérification exhaustive..."; // Score: 0.85

// ✅ Forcer une évaluation structurée
const prompt = `
  Évalue sur 3 critères (0-1 chacun):
  1. Pertinence directe au problème
  2. Actionnable immédiatement
  3. Probabilité de résoudre le bug
  Score final = moyenne des 3
`;
```

**Contournement** : Utiliser des critères explicites, pas juste "note de 0 à 1".

### Piège 2 : Branches prometteuses abandonnées

```typescript
// ❌ Beam=2 élimine la bonne piste à cause d'une mauvaise évaluation
// Niveau 1: [A=0.7, B=0.65, C=0.9]  → garder [A, C]
// Mais B était la bonne piste !

// ✅ Garder un "wildcard" aléatoire
const best = currentLevel.slice(0, beamWidth - 1);
const random = currentLevel[Math.floor(Math.random() * currentLevel.length)];
const selected = [...best, random];
```

**Contournement** : Ajouter de l'exploration forcée (température, wildcard).

### Piège 3 : Explosion des coûts

```typescript
// ❌ Configuration agressive
const config = { branching: 5, depth: 5, beamWidth: 4 };
// = 5 × 4 × 5 = 100 appels par niveau × 5 niveaux = 500 appels !

// ✅ Configuration raisonnable
const config = { branching: 3, depth: 3, beamWidth: 2 };
// = 3 × 2 × 3 = 18 appels total
```

**Contournement** : Commencer petit, augmenter si nécessaire.

---

## 5. Optimisation : Évaluation Batch

Au lieu d'évaluer une pensée à la fois (N appels), évaluez-les toutes en un appel :

```typescript
// ❌ 6 appels pour 6 pensées
for (const thought of thoughts) {
  thought.score = await evaluate(thought);  // 1 appel chacun
}

// ✅ 1 appel pour 6 pensées
async function batchEvaluate(thoughts: ThoughtNode[], problem: string): Promise<void> {
  const response = await llm.chat(`
    Problème: ${problem}

    Évalue ces ${thoughts.length} pensées de 0 à 1:
    ${thoughts.map((t, i) => `${i+1}. ${t.content}`).join('\n')}

    Format JSON: [0.8, 0.6, 0.9, ...]
  `);

  const scores = JSON.parse(response);
  thoughts.forEach((t, i) => t.score = scores[i]);
}
```

**Économie** : 6x moins d'appels API. Sur un arbre complet, ça peut passer de $1.30 à $0.25.

---

## Tableau Récapitulatif : Quand Utiliser ToT

| Situation | Stratégie | Config | Coût estimé |
|-----------|-----------|--------|-------------|
| Bug simple, 1 hypothèse évidente | **Pas de ToT** | - | $0.01 |
| Bug avec 2-3 pistes possibles | BFS shallow | B=3, D=2 | $0.05 |
| Bug complexe, debug actif | Beam Search | B=3, D=3, K=2 | $0.15 |
| Architecture, plusieurs alternatives | Beam large | B=4, D=4, K=3 | $0.50 |
| Problème critique, budget illimité | BFS deep | B=4, D=5 | $2.00+ |

**Règle** : ToT est un investissement. N'utilisez-le que si la valeur du problème justifie le coût. Pour un bug de prod critique, 50 appels valent le coup. Pour formater du JSON, c'est du gaspillage.

---

## Ce Qui Vient Ensuite

ToT explore plusieurs pistes mais ne simule pas les conséquences. Le **Chapitre 5** introduit MCTS (Monte-Carlo Tree Search) : simuler des exécutions pour choisir la meilleure action.

---

[⬅️ Chapitre 3](03-anatomie-agent.md) | [📚 Table des Matières](README.md) | [➡️ Chapitre 5](05-mcts.md)
