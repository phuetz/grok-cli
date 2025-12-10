# Chapitre 5 : MCTS — Simuler Avant d'Agir

---

## 1. Le Problème

ToT évalue les pistes **localement** : "cette pensée semble bonne". Mais une pensée qui semble bonne peut mener à une impasse. Résultat : 87 branches explorées, la bonne était la 3ème. 84 appels API gaspillés.

**L'erreur classique** : Évaluer une piste par son apparence au lieu de simuler où elle mène. C'est comme juger un coup d'échecs sans réfléchir aux 3 coups suivants.

```typescript
// ❌ ToT : évaluation locale
const score = await evaluate("Vérifier si le fichier existe");  // Score: 0.8
// Mais cette piste mène à une impasse — le fichier existe déjà !

// ✅ MCTS : simulation jusqu'au bout
const score = await simulate("Vérifier si le fichier existe");
// Simule : exists? → oui → impasse → Score: 0.1
```

---

## 2. La Solution Rapide : MCTS en 60 Lignes

```typescript
interface MCTSNode {
  action: string;
  visits: number;
  totalReward: number;
  children: MCTSNode[];
  parent: MCTSNode | null;
}

const C = Math.sqrt(2);  // Constante d'exploration UCB1

function ucb1(node: MCTSNode, parentVisits: number): number {
  if (node.visits === 0) return Infinity;  // Nœud jamais visité = prioritaire
  const exploitation = node.totalReward / node.visits;
  const exploration = C * Math.sqrt(Math.log(parentVisits) / node.visits);
  return exploitation + exploration;
}

async function mcts(problem: string, iterations = 50): Promise<string> {
  const root: MCTSNode = { action: 'root', visits: 0, totalReward: 0, children: [], parent: null };

  for (let i = 0; i < iterations; i++) {
    // 1. SELECT - Descendre vers le nœud le plus prometteur
    let node = root;
    while (node.children.length > 0) {
      node = node.children.reduce((best, child) =>
        ucb1(child, node.visits) > ucb1(best, node.visits) ? child : best
      );
    }

    // 2. EXPAND - Ajouter un nouvel enfant
    if (node.visits > 0) {
      const newActions = await generateActions(node, problem);
      node.children = newActions.map(action => ({
        action, visits: 0, totalReward: 0, children: [], parent: node
      }));
      node = node.children[0];  // Descendre dans le premier enfant
    }

    // 3. SIMULATE - Rollout jusqu'à la fin
    const reward = await simulate(node, problem);

    // 4. BACKPROPAGATE - Remonter le score
    let current: MCTSNode | null = node;
    while (current) {
      current.visits++;
      current.totalReward += reward;
      current = current.parent;
    }
  }

  // Retourner l'action la plus visitée (pas le meilleur score moyen)
  const bestChild = root.children.reduce((best, child) =>
    child.visits > best.visits ? child : best
  );
  return bestChild.action;
}

async function simulate(node: MCTSNode, problem: string): Promise<number> {
  const path = [];
  let current: MCTSNode | null = node;
  while (current?.parent) {
    path.unshift(current.action);
    current = current.parent;
  }

  const response = await llm.chat(`
    Problème: ${problem}
    Chemin actuel: ${path.join(' → ')}

    Continue cette approche jusqu'à la résolution.
    À la fin, donne un SCORE de 0 à 1 (0=échec, 1=résolu).
  `);

  const match = response.match(/SCORE:\s*([\d.]+)/i);
  return match ? parseFloat(match[1]) : 0.5;
}
```

---

## 3. Deep Dive : Les 4 Phases de MCTS

### Phase 1 : SELECT (Descendre avec UCB1)

UCB1 balance **exploitation** (aller vers ce qui marche) et **exploration** (essayer les chemins peu visités) :

```
UCB1 = (reward/visits) + C × √(ln(parent_visits) / visits)
       ↑ exploitation      ↑ exploration
```

| Situation | Comportement |
|-----------|--------------|
| Nœud jamais visité | UCB1 = ∞ → exploré en priorité |
| Nœud très visité, bon score | Exploitation domine |
| Nœud peu visité | Exploration domine |

### Phase 2 : EXPAND (Ajouter des enfants)

Quand on atteint un nœud déjà visité, on génère ses enfants :

```typescript
async function generateActions(node: MCTSNode, problem: string): Promise<string[]> {
  const response = await llm.chat(`
    Problème: ${problem}
    État actuel: ${node.action}
    Génère 3-4 actions possibles pour avancer.
    Format JSON: ["action1", "action2", ...]
  `);
  return JSON.parse(response);
}
```

