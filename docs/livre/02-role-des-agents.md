# Chapitre 2 : Agent, Assistant ou Chatbot — Le Test en 30 Secondes

---

## 1. Le Problème

Tout le monde prétend avoir un "agent IA". Startups, produits établis, projets open-source — le terme est devenu le nouveau "blockchain". Résultat : vous ne savez plus ce que vous construisez ni ce que vous achetez.

**L'erreur classique** : Vous passez 3 semaines à architecturer un système multi-agents alors qu'un simple appel API avec 2 outils aurait suffi. Ou l'inverse : vous bricolez un chatbot qui finit par avoir besoin de 47 `if/else` pour gérer les cas edge parce que vous n'avez pas identifié que c'était un problème agentique.

---

## 2. La Solution Rapide : Le Test de Classification

```typescript
// En 30 secondes : déterminez ce dont vous avez besoin
function classifySystem(requirements: string[]): SystemType {
  const needsTools = requirements.some(r =>
    r.includes('modifier') || r.includes('exécuter') || r.includes('créer')
  );
  const needsAutonomousLoop = requirements.some(r =>
    r.includes('jusqu\'à ce que') || r.includes('automatiquement') || r.includes('corriger')
  );
  const needsMultipleRoles = requirements.some(r =>
    r.includes('revue') || r.includes('vérification croisée') || r.includes('équipe')
  );

  if (needsMultipleRoles) return 'MULTI_AGENT';      // Niveau 4
  if (needsAutonomousLoop) return 'AGENT';           // Niveau 3
  if (needsTools) return 'ASSISTANT';                // Niveau 2
  return 'CHATBOT';                                  // Niveau 1
}

// Exemples concrets
classifySystem(['répondre à des questions sur le code']);           // → CHATBOT
classifySystem(['suggérer des modifications', 'lire des fichiers']); // → ASSISTANT
classifySystem(['corriger les tests jusqu\'à ce qu\'ils passent']);  // → AGENT
classifySystem(['un dev code, un autre review']);                    // → MULTI_AGENT
```

**La règle d'or** : Qui contrôle la boucle d'exécution ?
- **Chatbot** : L'humain pose une question → réponse → fin
- **Assistant** : L'humain valide chaque action suggérée
- **Agent** : La machine itère jusqu'à résolution (supervisée)
- **Multi-Agent** : Plusieurs machines collaborent

---

## 3. Deep Dive : Les 4 Niveaux

### Niveau 1 : Chatbot — Pas d'outils, pas de mémoire

```typescript
// Architecture : Request → LLM → Response. C'est tout.
const response = await llm.chat([
  { role: 'user', content: 'Explique ce code' }
]);
// Le modèle répond. Vous copiez-collez. C'est vous qui faites le travail.
```

**Analogie technique** : Une fonction pure sans side-effects. Input → Output.

### Niveau 2 : Assistant — Outils supervisés

```typescript
// L'assistant a des outils, mais VOUS validez chaque action
const tools = [
  { name: 'read_file', execute: (path) => fs.readFileSync(path) },
  { name: 'search_code', execute: (query) => grep(query) }
];

// Copilot suggère → VOUS appuyez Tab
// ChatGPT génère un script → VOUS décidez de l'exécuter
```

