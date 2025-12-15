# Chapitre 15 : Architecture Complète — 6 Couches

---

## 1. Le Problème

"Comment tout s'assemble ?" L'équipe a construit des outils, du RAG, de la mémoire, des optimisations — mais aucune vue d'ensemble. Chaque développeur comprend sa partie, personne ne comprend le tout.

**L'erreur classique** : Construire sans plan. Les composants marchent isolément, échouent ensemble.

```
Ce que vous avez :
├── tools/          # 41 fichiers
├── memory/         # 4 types de mémoire
├── reasoning/      # ToT, MCTS, Repair
├── rag/            # Pipeline + cache
├── optimization/   # Router, parallel, lazy
└── ???             # Comment ça se connecte ?
```

---

## 2. La Solution Rapide : 6 Couches

```
┌─────────────────────────────────────────────────────────┐
│  1. INTERFACE          React/Ink, streaming, UI          │
├─────────────────────────────────────────────────────────┤
│  2. ORCHESTRATION      CodeBuddyAgent, boucle, multi-agent    │
├─────────────────────────────────────────────────────────┤
│  3. RAISONNEMENT       ToT, MCTS, Repair, sélection auto │
├─────────────────────────────────────────────────────────┤
│  4. CONTEXTE           RAG, compression, mémoire unifiée │
├─────────────────────────────────────────────────────────┤
│  5. ACTIONS            41 outils, registre, MCP, parallel│
├─────────────────────────────────────────────────────────┤
│  6. SÉCURITÉ           3 modes, sandbox, audit           │
└─────────────────────────────────────────────────────────┘
```

| Couche | Responsabilité | Composants Clés |
|--------|----------------|-----------------|
| Interface | Interaction utilisateur | ChatInterface, StreamingText |
| Orchestration | Coordination globale | CodeBuddyAgent, MultiAgentCoordinator |
| Raisonnement | Stratégies de résolution | ToT, MCTS, IterativeRepair |
| Contexte | Gestion de l'information | RAGPipeline, ContextCompressor, UnifiedMemory |
| Actions | Exécution des tâches | ToolRegistry, ParallelExecutor, MCPClient |
| Sécurité | Protection système | ApprovalModes, Sandbox, AuditLogger |

---

## 3. Deep Dive : Chaque Couche

### 3.1 Couche Orchestration — Le Cœur

```typescript
class CodeBuddyAgent {
  private tools: ToolRegistry;
  private router: ModelRouter;
  private executor: ParallelExecutor;
  private memory: MemorySystem;
  private security: SecurityManager;
  private maxRounds = 30;

  async *processStream(input: string): AsyncGenerator<AgentChunk> {
    let currentRound = 0;

    // 1. Vérification sécurité
    const securityCheck = await this.security.checkInput(input);
    if (!securityCheck.allowed) {
      yield { type: 'error', content: securityCheck.reason };
      return;
    }

    // 2. Enrichissement du contexte
    const context = await this.buildContext(input);

    // 3. Sélection du modèle (FrugalGPT)
    const routing = await this.router.selectTier({ prompt: input });
    yield { type: 'metadata', model: routing.tier };

    // 4. Boucle agentique
    let messages = this.buildInitialMessages(input, context);
    let continueLoop = true;

    while (continueLoop && currentRound < this.maxRounds) {
      currentRound++;

      // Appel au modèle
      const response = await this.client.chat({
        model: routing.tier,
        messages,
        tools: this.tools.getDefinitions(),
        stream: true
      });

      // Streaming du texte
      for await (const chunk of response) {
        if (chunk.type === 'text') yield { type: 'text', content: chunk.content };
      }

      // Vérification des appels d'outils
      const toolCalls = response.toolCalls;
      if (!toolCalls?.length) {
        continueLoop = false;
      } else {
        yield { type: 'tools_start', count: toolCalls.length };
        const results = await this.executor.executeTools(toolCalls);
        messages = this.appendToolResults(messages, toolCalls, results);
      }
    }

    // 5. Mémoire
    await this.memory.remember('episodic', { input, rounds: currentRound });
    yield { type: 'complete', rounds: currentRound };
  }
}
```

### 3.2 Couche Raisonnement — Sélection Automatique