### Phase 3 : SIMULATE (Rollout)

La différence clé avec ToT : on simule jusqu'à la **fin**, pas juste l'étape suivante.

```typescript
// ToT : "Cette pensée semble bonne" (local)
// MCTS : "Cette pensée MÈNE à une solution" (global)
```

### Phase 4 : BACKPROPAGATE (Remonter les scores)

Chaque nœud du chemin reçoit le reward de la simulation :

```
Simulation → reward = 0.9
         ↓
    [root] visits++ totalReward += 0.9
         ↓
    [node A] visits++ totalReward += 0.9
         ↓
    [node B] visits++ totalReward += 0.9
```

---

## 4. Edge Cases et Pièges

### Piège 1 : Simulations trop coûteuses

```typescript
// ❌ 100 simulations × appel LLM = $5-10
const result = await mcts(problem, { iterations: 100 });

// ✅ Limiter les simulations, utiliser un modèle rapide
const result = await mcts(problem, {
  iterations: 30,
  simulationModel: 'gpt-4o-mini'  // 10x moins cher que GPT-4
});
```

**Contournement** : Utiliser un modèle moins cher pour les simulations.

### Piège 2 : Simulations qui ne terminent jamais

```typescript
// ❌ Le LLM peut générer des simulations infinies
const response = await llm.chat("Simule jusqu'à résolution");
// Réponse : 500 lignes de réflexion sans jamais conclure

// ✅ Forcer une structure
const response = await llm.chat(`
  Simule en MAXIMUM 5 étapes. À la fin, OBLIGATOIRE:
  SCORE: [nombre entre 0 et 1]
`);
```

**Contournement** : Limiter les étapes et forcer le format de sortie.

### Piège 3 : UCB1 mal calibré

```typescript
// ❌ C trop petit = exploitation excessive (reste coincé)
const C = 0.1;

// ❌ C trop grand = exploration excessive (n'exploite jamais)
const C = 10;

// ✅ Valeur standard qui marche bien
const C = Math.sqrt(2);  // ~1.414
```

**Contournement** : Commencer avec `C = √2`, ajuster si nécessaire.

---

## 5. Optimisation : Rollout avec Exécution Réelle

Pour le code, au lieu de simuler avec le LLM, **exécutez vraiment** :

```typescript
async function executionRollout(node: MCTSNode, context: CodeContext): Promise<number> {
  // 1. Générer le code basé sur le chemin
  const code = await generateCode(node, context);

  try {
    // 2. Exécuter dans une sandbox
    await sandbox.execute(code, { timeout: 5000 });

    // 3. Lancer les tests
    const results = await runTests(context.testFile);

    // Score basé sur les tests passés
    return results.passed / results.total;

  } catch (error) {
    return 0.1;  // Erreur d'exécution = mauvais chemin
  }
}
```

**Avantage** : Feedback objectif, pas de biais du LLM.

**Coût** : Plus lent (exécution réelle), mais plus précis.

---

## Tableau Récapitulatif : ToT vs MCTS

| Aspect | ToT | MCTS |
|--------|-----|------|
| **Évaluation** | Locale (cette pensée) | Globale (où ça mène) |
| **Stratégie** | Beam Search | UCB1 |
| **Coût** | Branching^Depth | Iterations × Simulation |
| **Force** | Rapide, simple | Précis, évite les impasses |
| **Faiblesse** | Peut rater de bonnes pistes | Plus lent, plus cher |
| **Quand l'utiliser** | Bug simple, peu d'hypothèses | Problème complexe, beaucoup d'options |

---

## Configuration Recommandée

| Problème | Iterations | Modèle simulation | Coût estimé |
|----------|------------|-------------------|-------------|
| Bug simple | 20-30 | gpt-4o-mini | $0.05 |
| Bug complexe | 50 | gpt-4o-mini | $0.15 |
| Architecture | 50-100 | gpt-4o | $0.50-1.00 |
| Critique (prod) | 100+ | gpt-4o + tests réels | $2.00+ |

---

## Ce Qui Vient Ensuite

MCTS trouve de bonnes solutions, mais comment les **réparer** quand elles échouent ? Le **Chapitre 6** introduit ChatRepair : une boucle itérative qui apprend des erreurs précédentes (15% → 40% de succès).

---

[⬅️ Chapitre 4](04-tree-of-thought.md) | [📚 Table des Matières](README.md) | [➡️ Chapitre 6](06-repair-reflexion.md)
