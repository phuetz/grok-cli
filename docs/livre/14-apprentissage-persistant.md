# Chapitre 14 : Mémoire Persistante — Un Agent Qui Apprend

---

## 1. Le Problème

Chaque session repart de zéro. L'agent oublie vos préférences, vos conventions de code, les erreurs corrigées hier. Vous répétez les mêmes instructions. Encore.

**L'erreur classique** : Les LLMs sont stateless — fenêtre de contexte limitée, aucune persistance.

```typescript
// ❌ Session 1
user: "Je préfère les commits atomiques"
agent: "Compris, je ferai des commits de 1-3 fichiers max"

// Session 2 (nouvelle)
user: "Fais un commit"
agent: *commit de 47 fichiers* // A tout oublié

// ✅ Avec mémoire persistante
// Session 2
user: "Fais un commit"
agent: "Je me souviens que tu préfères les commits atomiques.
        Je vais créer 3 commits séparés par fonctionnalité."
```

---

## 2. La Solution Rapide : Système de Mémoire en 4 Types

```typescript
enum MemoryType {
  EPISODIC = 'episodic',       // Événements passés
  SEMANTIC = 'semantic',        // Connaissances factuelles
  PROCEDURAL = 'procedural',    // Comment faire
  PROSPECTIVE = 'prospective'   // Tâches futures
}

interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: unknown;
  timestamp: number;
  importance: number;           // 0-1
  accessCount: number;
  lastAccessed: number;
  embedding?: number[];
}

class MemorySystem {
  private memories = new Map<string, MemoryEntry>();
  private storagePath: string;

  async remember(type: MemoryType, content: unknown, importance = 0.5): Promise<string> {
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: Date.now(),
      importance,
      accessCount: 0,
      lastAccessed: Date.now()
    };
    this.memories.set(entry.id, entry);
    await this.save();
    return entry.id;
  }

  async recall(id: string): Promise<MemoryEntry | null> {
    const entry = this.memories.get(id);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }
    return entry ?? null;
  }

  async search(query: { type?: MemoryType; text?: string; limit?: number }): Promise<MemoryEntry[]> {
    let results = Array.from(this.memories.values());

    if (query.type) results = results.filter(m => m.type === query.type);
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(m => JSON.stringify(m.content).toLowerCase().includes(searchText));
    }

    return results
      .sort((a, b) => b.importance - a.importance)
      .slice(0, query.limit ?? 10);
  }
}
```

---

## 3. Deep Dive : Les 4 Types de Mémoire

### 3.1 Mémoire Épisodique — "Que s'est-il passé ?"

```typescript
interface Episode {
  type: 'conversation' | 'task_completion' | 'error' | 'learning_moment';
  summary: string;
  details: {
    input?: string;
    output?: string;
    toolsUsed?: string[];
    filesModified?: string[];
    success?: boolean;
    errorMessage?: string;
  };
  userReaction?: 'positive' | 'negative' | 'neutral';
}

class EpisodicMemory {
  async recordConversation(userMsg: string, agentResponse: string, success: boolean): Promise<void> {
    await this.memory.remember(MemoryType.EPISODIC, {
      type: 'conversation',
      summary: this.summarize(userMsg, agentResponse),
      details: { input: userMsg, output: agentResponse, success }
    }, success ? 0.6 : 0.8);  // Erreurs = plus important
  }

  async recallSimilarErrors(errorPattern: string): Promise<Episode[]> {
    const results = await this.memory.search({
      type: MemoryType.EPISODIC,
      text: errorPattern,
      limit: 5
    });
    return results
      .filter(m => (m.content as Episode).type === 'error')
      .map(m => m.content as Episode);
  }
}
```

### 3.2 Mémoire Sémantique — "Qu'ai-je appris ?"