```typescript
class ReasoningEngine {
  private tot: TreeOfThought;
  private mcts: MCTSReasoner;
  private repair: IterativeRepairEngine;

  async reason(problem: Problem, strategy?: ReasoningStrategy): Promise<Solution> {
    const selected = strategy ?? this.selectStrategy(problem);

    switch (selected) {
      case 'direct':
        return this.directReasoning(problem);
      case 'tree-of-thought':
        return this.tot.solve(problem);
      case 'mcts':
        return this.mcts.search(problem);
      case 'iterative-repair':
        return this.repair.repair(problem);
    }
  }

  private selectStrategy(problem: Problem): ReasoningStrategy {
    const complexity = this.assessComplexity(problem);

    if (complexity.score < 0.3) return 'direct';
    if (problem.hasTests && problem.type === 'bug_fix') return 'iterative-repair';
    if (complexity.branchingFactor > 5) return 'mcts';
    if (complexity.requiresExploration) return 'tree-of-thought';

    return 'direct';
  }
}
```

### 3.3 Couche Contexte — Mémoire Unifiée

```typescript
class UnifiedMemory {
  private episodic: EpisodicMemory;
  private semantic: SemanticMemory;
  private procedural: ProceduralMemory;
  private prospective: ProspectiveMemory;

  async recall(context: string): Promise<UnifiedRecall> {
    const [episodes, facts, procedure] = await Promise.all([
      this.episodic.recallSimilar(context, 3),
      this.semantic.getFactsAbout(context),
      this.procedural.findApplicable(context)
    ]);

    return { episodes, facts, suggestedProcedure: procedure };
  }

  async learn(event: LearningEvent): Promise<void> {
    await this.episodic.record(event);
    await this.semantic.learnFromEpisode(event);
    if (event.toolSequence && event.success) {
      await this.procedural.learnFromSequence(event.toolSequence, event.context);
    }
  }
}
```

### 3.4 Couche Actions — Registre d'Outils

```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>();
  private metrics = new Map<string, ToolMetrics>();

  constructor() {
    this.registerBuiltinTools();  // 41 outils
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: { name: tool.name, description: tool.description, parameters: tool.schema }
    }));
  }

  async execute(name: string, params: unknown): Promise<ToolResult> {
    const tool = this.get(name);
    const metrics = this.metrics.get(name)!;
    const startTime = Date.now();

    try {
      const result = await tool.execute(params);
      metrics.calls++;
      metrics.successes++;
      metrics.totalDuration += Date.now() - startTime;
      return { success: true, value: result };
    } catch (error) {
      metrics.calls++;
      return { success: false, error: error.message };
    }
  }
}
```

### 3.5 Couche Sécurité — 3 Modes

```typescript
class SecurityManager {
  private approval: ApprovalModeManager;
  private sandbox: SandboxManager;
  private audit: AuditLogger;

  async checkTool(toolCall: ToolCall): Promise<SecurityCheck> {
    const mode = this.approval.getCurrentMode();

    // Mode read-only : bloquer les écritures
    if (mode === 'read-only' && this.isWriteTool(toolCall.name)) {
      return { allowed: false, reason: `Tool ${toolCall.name} blocked in read-only mode` };
    }

    // Mode auto : vérifier les règles
    if (mode === 'auto') {
      const autoCheck = this.approval.checkAutoRules(toolCall);
      if (!autoCheck.allowed) return autoCheck;
    }

    // Sandbox pour Bash
    if (toolCall.name === 'Bash') {
      const sandboxCheck = await this.sandbox.check(toolCall.params.command);
      if (!sandboxCheck.allowed) return sandboxCheck;
    }

    await this.audit.log('tool_check', { tool: toolCall.name, allowed: true });
    return { allowed: true };
  }
}
```

| Mode | Outils Lecture | Outils Écriture | Bash |
|------|:--------------:|:---------------:|:----:|
| read-only | Auto | Bloqué | Bloqué |
| auto | Auto | Règles | Règles |
| full-access | Auto | Auto | Auto |

---

## 4. Edge Cases et Pièges

### Piège 1 : Cascade d'erreurs entre couches

