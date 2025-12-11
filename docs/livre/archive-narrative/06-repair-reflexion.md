# 🔧 Chapitre 6 : Repair, Réflexion et Auto-Amélioration

---

## 🎬 Scène d'ouverture : La Cinquième Tentative Identique

*Lundi matin. Lina observait son terminal avec un mélange de frustration et de fascination morbide.*

*L'agent venait d'échouer pour la cinquième fois sur le même bug. Et, plus frustrant encore, il avait généré exactement le même code incorrect à chaque tentative.*

**Lina** *(montrant l'écran)* : "Regarde. Regarde ça, Marc."

*Marc posa son café et se pencha.*

```
Tentative 1: if (user) return user.name;  → FAIL: Cannot read property 'name'
Tentative 2: if (user) return user.name;  → FAIL: Cannot read property 'name'
Tentative 3: if (user) return user.name;  → FAIL: Cannot read property 'name'
Tentative 4: if (user) return user.name;  → FAIL: Cannot read property 'name'
Tentative 5: if (user) return user.name;  → FAIL: Cannot read property 'name'
```

**Marc** : "Il... il a généré exactement le même code ? Cinq fois ?"

**Lina** : "Cinq fois. Même code. Même erreur. Même résultat."

**Marc** : "Il ne lit pas les messages d'erreur ?"

**Lina** : "Techniquement, si. Ils sont dans le contexte. Mais il ne les **utilise** pas. Il ne fait pas le lien entre 'Cannot read property name' et le fait que user pourrait être un objet vide."

*Elle se renversa dans sa chaise.*

**Lina** : "C'est comme un étudiant qui refait exactement la même erreur à chaque examen. On lui montre la correction, il hoche la tête, et il refait la même erreur."

**Marc** *(souriant)* : "C'est comme ça que je debuggais quand j'avais 15 ans. Recompiler en espérant que ça marche cette fois."

**Lina** : "La définition de la folie selon Einstein — refaire la même chose en espérant un résultat différent."

*Elle ouvrit un nouvel onglet.*

**Lina** : "J'ai lu un papier là-dessus ce week-end. ChatRepair, publié à ISSTA 2024. Ils avaient exactement le même problème."

**Marc** : "Et ?"

**Lina** : "Ils ont trouvé que le problème n'est pas la capacité du modèle — c'est le **feedback**. Quand on dit juste 'ça a échoué', le modèle n'a aucune information pour s'améliorer."

*Elle dessina un diagramme sur son carnet.*

**Lina** : "Leur solution : donner un feedback structuré. Pas juste 'erreur', mais 'voici l'erreur exacte, voici ce que tu as déjà essayé, voici pourquoi chaque tentative a échoué, et voici ce qui est DIFFÉRENT cette fois'."

**Marc** : "Forcer le modèle à ne pas répéter ses erreurs."

**Lina** *(hochant la tête)* : "Une **boucle de réparation itérative**. Pas du réessai aveugle — de l'apprentissage."

*Elle ouvrit son IDE.*

**Lina** : "Et devine quoi ? Leur taux de succès est passé de 15% à 40%. Presque trois fois mieux."

**Marc** : "Juste en changeant le feedback ?"

**Lina** : "Juste en changeant le feedback. Le modèle était déjà capable — il lui manquait juste l'information pour apprendre de ses erreurs."

---

## 📊 6.1 Le Problème de la Réparation Single-Shot

### 6.1.1 📈 Les Statistiques Qui Font Réfléchir

Sur les benchmarks standards comme SWE-bench, les résultats single-shot sont décevants :

![Single-Shot vs Iterative Success généré par Nanobanana](images/single_shot_vs_iterative.svg)

### 6.1.2 🔄 Réessayer ≠ Réparer

Le problème n'est pas de réessayer — c'est de réessayer **intelligemment** :

![Regenerate vs Repair](images/regenerate-vs-repair.svg)

> 💡 **Analogie humaine** : Quand vous debuggez, vous ne réécrivez pas aveuglément le même code. Vous lisez l'erreur, vous comprenez ce qui s'est passé, et vous ajustez votre approche. ChatRepair donne cette capacité aux LLMs.

---

## 🔄 6.2 L'Architecture ChatRepair

### 6.2.1 🏗️ Vue d'Ensemble

ChatRepair (publié à ISSTA 2024) propose une boucle de réparation guidée par les tests :

![Boucle ChatRepair générée par Nanobanana](images/chatrepair_loop.svg)

### 6.2.2 📋 Les Trois Composants Clés

| 🔧 Composant | 🎯 Rôle | ⚙️ Technique |
|:-------------|:--------|:-------------|
| **Fault Localization** | Identifier où se trouve le bug | Ochiai, DStar, coverage, stack trace |
| **Patch Generation** | Proposer un correctif | LLM avec contexte ciblé + historique |
| **Test Validation** | Vérifier le correctif | Exécution des tests, analyse des résultats |

---

## 🔍 6.3 Fault Localization : Trouver le Bug

### 6.3.1 🎯 Pourquoi C'est Crucial

La localisation précise du bug est **déterminante** pour la qualité de la réparation :

![Impact de la localisation](images/localization-impact.svg)

### 6.3.2 📐 Spectrum-Based Fault Localization (SBFL)

SBFL utilise la **couverture de code des tests** pour identifier les lignes suspectes :

![SBFL Matrix générée par Nanobanana](images/sbfl_matrix.svg)

### 6.3.3 🧮 Formules de Suspicion

Trois formules courantes pour calculer le score de suspicion :

| 🏷️ Formule | 🧮 Calcul | 📊 Caractéristique |
|:-----------|:----------|:-------------------|
| **Ochiai** | `ef / √((ef+ep) × (ef+nf))` | Bon équilibre précision/rappel |
| **DStar** | `ef² / (ep + nf)` | Haute précision, penalise les lignes passantes |
| **Tarantula** | `(ef/totalFail) / ((ef/totalFail) + (ep/totalPass))` | Équilibré, historique |

Où :
- `ef` = exécutée par tests **failed**
- `ep` = exécutée par tests **passed**
- `nf` = **non** exécutée par tests failed

```typescript
// src/agent/repair/fault-localization.ts
function ochiai(ef: number, ep: number, totalFailed: number): number {
  if (ef === 0) return 0;
  return ef / Math.sqrt((ef + ep) * totalFailed);
}

function dstar(ef: number, ep: number, nf: number, star: number = 2): number {
  const denominator = ep + nf;
  if (denominator === 0) return 0;
  return Math.pow(ef, star) / denominator;
}
```

### 6.3.4 🤖 Localisation par LLM

Quand la coverage n'est pas disponible, le LLM peut localiser :

```typescript
async function llmLocalize(
  error: string,
  stackTrace: string,
  relevantFiles: string[]
): Promise<LineSuspicion[]> {
  const prompt = `
    Tu es un expert en debugging. Analyse cette erreur.

    ## Erreur
    ${error}

    ## Stack trace
    ${stackTrace}

    ## Fichiers potentiellement concernés
    ${relevantFiles.map(f => `- ${f}`).join('\n')}

    Identifie les 3 endroits les plus probables du bug.

    Format JSON :
    [
      { "file": "...", "line": ..., "suspicion": 0.X, "reason": "..." },
      ...
    ]
  `;

  const response = await llm.complete(prompt, { temperature: 0 });
  return JSON.parse(response);
}
```

### 6.3.5 🔀 Combinaison des Techniques

En pratique, on combine plusieurs sources avec des poids :

| 📊 Source | ⚖️ Poids | 📝 Raison |
|:----------|:---------|:----------|
| Stack trace | 0.9 | Très fiable quand disponible |
| SBFL (Ochiai/DStar) | 0.8 | Objectif, basé sur les tests |
| LLM | 0.7 | Flexible, mais peut halluciner |

---

## 🔧 6.4 Patch Generation : Générer le Correctif

### 6.4.1 📋 Contexte Minimal mais Suffisant

Le secret d'une bonne génération : donner au LLM **exactement** ce dont il a besoin.

```typescript
function buildRepairContext(
  suspicion: LineSuspicion,
  error: TestError,
  codebase: Codebase
): RepairContext {
  return {
    // Le code suspect avec contexte (±10 lignes)
    suspiciousCode: codebase.getLines(
      suspicion.file,
      suspicion.line - 10,
      suspicion.line + 10
    ),

    // Types et imports pertinents
    imports: codebase.getImports(suspicion.file),
    types: codebase.getReferencedTypes(suspiciousCode),

    // Le test qui échoue
    failingTest: error.testCode,

    // L'erreur exacte
    errorMessage: error.message,

    // Tentatives précédentes (crucial !)
    previousAttempts: []
  };
}
```

### 6.4.2 📝 Prompt de Réparation

```typescript
async function generatePatch(context: RepairContext): Promise<Patch> {
  const prompt = `
Tu es un expert en correction de bugs. Corrige le bug suivant.

## Code suspect (autour de la ligne ${context.lineNumber})
\`\`\`typescript
${context.suspiciousCode}
\`\`\`

## Erreur
${context.errorMessage}

## Test qui échoue
\`\`\`typescript
${context.failingTest}
\`\`\`

${context.previousAttempts.length > 0 ? `
## ⚠️ Tentatives précédentes (ont échoué)
${context.previousAttempts.map((a, i) => `
### Tentative ${i + 1}
Patch: ${a.patch}
Résultat: ${a.error}
`).join('\n')}

⚠️ Ne répète PAS ces erreurs. Essaie une approche DIFFÉRENTE.
` : ''}

## Instructions
1. Analyse la cause root du bug
2. Propose un correctif MINIMAL
3. Ne change que ce qui est nécessaire
4. Préserve le comportement pour les autres cas

## Format de réponse
\`\`\`diff
- ligne à supprimer
+ ligne à ajouter
\`\`\`

Explication courte :
`;

  return parsePatch(await llm.complete(prompt, { temperature: 0.3 }));
}
```

### 6.4.3 📚 Templates de Réparation

Certains patterns de bugs sont **très récurrents**. Grok-CLI maintient une bibliothèque de templates :

![Templates de réparation](images/repair-templates.svg)

```typescript
// src/agent/repair/repair-templates.ts
export const REPAIR_TEMPLATES: RepairTemplate[] = [
  {
    name: 'null_check',
    pattern: /cannot read propert.*of (undefined|null)/i,
    template: (ctx) => `if (${ctx.variable} == null) {
  return ${ctx.defaultValue ?? 'null'};
}`,
    confidence: 0.85
  },
  {
    name: 'division_guard',
    pattern: /division by zero|NaN|Infinity/i,
    template: (ctx) => `if (${ctx.divisor} === 0) {
  throw new Error('Division by zero');
}`,
    confidence: 0.90
  },
  {
    name: 'undefined_variable',
    pattern: /(\w+) is not defined/i,
    template: (ctx) => `const ${ctx.variable} = ${ctx.defaultValue ?? 'undefined'};`,
    confidence: 0.80
  },
  {
    name: 'import_error',
    pattern: /cannot find module/i,
    template: (ctx) => `import { ${ctx.symbol} } from '${ctx.module}';`,
    confidence: 0.95
  }
];
```

---

## 🔁 6.5 La Boucle de Réparation Complète

### 6.5.1 💻 Implémentation Grok-CLI

```typescript
// src/agent/repair/iterative-repair.ts
export class IterativeRepairEngine {
  private localizer: FaultLocalizer;
  private generator: PatchGenerator;
  private validator: TestValidator;
  private learning: RepairLearning;

