# Chapitre 6 : Auto-Réparation — De 15% à 40% de Succès

---

## 1. Le Problème

Votre agent génère le même code incorrect 5 fois de suite. L'erreur est dans le contexte, mais il ne la **lit** pas. Il recommence aveuglément.

**L'erreur classique** : Réessayer = régénérer le même code en espérant un résultat différent. C'est la définition de la folie selon Einstein.

```
Tentative 1: if (user) return user.name;  → FAIL: Cannot read property 'name'
Tentative 2: if (user) return user.name;  → FAIL: Cannot read property 'name'
Tentative 3: if (user) return user.name;  → FAIL: Cannot read property 'name'
Tentative 4: if (user) return user.name;  → FAIL: Cannot read property 'name'
Tentative 5: if (user) return user.name;  → FAIL: Cannot read property 'name'
// 5 tentatives identiques. 0 apprentissage.
```

---

## 2. La Solution Rapide : Boucle ChatRepair

```typescript
interface RepairAttempt {
  code: string;
  error: string;
  analysis: string;
}

async function chatRepair(
  buggyCode: string,
  error: string,
  maxAttempts = 5
): Promise<string> {
  const history: RepairAttempt[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Construire le feedback structuré
    const feedback = history.length > 0
      ? `## Tentatives précédentes (NE PAS RÉPÉTER)
${history.map((h, i) => `
### Tentative ${i + 1}
Code: ${h.code.slice(0, 200)}...
Erreur: ${h.error}
Pourquoi ça a échoué: ${h.analysis}
`).join('\n')}`
      : '';

    const response = await llm.chat(`
      ## Bug à corriger
      ${buggyCode}

      ## Erreur actuelle
      ${error}

      ${feedback}

      ## Instructions
      1. Analyse l'erreur (ne répète PAS les tentatives précédentes)
      2. Propose un correctif DIFFÉRENT
      3. Explique pourquoi ce correctif fonctionne

      Format:
      ANALYSIS: [ton analyse]
      CODE: [le code corrigé]
    `);

    const fix = parseResponse(response);

    // Tester le correctif
    const result = await runTests(fix.code);

    if (result.success) {
      return fix.code;  // Succès !
    }

    // Analyser pourquoi ça a échoué et stocker
    history.push({
      code: fix.code,
      error: result.error,
      analysis: await analyzeFailure(fix.code, result.error)
    });
  }

  throw new Error(`Échec après ${maxAttempts} tentatives`);
}

async function analyzeFailure(code: string, error: string): Promise<string> {
  return await llm.chat(`
    Ce code a échoué:
    ${code}

    Erreur: ${error}

    Explique en UNE phrase pourquoi ce correctif n'a pas fonctionné.
  `);
}
```

**Résultat** : 15% → 40% de taux de succès (étude ChatRepair, ISSTA 2024).

---

## 3. Deep Dive : Les 3 Composants

### 3.1 Fault Localization — Trouver le bug

Avant de corriger, il faut **localiser**. Deux approches :

**Approche 1 : Stack trace (simple)**
```typescript
function extractLocation(error: Error): Location {
  const line = error.stack?.split('\n')[1];
  const match = line?.match(/at .+ \((.+):(\d+):(\d+)\)/);
  return match
    ? { file: match[1], line: parseInt(match[2]) }
    : null;
}
```

**Approche 2 : SBFL avec coverage (précis)**
```typescript
// Ochiai : formule de localisation par couverture
function ochiai(ef: number, ep: number, totalFailed: number): number {
  if (ef === 0) return 0;
  return ef / Math.sqrt((ef + ep) * totalFailed);
}

// ef = lignes exécutées par tests FAILED
// ep = lignes exécutées par tests PASSED
// Plus le score est haut, plus la ligne est suspecte
```

| Méthode | Précision | Coût | Quand l'utiliser |
|---------|-----------|------|------------------|
| Stack trace | 70% | Gratuit | Erreurs d'exécution |
| SBFL (Ochiai) | 85% | Couverture requise | Tests unitaires disponibles |
| LLM | 75% | 1 appel | Pas de tests/coverage |

### 3.2 Patch Generation — Générer le correctif

Le secret : donner au LLM **exactement** le contexte nécessaire.

```typescript
function buildRepairContext(location: Location, history: RepairAttempt[]): string {
  return `