```typescript
interface Fact {
  type: 'codebase_fact' | 'user_preference' | 'recurring_pattern' | 'project_rule';
  subject: string;      // "user"
  predicate: string;    // "prefers"
  object: string;       // "atomic commits"
  confidence: number;   // 0-1
}

class SemanticMemory {
  async learnUserPreference(preference: string, value: string): Promise<void> {
    // Vérifier si on connaît déjà ce fait
    const existing = await this.findFact('user', preference);
    if (existing && existing.object === value) {
      // Renforcer la confiance
      existing.confidence = Math.min(1, existing.confidence + 0.1);
    } else {
      // Nouveau fait ou remplacement
      await this.memory.remember(MemoryType.SEMANTIC, {
        type: 'user_preference',
        subject: 'user',
        predicate: preference,
        object: value,
        confidence: 0.7
      });
    }
  }

  async getUserPreferences(): Promise<Record<string, string>> {
    const facts = await this.memory.search({ type: MemoryType.SEMANTIC });
    const prefs: Record<string, string> = {};
    for (const f of facts.map(m => m.content as Fact)) {
      if (f.type === 'user_preference') {
        prefs[f.predicate] = f.object;
      }
    }
    return prefs;
  }
}
```

### 3.3 Mémoire Procédurale — "Comment faire ?"

```typescript
interface Procedure {
  name: string;
  trigger: string;              // Quand l'utiliser
  steps: { action: string; tool?: string; params?: unknown }[];
  successRate: number;
  usageCount: number;
}

class ProceduralMemory {
  async learnFromObservation(actions: Action[], outcome: 'success' | 'failure'): Promise<void> {
    if (outcome !== 'success') return;  // N'apprend que des succès

    const steps = actions.map((a, i) => ({ order: i, action: a.type, tool: a.tool }));
    await this.memory.remember(MemoryType.PROCEDURAL, {
      name: `auto_${Date.now()}`,
      trigger: actions[0]?.context || 'unknown',
      steps,
      successRate: 1.0,
      usageCount: 1
    });
  }

  async findBestProcedure(context: string): Promise<Procedure | null> {
    const results = await this.memory.search({
      type: MemoryType.PROCEDURAL,
      text: context,
      limit: 5
    });
    if (!results.length) return null;

    // Sélection par taux de succès
    return results
      .map(m => m.content as Procedure)
      .sort((a, b) => b.successRate - a.successRate)[0];
  }
}
```

### 3.4 Mémoire Prospective — "Que dois-je faire ?"

```typescript
interface Intention {
  description: string;
  trigger: { type: 'time'; at: number } | { type: 'file'; path: string } | { type: 'event'; name: string };
  action: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'triggered' | 'completed';
}

class ProspectiveMemory {
  async remindOnFile(filePath: string, description: string, action: string): Promise<void> {
    await this.memory.remember(MemoryType.PROSPECTIVE, {
      description,
      trigger: { type: 'file', path: filePath },
      action,
      priority: 'high',
      status: 'pending'
    }, 0.9);
  }

  async checkTriggers(context: { currentFile?: string }): Promise<Intention[]> {
    const memories = await this.memory.search({ type: MemoryType.PROSPECTIVE });
    const triggered: Intention[] = [];

    for (const m of memories) {
      const intent = m.content as Intention;
      if (intent.status !== 'pending') continue;

      if (intent.trigger.type === 'file' && intent.trigger.path === context.currentFile) {
        intent.status = 'triggered';
        triggered.push(intent);
      }
    }
    return triggered;
  }
}
```

---

## 4. Edge Cases et Pièges

### Piège 1 : Mémoire qui ne s'oublie jamais

```typescript
// ❌ Accumulation sans limite
await memory.remember(...);  // 100K entrées après 6 mois

// ✅ Consolidation périodique (oubli intelligent)
async consolidate(): Promise<{ forgotten: number; promoted: number }> {
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  let forgotten = 0, promoted = 0;

  for (const [id, entry] of this.memories) {
    const age = Date.now() - entry.timestamp;
    const stale = Date.now() - entry.lastAccessed;

    // Oubli : non important + jamais accédé + vieux
    if (entry.importance < 0.2 && entry.accessCount === 0 && age > oneWeek) {
      this.memories.delete(id);
      forgotten++;
    }

    // Promotion : fréquemment accédé
    if (entry.accessCount > 10 && entry.importance < 0.8) {
      entry.importance += 0.1;
      promoted++;
    }
  }

  return { forgotten, promoted };
}
```

**Contournement** : Consolidation hebdomadaire avec règles d'oubli.

### Piège 2 : Apprentissage de mauvais patterns