  private maxIterations = 5;

  async repair(error: TestError, context: CodeContext): Promise<RepairResult> {
    const attempts: RepairAttempt[] = [];
    let currentError = error;

    for (let i = 0; i < this.maxIterations; i++) {
      console.log(`\n🔧 Iteration ${i + 1}/${this.maxIterations}`);

      // 1️⃣ LOCALISATION
      const suspicions = await this.localizer.localize(currentError, context);
      if (suspicions.length === 0) {
        return { success: false, reason: 'Cannot localize fault', attempts };
      }

      const topSuspicion = suspicions[0];
      console.log(`📍 Suspect: ${topSuspicion.file}:${topSuspicion.line}`);

      // 2️⃣ GÉNÉRATION
      const repairContext = this.buildContext(
        topSuspicion, currentError, context, attempts
      );

      // Vérifier les templates d'abord
      const template = findMatchingTemplate(currentError.message);
      let patch: Patch;

      if (template && template.confidence > 0.8 && i === 0) {
        patch = this.applyTemplate(template, repairContext);
        console.log(`📋 Using template: ${template.name}`);
      } else {
        patch = await this.generator.generate(repairContext);
        console.log(`🤖 Generated patch`);
      }

      // 3️⃣ APPLICATION
      const applied = await this.applyPatch(patch, context);
      if (!applied.success) {
        attempts.push({ patch, error: applied.error, iteration: i + 1 });
        continue;
      }

      // 4️⃣ VALIDATION
      const testResult = await this.validator.runTests(context.testFile);

      if (testResult.allPassed) {
        // 🎉 Succès !
        console.log(`✅ All tests pass after ${i + 1} iterations`);
        await this.learning.recordSuccess(currentError, patch);
        return { success: true, patch, iterations: i + 1, attempts };
      }

      // ❌ Échec - préparer la prochaine itération
      attempts.push({ patch, error: testResult.error, iteration: i + 1 });
      currentError = testResult.error;

      // Détecter si on tourne en rond
      if (i > 0 && this.isSameError(currentError, attempts[i - 1].error)) {
        console.log('⚠️ Same error - forcing different approach');
        repairContext.forceDifferentApproach = true;
      }
    }

    return {
      success: false,
      reason: `Max iterations (${this.maxIterations}) reached`,
      attempts
    };
  }
}
```

### 6.5.2 📋 Gestion du Feedback

Le feedback des tentatives précédentes est **crucial** :

![Feedback structuré](images/structured-feedback.svg)

---

## 📚 6.6 Apprentissage des Patterns de Réparation

### 6.6.1 💾 Mémoriser Ce Qui Fonctionne

Grok-CLI mémorise les patterns de réparation qui fonctionnent :

```typescript
// src/learning/repair-learning.ts
export class RepairLearning {
  async recordSuccess(error: TestError, patch: Patch): Promise<void> {
    const errorPattern = this.extractPattern(error.message);
    const solutionPattern = this.extractSolutionPattern(patch);

    // Mettre à jour ou créer l'entrée
    await this.db.run(`
      INSERT INTO repair_learning
        (error_pattern, solution_pattern, success_count)
      VALUES (?, ?, 1)
      ON CONFLICT(error_pattern, solution_pattern)
      DO UPDATE SET success_count = success_count + 1
    `, [errorPattern, solutionPattern]);
  }