```typescript
// ❌ Une erreur dans la mémoire crashe l'agent
const context = await this.memory.recall(input);  // Exception!
const response = await this.llm.chat(messages);

// ✅ Isolation des erreurs
async buildContext(input: string): Promise<Context> {
  try {
    return await this.memory.recall(input);
  } catch (error) {
    console.warn('[Memory] Recall failed, continuing without context:', error);
    return { episodes: [], facts: [], suggestedProcedure: null };
  }
}
```

**Contournement** : Try-catch par couche, dégradation gracieuse.

### Piège 2 : Deadlock multi-agents

```typescript
// ❌ Agent A attend B, B attend A
const resultA = await agentA.process(taskA);  // Dépend de B
const resultB = await agentB.process(taskB);  // Dépend de A

// ✅ Détection de cycles + timeouts
class MultiAgentCoordinator {
  async execute(tasks: Task[]): Promise<Results> {
    const graph = this.buildDependencyGraph(tasks);

    if (this.hasCycle(graph)) {
      throw new Error('Circular dependency detected');
    }

    return this.executeByLevel(graph, { timeout: 30_000 });
  }
}
```

**Contournement** : Graphe de dépendances + timeout par agent.

### Piège 3 : Boucle infinie de l'agent

```typescript
// ❌ L'agent tourne en boucle sans progresser
while (continueLoop) {
  const response = await this.llm.chat(messages);
  // Même réponse encore et encore...
}

// ✅ Détection de stagnation
while (continueLoop && currentRound < this.maxRounds) {
  const response = await this.llm.chat(messages);

  // Détection de répétition
  if (this.isStagnating(response, previousResponses)) {
    yield { type: 'warning', content: 'Agent appears stuck, stopping' };
    break;
  }

  previousResponses.push(response);
  currentRound++;
}
```

**Contournement** : maxRounds + détection de stagnation.

---

## 5. Optimisation : Flux de Données

```
User Input
    │
    ▼
┌───────────────────────┐
│  1. Parse & Hooks     │
└───────────────────────┘
    │
    ▼
┌───────────────────────┐
│  2. Security Check    │────▶ Blocked? Return error
└───────────────────────┘
    │
    ▼
┌───────────────────────┐
│  3. Context           │
│  - RAG retrieval      │
│  - Memory recall      │
│  - User preferences   │
└───────────────────────┘
    │
    ▼
┌───────────────────────┐
│  4. Model Routing     │────▶ Fast/Balanced/Powerful
└───────────────────────┘
    │
    ▼
┌───────────────────────┐
│  5. Agent Loop        │◀───┐
│  - LLM call           │    │
│  - Tool execution     │    │
│  - Result append      │────┘ (max 30 rounds)
└───────────────────────┘
    │
    ▼
┌───────────────────────┐
│  6. Memory Update     │
│  - Record episode     │
│  - Learn facts        │
│  - Update procedures  │
└───────────────────────┘
    │
    ▼
User Response
```

---

## 6. Configuration

```json
// .grok/settings.json
{
  "model": "grok-3",
  "maxRounds": 30,
  "approvalMode": "auto",
  "memory": {
    "enabled": true,
    "consolidation": "daily"
  },
  "optimization": {
    "modelRouting": true,
    "parallelExecution": true,
    "caching": true
  }
}
```

---

## Tableau Récapitulatif

| Couche | Chapitre | Composants |
|--------|:--------:|------------|
| Interface | - | React/Ink, streaming |
| Orchestration | - | CodeBuddyAgent, multi-agent |
| Raisonnement | Ch.4-6 | ToT, MCTS, Repair |
| Contexte | Ch.7-9, 14 | RAG, compression, mémoire |
| Actions | Ch.10-11 | 41 outils, MCP |
| Sécurité | Ch.16 | 3 modes, sandbox |

| Aspect | Valeur |
|--------|--------|
| Couches | 6 |
| Outils intégrés | 41 |
| Types de mémoire | 4 |
| Stratégies de raisonnement | 4 |
| Modes de sécurité | 3 |
| Max rounds | 30 |
| Startup | ~40ms |

---

## Ce Qui Vient Ensuite

L'architecture est en place. Le **Chapitre 16** détaille la sécurité en profondeur : system prompts, injection, sandboxing, et audit.

---

[Chapitre 14](14-apprentissage-persistant.md) | [Table des Matières](README.md) | [Chapitre 16](16-system-prompts-securite.md)