## Fichier: ${location.file}
## Lignes suspectes: ${location.line - 5} à ${location.line + 5}
${getCodeSnippet(location, 5)}

## Erreur
${history[history.length - 1]?.error || 'Aucune'}

## Ce qui a déjà été essayé (NE PAS RÉPÉTER)
${history.map(h => `- ${h.analysis}`).join('\n')}

## Correction demandée
Génère un patch qui:
1. Corrige le bug
2. Ne casse pas les autres tests
3. Est DIFFÉRENT des tentatives précédentes
`;
}
```

### 3.3 Test Validation — Vérifier le correctif

```typescript
async function validatePatch(
  original: string,
  patched: string,
  testFile: string
): Promise<ValidationResult> {
  // 1. Appliquer le patch
  await writeFile(targetFile, patched);

  try {
    // 2. Lancer les tests
    const result = await exec(`npm test ${testFile}`, { timeout: 30000 });

    return {
      success: result.exitCode === 0,
      testsRun: parseTestCount(result.stdout),
      testsPassed: parsePassedCount(result.stdout),
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    // 3. Restaurer l'original si échec
    await writeFile(targetFile, original);
  }
}
```

---

## 4. Edge Cases et Pièges

### Piège 1 : L'historique qui explose le contexte

```typescript
// ❌ Garder tout l'historique = contexte énorme
history.push({ code: fullCode, error: fullStackTrace });
// Après 5 tentatives : 50K tokens

// ✅ Résumer et tronquer
history.push({
  code: code.slice(0, 200) + '...',  // Juste le début
  error: error.split('\n')[0],        // Première ligne
  analysis: oneSentenceAnalysis       // Résumé
});
// Après 5 tentatives : 2K tokens
```

**Contournement** : Résumer chaque tentative, pas tout stocker.

### Piège 2 : Le LLM qui répète quand même

```typescript
// ❌ Le LLM ignore l'instruction "ne pas répéter"
const fix = await llm.chat("Ne répète pas X");
// Génère... exactement X

// ✅ Vérifier programmatiquement
const fix = await generateFix(problem, history);
if (history.some(h => similarity(h.code, fix.code) > 0.9)) {
  return await generateFix(problem, history, { forceCreative: true });
}
```

**Contournement** : Détecter les répétitions et forcer la créativité (température plus haute).

### Piège 3 : Le fix qui casse d'autres tests

```typescript
// ❌ Valider seulement le test qui échouait
if (targetTestPasses) return fix;

// ✅ Valider TOUS les tests
const allResults = await runAllTests();
if (allResults.failed.length > 0) {
  // Le fix a introduit des régressions
  history.push({
    code: fix,
    error: `Régression: ${allResults.failed.join(', ')}`,
    analysis: 'Le fix casse d\'autres fonctionnalités'
  });
  continue;
}
```

**Contournement** : Toujours exécuter la suite complète de tests.

---

## 5. Optimisation : Learning Persistant

Stockez les patterns de réparation qui fonctionnent :

```typescript
// Après un fix réussi
await db.savePattern({
  errorPattern: extractPattern(error),  // "Cannot read property 'X' of undefined"
  solution: extractPattern(fix),         // "Ajouter vérification null"
  confidence: 0.8
});

// Avant de générer un fix
const knownSolution = await db.findPattern(error);
if (knownSolution && knownSolution.confidence > 0.7) {
  // Suggérer le pattern connu en premier
  return await applyKnownPattern(knownSolution, code);
}
```

**Économie** : Les bugs récurrents sont fixés en 1 tentative au lieu de 3-5.

---

## Tableau Récapitulatif

| Métrique | Single-shot | ChatRepair (5 tentatives) |
|----------|-------------|---------------------------|
| Taux de succès | 15% | 40% |
| Coût moyen | $0.02 | $0.08 |
| Temps moyen | 2s | 10s |
| Répétitions | 100% identiques | 0% (vérifié) |

**ROI** : Pour $0.06 de plus, vous triplez le taux de succès.

---

## Ce Qui Vient Ensuite

ChatRepair corrige le code, mais a besoin du **bon contexte**. Le **Chapitre 7** introduit RAG : comment trouver automatiquement les fichiers pertinents dans votre codebase.

---

[⬅️ Chapitre 5](05-mcts.md) | [📚 Table des Matières](README.md) | [➡️ Chapitre 7](07-rag-moderne.md)