  async findSimilarFixes(error: TestError): Promise<SimilarFix[]> {
    const pattern = this.extractPattern(error.message);

    return this.db.all(`
      SELECT solution_pattern, success_count, failure_count,
             (success_count * 1.0 / (success_count + failure_count + 1)) as confidence
      FROM repair_learning
      WHERE error_pattern LIKE ?
      ORDER BY confidence DESC
      LIMIT 5
    `, [`%${pattern}%`]);
  }
}
```

### 6.6.2 📊 Table d'Apprentissage

```sql
CREATE TABLE repair_learning (
  id INTEGER PRIMARY KEY,
  error_pattern TEXT NOT NULL,      -- Pattern normalisé de l'erreur
  solution_pattern TEXT NOT NULL,   -- Type de solution (null_check, await, etc.)
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME,

  -- Confidence calculée automatiquement
  confidence REAL GENERATED ALWAYS AS (
    success_count * 1.0 / (success_count + failure_count + 1)
  )
);

-- Index pour recherche rapide
CREATE INDEX idx_error_pattern ON repair_learning(error_pattern);
```

### 6.6.3 🏷️ Extraction des Patterns

```typescript
private extractSolutionPattern(patch: Patch): string {
  const patterns: string[] = [];
  const diff = patch.diff;

  if (diff.includes('if') && diff.includes('null')) patterns.push('null_check');
  if (diff.includes('try') && diff.includes('catch')) patterns.push('try_catch');
  if (diff.includes('await')) patterns.push('add_await');
  if (diff.includes('?.')) patterns.push('optional_chaining');
  if (diff.includes('??')) patterns.push('nullish_coalescing');
  if (diff.includes('Array.isArray')) patterns.push('array_check');
  if (diff.includes('typeof')) patterns.push('type_check');

  return patterns.join(',') || 'custom';
}
```

---

## 🤔 6.7 Réflexion et Self-Improvement

### 6.7.1 🔍 Auto-Analyse des Échecs

Quand la réparation échoue complètement, l'agent peut analyser **pourquoi** :

```typescript
async function analyzeRepairFailure(
  attempts: RepairAttempt[],
  context: CodeContext
): Promise<FailureAnalysis> {
  const prompt = `
    Tu es un expert en debugging. Analyse pourquoi ces tentatives ont échoué.

    ## Bug original
    ${context.originalError}

    ## Tentatives de réparation
    ${attempts.map((a, i) => `
    Tentative ${i + 1}:
    Patch: ${a.patch.diff}
    Résultat: ${a.error.message}
    `).join('\n---\n')}

    ## Questions à analyser
    1. Quel est le vrai problème sous-jacent ?
    2. Pourquoi chaque tentative a-t-elle échoué ?
    3. Qu'est-ce qui aurait dû être fait différemment ?
    4. Y a-t-il un pattern commun dans les échecs ?

    ## Format JSON
    {
      "rootCause": "...",
      "attemptAnalysis": [{ "attempt": 1, "whyFailed": "..." }, ...],
      "betterApproach": "...",
      "lessonsLearned": ["...", "..."]
    }
  `;

  return JSON.parse(await llm.complete(prompt, { temperature: 0 }));
}
```

### 6.7.2 📈 Méta-Apprentissage

L'agent peut apprendre **quelles stratégies** fonctionnent le mieux :

```typescript
// src/learning/meta-learning.ts
export class MetaLearning {
  async updateStrategyStats(
    strategy: string,
    bugType: string,
    success: boolean,
    iterations: number
  ): Promise<void> {
    await this.db.run(`
      INSERT INTO strategy_stats
        (strategy, bug_type, success, iterations, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [strategy, bugType, success ? 1 : 0, iterations]);
  }

  async getBestStrategy(bugType: string): Promise<StrategyStats | null> {
    return this.db.get(`
      SELECT strategy,
             AVG(success) as success_rate,
             AVG(iterations) as avg_iterations
      FROM strategy_stats
      WHERE bug_type = ?
      GROUP BY strategy
      HAVING COUNT(*) >= 5
      ORDER BY success_rate DESC, avg_iterations ASC
      LIMIT 1
    `, [bugType]);
  }
}
```

---

## 🎬 6.8 Cas Pratiques

### 6.8.1 🐛 Cas 1 : Null Pointer Exception

![Cas pratiques de réparation](images/repair-cases.svg)

---

## 📊 6.9 Métriques et Dashboard

### 6.9.1 📈 Métriques de Réparation

| 📊 Catégorie | Métrique | Description |
|:-------------|:---------|:------------|
| **Efficacité** | `successRate` | % de bugs corrigés |
| | `avgIterations` | Moyenne d'itérations |
| | `firstTrySuccessRate` | % corrigés du premier coup |
| **Qualité** | `regressionRate` | % de correctifs qui cassent autre chose |
| | `minimalPatchRate` | % de patches minimaux |
| **Efficience** | `avgLocalizationTime` | Temps moyen de localisation |
| | `avgGenerationTime` | Temps moyen de génération |
| | `apiCallsPerRepair` | Appels LLM par réparation |

### 6.9.2 🖥️ Dashboard

![Repair Dashboard](images/repair-dashboard.svg)

---

## 📊 Tableau Synthétique — Chapitre 06

| Aspect | Détails |
|--------|---------|
| **Titre** | Repair, Réflexion et Auto-Amélioration |
| **Problème** | Réparation single-shot = ~15% de succès seulement |
| **Solution** | Boucle itérative ChatRepair = ~40% de succès (+167%) |
| **Les 4 Phases** | Localiser → Générer → Valider → Feedback |
| **Localisation** | SBFL (Ochiai, DStar) + Stack trace + LLM |
| **Templates** | Patterns récurrents (null_check, try_catch, await...) |
| **Apprentissage** | Mémorisation des patterns qui fonctionnent |
| **Limite d'itérations** | 5 max (rendements décroissants au-delà) |
| **Papier de Référence** | ChatRepair (ISSTA 2024) |

> 📌 **À Retenir** : La différence entre un agent qui **réessaie** et un agent qui **répare** est le **feedback structuré**. Sans information sur pourquoi les tentatives précédentes ont échoué, le modèle répètera les mêmes erreurs. Le secret : toujours inclure l'historique des échecs dans le contexte et forcer explicitement une approche différente.

> 💡 **Astuce Pratique** : Commencez par les templates de réparation pour les bugs les plus courants (null checks, async/await). Ils ont une confidence de 80-95% et évitent des appels LLM coûteux. Réservez la génération libre pour les cas non couverts.

---

## 📝 6.10 Points Clés à Retenir

### 🎯 Sur le Problème

| Concept | Point clé |
|:--------|:----------|
| **Single-shot** | ~15% de succès seulement |
| **Réessayer aveuglément** | Ne fonctionne pas, même erreur répétée |
| **Itératif avec feedback** | ~40% de succès (+167%) |

### 🔄 Sur ChatRepair

| Concept | Point clé |
|:--------|:----------|
| **4 phases** | Localiser → Générer → Valider → Feedback |
| **Max 5 itérations** | Rendements décroissants au-delà |
| **Feedback structuré** | Crucial pour éviter les répétitions |

### 🔍 Sur la Localisation

| Concept | Point clé |
|:--------|:----------|
| **SBFL** | Ochiai, DStar basés sur la coverage |
| **Stack trace** | Source la plus fiable |
| **Combinaison** | Stack + SBFL + LLM pour robustesse |

### 📚 Sur l'Apprentissage

| Concept | Point clé |
|:--------|:----------|
| **Patterns** | Mémoriser ce qui fonctionne |
| **Templates** | Accélérer les bugs récurrents |
| **Méta-learning** | Savoir quelle stratégie utiliser |

---

## ⚠️ 6.11 Limites et Risques

### 🚧 Limites Techniques

| Limite | Description | Mitigation |
|--------|-------------|------------|
| **Reparation partielle** | Le patch peut corriger le symptome, pas la cause racine | Tests d'integration obligatoires apres chaque fix |
| **Regression** | Un fix peut introduire de nouveaux bugs ailleurs | Suite de tests exhaustive, analyse de couverture |
| **Boucle infinie** | L'agent peut ne jamais converger vers une solution | Limite stricte de tentatives (5-10 max) |
| **Complexite du bug** | Bugs architecturaux ou multi-fichiers hors de portee | Detection automatique et escalade humaine |
| **Overfitting** | Le patch peut etre trop specifique au cas de test | Validation sur des tests supplementaires |

### ⚡ Risques Operationnels

1. **Sur-confiance dans les corrections automatiques**
   - *Probabilite* : Haute
   - *Impact* : Eleve (bugs en production)
   - *Mitigation* : Toujours revue humaine avant merge en production

2. **Masquage de problemes profonds**
   - *Probabilite* : Moyenne
   - *Impact* : Critique (dette technique)
   - *Mitigation* : Analyse des patterns de bugs recurrents, refactoring preventif

3. **Dependance excessive a l'automatisation**
   - *Probabilite* : Moyenne
   - *Impact* : Modere (perte de competences)
   - *Mitigation* : Utiliser comme outil d'apprentissage, pas de remplacement

### 🔬 Recherche en Cours

- **Reparation multi-fichiers** : Techniques pour coordonner les modifications sur plusieurs fichiers
- **Comprehension semantique** : Aller au-dela du pattern matching vers la comprehension du code
- **Garanties formelles** : Prouver mathematiquement qu'un patch est correct

### 💡 Recommandations

> **Pour les debutants** : Utilisez le repair engine uniquement sur des tests unitaires isoles.
> Validez toujours manuellement les patches avant de les integrer.
>
> **Pour les experts** : Configurez des seuils de confiance stricts et integrez
> le repair dans votre CI/CD avec des gates de qualite.

---

## 🏋️ 6.12 Exercices

### Exercice 1 : Formule Tarantula (30 min)

Implémentez la formule Tarantula et comparez avec Ochiai sur 10 bugs de votre codebase.

### Exercice 2 : Nouveaux Templates (45 min)

Ajoutez 5 nouveaux templates de réparation pour des erreurs courantes dans TypeScript :
- Off-by-one error
- Missing return statement
- Wrong operator (== vs ===)
- Missing dependency in useEffect
- Incorrect regex

### Exercice 3 : Métriques (30 min)

Instrumentez le repair engine pour collecter les métriques et générez un rapport HTML.

### Exercice 4 : Analyse d'Apprentissage (1h)

Après 50 réparations, analysez la table `repair_learning` :
- Quels patterns émergent ?
- Quels sont les plus fiables ?
- Y a-t-il des patterns qui échouent souvent ?

---

## 📚 6.12 Pour Aller Plus Loin

### Publications

- Xia, C., et al. (2024). "ChatRepair: Autonomous Program Repair with ChatGPT." ISSTA 2024
- Wong, W. E., et al. (2016). "A Survey on Software Fault Localization." TSE
- Le Goues, C., et al. (2019). "Automated Program Repair." Communications of the ACM

### Code Source

- Grok-CLI : `src/agent/repair/`
- Localisation : `src/agent/repair/fault-localization.ts`
- Templates : `src/agent/repair/repair-templates.ts`
- Learning : `src/learning/repair-learning.ts`

---

## 🌅 Épilogue : Le Bug Enfin Corrigé

Lina lança la nouvelle version de son agent sur le même bug qui l'avait fait échouer cinq fois.

```
🔧 Iteration 1/5
📍 Suspect: src/utils/user.ts:42
📋 Using template: null_check
🧪 Test: FAIL - user exists but is empty object

🔧 Iteration 2/5
📍 Suspect: src/utils/user.ts:42
🤖 Generated patch (different from attempt 1)
🧪 Test: PASS ✅

✅ All tests pass after 2 iterations
📚 Learned: "Cannot read property 'name'" → "optional_chaining,nullish_coalescing"
```

Marc regarda par-dessus son épaule.

— "Deux essais au lieu de cinq identiques ?"

— "Et la deuxième tentative était **différente** de la première. C'est ça la clé — il a **appris** de l'échec au lieu de répéter la même erreur."

Elle pointa l'écran.

— "Et regarde ici : il a mémorisé le pattern. La prochaine fois qu'il verra cette erreur, il saura quoi faire."

Marc hocha la tête, impressionné.

— "OK. Tu m'as convaincu. Et maintenant ?"

Lina ferma la fenêtre de l'agent.

— "Maintenant, on passe à la mémoire. RAG, embeddings, context compression. Comment donner à l'agent une vraie compréhension du codebase."

---

*Fin de la Partie II — Raisonnement et Planification*

---

| ⬅️ Précédent | 📖 Sommaire | ➡️ Suivant |
|:-------------|:-----------:|:-----------|
| [Monte-Carlo Tree Search](05-mcts.md) | [Index](README.md) | [RAG Moderne](07-rag-moderne.md) |