```typescript
// ❌ Apprendre d'une erreur comme si c'était un succès
await proceduralMemory.learn(actions, 'success');  // Mais l'utilisateur n'était pas content

// ✅ Feedback explicite de l'utilisateur
async recordWithFeedback(actions: Action[], userFeedback: 'positive' | 'negative'): Promise<void> {
  if (userFeedback === 'negative') {
    // Ne pas apprendre, ou apprendre à éviter
    await this.memory.remember(MemoryType.EPISODIC, {
      type: 'learning_moment',
      summary: `Éviter cette approche pour: ${actions[0].context}`,
      details: { actions }
    }, 0.8);
    return;
  }
  // Apprendre normalement
  await this.learnFromObservation(actions, 'success');
}
```

**Contournement** : Toujours lier l'apprentissage au feedback utilisateur.

### Piège 3 : Recherche lente sur grosse base

```typescript
// ❌ Recherche linéaire O(n) sur 50K entrées
for (const entry of this.memories.values()) {
  if (entry.content.includes(searchText)) results.push(entry);
}

// ✅ Index vectoriel pour recherche sémantique O(1)
class IndexedMemorySystem extends MemorySystem {
  private vectorIndex = new VectorIndex();

  async remember(type: MemoryType, content: unknown, importance = 0.5): Promise<string> {
    const id = await super.remember(type, content, importance);
    const embedding = await this.embed(JSON.stringify(content));
    await this.vectorIndex.add(id, embedding);
    return id;
  }

  async searchSemantic(query: string, limit = 10): Promise<MemoryEntry[]> {
    const queryEmbedding = await this.embed(query);
    const ids = await this.vectorIndex.search(queryEmbedding, limit);  // O(1)
    return Promise.all(ids.map(id => this.recall(id)));
  }
}
```

**Contournement** : Index vectoriel (FAISS, Chroma) pour recherche sémantique.

---

## 5. Optimisation : Intégration dans l'Agent

```typescript
class AgentWithMemory {
  private episodic: EpisodicMemory;
  private semantic: SemanticMemory;
  private procedural: ProceduralMemory;
  private prospective: ProspectiveMemory;

  async processMessage(message: string): Promise<string> {
    // 1. Vérifier les rappels contextuels
    const reminders = await this.prospective.checkTriggers({ currentMessage: message });
    for (const r of reminders) {
      console.log(`Reminder: ${r.description}`);
    }

    // 2. Enrichir le contexte avec les mémoires pertinentes
    const similarEpisodes = await this.episodic.recallSimilar(message, 3);
    const userPrefs = await this.semantic.getUserPreferences();
    const bestProcedure = await this.procedural.findBestProcedure(message);

    // 3. Construire le prompt enrichi
    const enrichedPrompt = this.buildPrompt(message, {
      history: similarEpisodes,
      preferences: userPrefs,
      suggestedProcedure: bestProcedure
    });

    // 4. Appeler le LLM
    const response = await this.llm.chat(enrichedPrompt);

    // 5. Enregistrer l'épisode
    await this.episodic.recordConversation(message, response, true);

    return response;
  }
}
```

---

## Tableau Récapitulatif

| Type de Mémoire | Question | Exemples | Importance |
|-----------------|----------|----------|:----------:|
| **Épisodique** | "Que s'est-il passé ?" | Conversations, erreurs, succès | Actions passées |
| **Sémantique** | "Qu'ai-je appris ?" | Préférences, faits projet | Personnalisation |
| **Procédurale** | "Comment faire ?" | Workflows, séquences | Automatisation |
| **Prospective** | "Que dois-je faire ?" | Rappels, tâches | Proactivité |

| Règle de Consolidation | Condition | Action |
|------------------------|-----------|--------|
| **Oubli** | importance < 0.2, 0 accès, > 1 semaine | Supprimer |
| **Archivage** | > 1 mois, non accédé > 1 semaine | Archiver |
| **Promotion** | accès > 10 fois | +10% importance |

---

## Ce Qui Vient Ensuite

L'agent a maintenant des outils, du contexte intelligent, des optimisations, et une mémoire persistante. Le **Chapitre 15** assemble tout : l'architecture complète d'un agent LLM production-ready.

---

[Chapitre 13](13-optimisations-systeme.md) | [Table des Matières](README.md) | [Chapitre 15](15-architecture-complete.md)