**Analogie technique** : Transaction avec confirmation manuelle. `BEGIN → ... → COMMIT` (par l'humain).

### Niveau 3 : Agent — Boucle autonome supervisée

```typescript
// L'agent contrôle la boucle, vous supervisez le résultat final
async function agentLoop(task: string, maxIterations = 15): Promise<void> {
  let iteration = 0;

  while (iteration < maxIterations) {
    // THINK: Raisonnement
    const plan = await llm.reason(task, context);

    // ACT: Exécution (sans vous demander à chaque étape)
    const result = await executeAction(plan.action);

    // OBSERVE: Évaluation
    if (await evaluateSuccess(result, task)) {
      return; // Objectif atteint
    }

    // AUTO-CORRECT: Ajustement
    context.addObservation(result);
    iteration++;
  }
}
```

**Analogie technique** : Un worker process avec retry automatique et circuit breaker.

### Niveau 4 : Multi-Agent — Collaboration distribuée

```typescript
// Plusieurs agents spécialisés qui se passent le relais
const developer = new Agent({ role: 'developer', tools: devTools });
const reviewer = new Agent({ role: 'reviewer', tools: reviewTools });
const tester = new Agent({ role: 'tester', tools: testTools });

// Pipeline de collaboration
const code = await developer.implement(spec);
const feedback = await reviewer.review(code);
const fixedCode = await developer.fix(code, feedback);
const testResults = await tester.validate(fixedCode);
```

**Analogie technique** : Microservices avec message queue. Chaque service a sa responsabilité.

---

## 4. Edge Cases et Pièges

### Piège 1 : L'agent qui n'en est pas un

```typescript
// ❌ Ceci N'EST PAS un agent, c'est un assistant déguisé
async function fakeAgent(task: string): Promise<string> {
  const suggestion = await llm.chat([{ role: 'user', content: task }]);
  console.log('Voulez-vous exécuter cette action ? (o/n)');  // ← Validation humaine
  const confirm = await readline();
  if (confirm === 'o') {
    return executeAction(suggestion);
  }
  return 'Annulé';
}
// Si l'humain intervient à CHAQUE étape, c'est un assistant.
```

**Contournement** : Ajoutez une vraie boucle d'itération avec auto-évaluation.

### Piège 2 : Le multi-agent prématuré

```typescript
// ❌ Over-engineering : 3 agents pour une tâche simple
const planner = new Agent({ role: 'planner' });
const executor = new Agent({ role: 'executor' });
const validator = new Agent({ role: 'validator' });

// Pour juste "ajouter un console.log" ? Ridicule.
```

**Contournement** : Commencez TOUJOURS par un agent unique. Ajoutez des agents quand :
- Vous avez besoin de vérification croisée (code review automatique)
- Les tâches sont parallélisables (tester + documenter simultanément)
- Les rôles ont des prompts/outils radicalement différents

### Piège 3 : Confondre autonomie et intelligence

```typescript
// L'agent est autonome mais peut être stupide
async function autonomeStupide(task: string): Promise<void> {
  while (true) {  // Autonome ✓
    const action = await llm.decide(task);  // Mais sans évaluation...
    await execute(action);  // ... il répète les mêmes erreurs
    // Pas d'observation, pas d'apprentissage → boucle infinie coûteuse
  }
}
```

**Contournement** : Le pattern ReAct (Reason → Act → Observe) est non-négociable.

---

## 5. Optimisation : Choisir le Bon Niveau = Économiser

| Niveau | Coût moyen/tâche | Quand l'utiliser |
|--------|------------------|------------------|
| Chatbot | $0.001 - $0.01 | Questions simples, brainstorming |
| Assistant | $0.01 - $0.10 | Suggestions avec validation humaine |
| Agent | $0.10 - $5.00 | Tâches de 5-30 min automatisables |
| Multi-Agent | $1.00 - $50.00 | Projets complexes, pipelines CI/CD |

**La règle** : Ne sur-architecturez pas. Un agent qui fait 15 appels LLM pour une tâche qu'un assistant ferait en 2 (avec une validation humaine de 10 secondes) vous coûte 7x plus cher pour un gain de temps négatif.

```typescript
// Calcul rapide : vaut-il le coût ?
function shouldUseAgent(task: TaskSpec): boolean {
  const humanTime = task.estimatedHumanMinutes;
  const agentCost = task.estimatedTokens * COST_PER_TOKEN;
  const humanCost = humanTime * HOURLY_RATE / 60;

  // Un agent doit économiser au moins 2x le coût humain
  return agentCost < humanCost / 2;
}
```

---

## Tableau Comparatif Final

| Critère | Chatbot | Assistant | Agent | Multi-Agent |
|---------|---------|-----------|-------|-------------|
| **Outils** | 0 | 1-5 | 10-50+ | Spécialisés/rôle |
| **Boucle** | 1 échange | N échanges validés | Auto (supervisé) | Distribué |
| **Mémoire** | Session | + Documents | Persistante | Partagée |
| **Erreurs** | Vous les gérez | Vous les corrigez | Auto-corrige | Escalade |
| **Exemples** | ChatGPT vanilla | Copilot, Cursor | Claude Code, Code Buddy | MetaGPT, CrewAI |
| **Setup** | 5 min | 30 min | 2-4 heures | 1-2 jours |

---

## Ce Qui Vient Ensuite

Maintenant que vous savez quel type de système vous construisez, le **Chapitre 3** détaille les 6 composants architecturaux d'un vrai agent : Orchestrateur, Raisonnement, Mémoire, Action, Apprentissage, Sécurité.

---

[⬅️ Chapitre 1](01-premier-agent.md) | [📚 Table des Matières](README.md) | [➡️ Chapitre 3](03-anatomie-agent.md)
