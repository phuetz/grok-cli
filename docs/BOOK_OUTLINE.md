# Construire des Agents Cognitifs
## Architecture, Reasoning, RAG et Autonomie Outillée avec LLMs

**Auteur** : Patrice Huetz
**Basé sur** : Grok-CLI — Agent IA Open Source
**Année** : 2025

---

## Informations Éditoriales

| Élément | Détail |
|---------|--------|
| **Public cible** | Développeurs IA, architectes logiciels, chercheurs appliqués |
| **Niveau** | Intermédiaire à avancé |
| **Prérequis** | Python/TypeScript, notions LLM, API OpenAI/Anthropic |
| **Format estimé** | ~400 pages, 15 chapitres, 7 parties |
| **Code source** | https://github.com/phuetz/grok-cli |

---

# PARTIE I — Les Fondations d'un Agent Moderne

## Chapitre 1 — Comprendre les LLMs Aujourd'hui
*Pages estimées : 25-30*

### 1.1 Fonctionnement Interne
- Architecture Transformer (attention mechanism)
- Tokenization et embeddings
- Autoregressive generation
- Scaling laws et émergence

### 1.2 Limites Fondamentales
- Fenêtre de contexte (et pourquoi c'est un problème)
- Hallucinations : causes et patterns
- Absence de mémoire persistante
- Incapacité d'action directe

### 1.3 Pourquoi un Agent > un Simple Modèle
- Le paradigme "Reasoning + Acting" (ReAct)
- Augmentation par outils
- Boucle de feedback
- Autonomie contrôlée

**Diagramme 1.1** : Architecture LLM vs Architecture Agent
**Code Grok-CLI** : `src/grok/client.ts` — Wrapper OpenAI

---

## Chapitre 2 — Le Rôle des Agents dans l'Écosystème IA
*Pages estimées : 20-25*

### 2.1 Taxonomie des Systèmes IA
| Type | Capacités | Exemples |
|------|-----------|----------|
| Chatbot | Conversation simple | ChatGPT vanilla |
| Assistant | Conversation + contexte | Claude, Copilot |
| Agent | Reasoning + Action + Mémoire | AutoGPT, Grok-CLI |
| Multi-Agent | Coordination entre agents | MetaGPT, CrewAI |

### 2.2 Pourquoi 2023-2025 Représente un Tournant
- GPT-4 et le saut qualitatif
- Function calling natif
- Émergence des benchmarks agents (SWE-bench, WebArena)
- Standardisation (MCP Protocol)

### 2.3 Les Travaux Clés
| Publication | Contribution | Année |
|-------------|--------------|-------|
| Tree-of-Thought (ToT) | Exploration multi-chemins | 2023 |
| RethinkMCTS | MCTS pour LLMs | 2024 |
| FrugalGPT | Model routing économique | 2023 |
| LLMCompiler | Exécution parallèle | 2023 |
| ChatRepair | Réparation itérative | 2024 |
| CodeRAG | RAG avec dépendances | 2024 |

**Référence Grok-CLI** : Toutes implémentées dans `src/agent/` et `src/optimization/`

---

## Chapitre 3 — Anatomie d'un Agent Autonome
*Pages estimées : 30-35*

### 3.1 Les 6 Composants Fondamentaux

```
┌─────────────────────────────────────────────────────────────┐
│                     AGENT COGNITIF                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │REASONING│  │ MEMORY  │  │ ACTION  │  │LEARNING │        │
│  │ (ToT,   │  │ (Short, │  │ (Tools, │  │(Persist,│        │
│  │  MCTS)  │  │  Long)  │  │  APIs)  │  │ Adapt)  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       └────────────┴────────────┴────────────┘              │
│                         │                                   │
│  ┌──────────────────────┴──────────────────────┐           │
│  │              SECURITY & OBSERVABILITY        │           │
│  │         (Sandbox, Permissions, Logging)      │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Reasoning
- Décomposition de problèmes
- Exploration d'hypothèses
- Évaluation et sélection
- **Grok-CLI** : `src/agent/reasoning/`

### 3.3 Mémoire
- Court terme : conversation
- Moyen terme : session
- Long terme : embeddings + SQLite
- **Grok-CLI** : `src/database/`, `src/memory/`

### 3.4 Action
- Tool calling
- Exécution sandboxée
- Validation des résultats
- **Grok-CLI** : `src/tools/`

### 3.5 Apprentissage
- Patterns de réparation
- Conventions de code
- Statistiques d'outils
- **Grok-CLI** : `src/learning/`

### 3.6 Sécurité & Observabilité
- Modes d'approbation (read-only, auto, full)
- Redaction de données sensibles
- Logging structuré
- **Grok-CLI** : `src/security/`

---

# PARTIE II — Reasoning & Planification

## Chapitre 4 — Tree-of-Thought (ToT)
*Pages estimées : 35-40*

### 4.1 Principe Fondamental
- Limitation du reasoning linéaire
- Exploration arborescente
- Backtracking intelligent

### 4.2 Algorithme Détaillé

```typescript
// Pseudo-code ToT
interface ThoughtNode {
  content: string;
  score: number;
  children: ThoughtNode[];
  parent?: ThoughtNode;
}

async function treeOfThought(problem: string): Promise<Solution> {
  const root = await generateInitialThoughts(problem);

  for (const thought of root.children) {
    thought.score = await evaluateThought(thought);

    if (thought.score > THRESHOLD) {
      const expansions = await expandThought(thought);
      thought.children = expansions;
    }
  }

  return selectBestPath(root);
}
```

### 4.3 Implémentation Grok-CLI
- **Fichier** : `src/agent/reasoning/tree-of-thought.ts`
- Callbacks personnalisables
- Profondeur configurable (shallow/medium/deep/exhaustive)
- Intégration avec les keywords `think`, `megathink`, `ultrathink`

### 4.4 Cas Pratiques
1. Résolution de bugs complexes
2. Design d'architecture
3. Refactoring multi-fichiers

**Diagramme 4.1** : Arbre de pensées avec scores
**Exercice** : Implémenter ToT pour un problème de votre choix

---

## Chapitre 5 — Monte-Carlo Tree Search (MCTS)
*Pages estimées : 40-45*

### 5.1 Pourquoi MCTS Fonctionne avec les LLMs
- Exploration vs Exploitation (UCB1)
- Simulation sans coût réel
- Convergence vers les solutions optimales

### 5.2 Les 4 Phases du MCTS

```
┌──────────────────────────────────────────────────────────┐
│                    MCTS CYCLE                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│   │ SELECT  │───▶│ EXPAND  │───▶│SIMULATE │───▶│BACKPROP │
│   │         │    │         │    │(Rollout)│    │         │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘
│        │                                            │
│        └────────────────────────────────────────────┘
│                      (Repeat N times)
└──────────────────────────────────────────────────────────┘
```

### 5.3 Formule UCB1

```
UCB1(node) = (wins / visits) + C * sqrt(ln(parent_visits) / visits)
```

- `C` : constante d'exploration (typiquement √2)
- Balance exploration de nouveaux chemins vs exploitation des meilleurs

### 5.4 Implémentation Grok-CLI
- **Fichier** : `src/agent/reasoning/mcts.ts`
- Heuristiques adaptatives
- Rollout avec exécution réelle de code
- Scoring basé sur les tests

### 5.5 Combinaison ToT + MCTS
- ToT pour la structure
- MCTS pour l'optimisation
- Synergie unique de Grok-CLI

**Diagramme 5.1** : MCTS avec UCB1 visualisé
**Code complet** : Algorithme MCTS commenté

---

## Chapitre 6 — Repair, Réflexion et Auto-Amélioration
*Pages estimées : 35-40*

### 6.1 Le Problème de la Réparation Automatique
- Pourquoi les LLMs échouent souvent au premier essai
- L'importance du feedback
- Repair vs Regeneration

### 6.2 ChatRepair (ISSTA 2024)
- Localisation précise des fautes
- Génération de patches candidats
- Validation par tests
- Boucle itérative

### 6.3 Fault Localization
| Technique | Formule | Usage |
|-----------|---------|-------|
| Ochiai | `failed / sqrt((failed+passed) * total_failed)` | General |
| DStar | `failed² / (passed + (total_failed - failed))` | High precision |
| Tarantula | `(failed/total_failed) / ((failed/total_failed) + (passed/total_passed))` | Balanced |

### 6.4 Implémentation Grok-CLI
- **Fichiers** :
  - `src/agent/repair/iterative-repair.ts`
  - `src/agent/repair/fault-localization.ts`
  - `src/agent/repair/repair-templates.ts`
- 30+ templates de réparation
- Apprentissage des patterns qui fonctionnent

### 6.5 Boucles de Réflexion
```
┌────────────────────────────────────────────────┐
│              REPAIR LOOP                       │
├────────────────────────────────────────────────┤
│  Error ──▶ Localize ──▶ Generate ──▶ Test     │
│    ▲                                    │      │
│    │         (if fail)                  │      │
│    └────────────────────────────────────┘      │
│                   (if pass) ──▶ Apply          │
└────────────────────────────────────────────────┘
```

---

# PARTIE III — Mémoire, RAG et Contexte

## Chapitre 7 — RAG Moderne
*Pages estimées : 30-35*

### 7.1 RAG Classique vs RAG Cognitif

| Aspect | RAG Classique | RAG Cognitif |
|--------|---------------|--------------|
| Retrieval | Similarité cosine | Multi-critères |
| Chunks | Taille fixe | Sémantique |
| Context | Concaténation | Structured injection |
| Feedback | Aucun | Correctif |

### 7.2 Architecture RAG pour le Code
- Parsing AST
- Chunking par fonction/classe
- Embeddings spécialisés code
- **Grok-CLI** : `src/context/codebase-rag/`

### 7.3 Retrieval Hybride
- TF-IDF pour keywords
- Embeddings pour sémantique
- Reranking avec cross-encoder

---

## Chapitre 8 — Dependency-Aware RAG
*Pages estimées : 35-40*

### 8.1 Le Problème du Contexte Isolé
- Un fichier seul ne suffit pas
- Les imports sont critiques
- Les types transitifs comptent

### 8.2 Graphe de Dépendances

```
┌─────────────────────────────────────────────────────────┐
│                 DEPENDENCY GRAPH                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│    ┌─────────┐         ┌─────────┐                     │
│    │ index.ts│────────▶│ agent.ts│                     │
│    └─────────┘         └────┬────┘                     │
│         │                   │                          │
│         ▼                   ▼                          │
│    ┌─────────┐         ┌─────────┐                     │
│    │ tools.ts│◀────────│ types.ts│                     │
│    └─────────┘         └─────────┘                     │
│                                                         │
│    Query: "agent.ts" ──▶ Returns: agent.ts + types.ts  │
└─────────────────────────────────────────────────────────┘
```

### 8.3 Implémentation CodeRAG
- **Fichier** : `src/context/dependency-aware-rag.ts`
- Analyse statique des imports
- Propagation transitive
- Scoring par distance

---

## Chapitre 9 — Context Compression & Masking
*Pages estimées : 30-35*

### 9.1 JetBrains Research (2024)
- -7% coûts
- +2.6% taux de succès
- Compression intelligente

### 9.2 Techniques de Compression
| Technique | Description | Réduction |
|-----------|-------------|-----------|
| Priority-based | Garde les sections importantes | 40-60% |
| Semantic dedup | Élimine redondances | 20-30% |
| Token budget | Respecte limites | Variable |

### 9.3 Observation Masking
- Masquer les outputs d'outils non pertinents
- Réduire le bruit
- **Grok-CLI** : `src/context/observation-masking.ts`

---

# PARTIE IV — Action et Outils

## Chapitre 10 — Tool-Use et Tool-Calling
*Pages estimées : 35-40*

### 10.1 Anatomie d'un Outil

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute: (args: unknown) => Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}
```

### 10.2 Les 41 Outils de Grok-CLI
| Catégorie | Outils | Fichiers |
|-----------|--------|----------|
| Fichiers | read, write, edit, multi-edit | `src/tools/text-editor.ts` |
| Shell | bash, interactive-bash | `src/tools/bash.ts` |
| Recherche | search, enhanced-search | `src/tools/enhanced-search.ts` |
| Git | git-tool | `src/tools/git-tool.ts` |
| Médias | audio, video, screenshot | `src/tools/audio-tool.ts` |
| Documents | pdf, excel, archive | `src/tools/pdf-tool.ts` |

### 10.3 Validation et Sécurité
- Schemas JSON stricts
- Confirmation utilisateur
- Sandbox d'exécution

---

## Chapitre 11 — Plugins & Dynamic Tool Loading
*Pages estimées : 30-35*

### 11.1 Architecture Pluginisée
- Chargement dynamique
- Isolation par worker
- Permissions granulaires

### 11.2 MCP Protocol
- Standard Anthropic
- Transport stdio/HTTP/SSE
- Découverte de tools
- **Grok-CLI** : `src/mcp/`

### 11.3 Marketplace Interne
- **Fichier** : `src/plugins/marketplace.ts`
- Installation à chaud
- Versioning

---

# PARTIE V — Optimisation & Performance

## Chapitre 12 — Optimisations Cognitives
*Pages estimées : 25-30*

### 12.1 Semantic Response Cache
- Similarité cosine sur prompts
- TTL intelligent
- 68% réduction d'appels API
- **Grok-CLI** : `src/utils/semantic-cache.ts`

### 12.2 Tool Result Cache
- LRU + TTL
- Clés basées sur arguments
- **Grok-CLI** : `src/performance/tool-cache.ts`

### 12.3 Pré-réflexions
- Warming du contexte
- Préchargement de dépendances
- Smart preloader

---

## Chapitre 13 — Optimisations Système
*Pages estimées : 35-40*

### 13.1 FrugalGPT Model Routing
| Complexité | Modèle | Coût |
|------------|--------|------|
| Simple | grok-3-mini | $ |
| Standard | grok-3 | $$ |
| Complex | grok-4 | $$$ |
| Critical | grok-4 + ToT | $$$$ |

- **Fichier** : `src/optimization/model-routing.ts`
- 30-70% réduction de coûts

### 13.2 LLMCompiler Parallel Executor
- Analyse de dépendances entre tools
- Exécution parallèle quand possible
- 2.5-4.6x speedup
- **Fichier** : `src/optimization/parallel-executor.ts`

### 13.3 Lazy Loading
- Modules chargés à la demande
- Startup 75x plus rapide (3s → 37ms)
- **Fichier** : `src/performance/lazy-loader.ts`

---

# PARTIE VI — Mémoire Longue Durée & Apprentissage

## Chapitre 14 — Persistent Learning
*Pages estimées : 30-35*

### 14.1 Ce que Grok-CLI Apprend

| Type | Stockage | Usage |
|------|----------|-------|
| Repair patterns | `repair_learning` table | Réutiliser ce qui marche |
| Conventions | `conventions` table | Respecter le style du projet |
| Tool stats | `tool_stats` table | Optimiser les choix d'outils |

### 14.2 Feedback Loops
- Succès/échec des réparations
- Temps d'exécution des outils
- Patterns de code acceptés

### 14.3 Skills Émergentes
- L'agent "apprend" vos préférences
- Amélioration continue
- **Fichier** : `src/learning/persistent-learning.ts`

---

# PARTIE VII — Étude de Cas : Grok-CLI

## Chapitre 15 — Grok-CLI : Architecture Complète d'un Agent Moderne
*Pages estimées : 50-60*

### 15.1 Vision
> "Un agent IA de développement qui surpasse les outils existants par son intelligence cognitive et son apprentissage continu."

### 15.2 Diagramme d'Architecture Complet

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GROK-CLI                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        USER INTERFACE                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │   CLI   │  │   TUI   │  │  Voice  │  │ Browser │            │   │
│  │  │(Ink/React)│ │ (Chat)  │  │(Whisper)│  │  (WIP)  │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                      AGENT CORE                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │                   GrokAgent                              │    │   │
│  │  │  • Agentic loop (max 400 rounds)                        │    │   │
│  │  │  • Tool orchestration                                    │    │   │
│  │  │  • Self-healing                                          │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │ Reasoning│  │Multi-Agent│  │ Repair   │  │Specialized│        │   │
│  │  │ ToT+MCTS │  │Coordinator│  │ Engine   │  │  Agents   │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                      TOOLS (41)                                  │   │
│  │  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐        │   │
│  │  │bash││edit││read││git ││srch││pdf ││sql ││img ││...│        │   │
│  │  └────┘└────┘└────┘└────┘└────┘└────┘└────┘└────┘└────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                      CONTEXT & RAG                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │Dependency│  │ Context  │  │Observation│  │ Semantic │        │   │
│  │  │Aware RAG │  │Compressor│  │  Masking │  │   Map    │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                   PERSISTENCE & LEARNING                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │  SQLite  │  │Embeddings│  │ Learning │  │  Cache   │        │   │
│  │  │(11 tables)│ │ (Local)  │  │(Patterns)│  │(Semantic)│        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                      SECURITY                                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │ Approval │  │ Sandbox  │  │ Redaction│  │Permission│        │   │
│  │  │  Modes   │  │(firejail)│  │ (secrets)│  │  Config  │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                    OPTIMIZATION                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │  Model   │  │ Parallel │  │   Tool   │  │  Latency │        │   │
│  │  │ Routing  │  │ Executor │  │ Filtering│  │ Optimizer│        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 15.3 Modules Détaillés

#### Reasoning
| Module | Fichier | Fonction |
|--------|---------|----------|
| Tree-of-Thought | `tree-of-thought.ts` | Exploration multi-chemins |
| MCTS | `mcts.ts` | Optimisation par simulation |
| Extended Thinking | `extended-thinking.ts` | think/megathink/ultrathink |

#### Multi-Agents
| Agent | Fichier | Spécialisation |
|-------|---------|----------------|
| Orchestrator | `orchestrator-agent.ts` | Planification |
| Coder | `coder-agent.ts` | Génération de code |
| Reviewer | `reviewer-agent.ts` | Code review |
| Tester | `tester-agent.ts` | Tests |
| PDF Agent | `pdf-agent.ts` | Documents PDF |
| Excel Agent | `excel-agent.ts` | Tableurs |
| SQL Agent | `sql-agent.ts` | Bases de données |

#### Plugins
- MCP Protocol support
- Dynamic loading
- Sandboxed execution
- Marketplace

#### RAG
- Dependency-aware retrieval
- Context compression
- Observation masking
- Semantic mapping

#### Sécurité
- 3 modes : read-only, auto, full-access
- Sandbox avec firejail
- Redaction automatique de secrets
- Validation des commandes

#### Persistance
| Table | Usage |
|-------|-------|
| memories | Mémoire avec embeddings |
| sessions | Historique conversations |
| messages | Messages individuels |
| code_embeddings | Recherche sémantique |
| tool_stats | Statistiques outils |
| repair_learning | Patterns de réparation |
| analytics | Métriques d'usage |
| conventions | Conventions de code |
| checkpoints | Points de sauvegarde |
| cache | Cache haute performance |

#### Caching
- Semantic response cache (68% réduction API)
- Tool result cache (LRU + TTL)
- Template caching

#### Embeddings
| Provider | Dimensions | Coût |
|----------|------------|------|
| Local (@xenova/transformers) | 384 | Gratuit |
| OpenAI | 1536-3072 | Payant |
| Grok | Variable | Payant |

### 15.4 Pourquoi ce Design Fonctionne

1. **Modularité** — Chaque composant est remplaçable
2. **Testabilité** — 1,601 tests, couverture en croissance
3. **Performance** — Startup 37ms, caching agressif
4. **Sécurité** — Multi-couches, defense in depth
5. **Évolutivité** — Plugin system, MCP support

### 15.5 Limitations et Évolutions Possibles

| Limitation | Solution Envisagée |
|------------|-------------------|
| Dépendance au cloud | Mode offline renforcé |
| Coûts API | Model routing + caching |
| Hallucinations | Repair loop + validation |
| Contexte limité | RAG + compression |

### 15.6 Comment Cloner ou Étendre Grok-CLI

```bash
# Cloner le projet
git clone https://github.com/phuetz/grok-cli.git
cd grok-cli

# Installer les dépendances
npm install

# Configurer
export GROK_API_KEY=your_key

# Lancer
npm run dev

# Étendre avec un nouvel outil
# 1. Créer src/tools/my-tool.ts
# 2. Implémenter l'interface Tool
# 3. Enregistrer dans src/grok/tools.ts
```

---

# Annexes

## A. Références Bibliographiques

1. Yao, S., et al. (2023). "Tree of Thoughts: Deliberate Problem Solving with Large Language Models." arXiv:2305.10601
2. Zhang, D., et al. (2024). "RethinkMCTS: Refining Erroneous Thoughts in Monte Carlo Tree Search for Code Generation." arXiv:2404.09932
3. Chen, L., et al. (2023). "FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance." arXiv:2305.05176
4. Kim, S., et al. (2023). "LLMCompiler: An LLM Compiler for Parallel Function Calling." arXiv:2312.04511
5. Xia, C., et al. (2024). "ChatRepair: Autonomous Program Repair with ChatGPT." ISSTA 2024
6. JetBrains Research. (2024). "Context Compression for Code Generation."

## B. Glossaire

| Terme | Définition |
|-------|------------|
| **ToT** | Tree-of-Thought, technique d'exploration multi-chemins |
| **MCTS** | Monte-Carlo Tree Search, optimisation par simulation |
| **RAG** | Retrieval-Augmented Generation |
| **MCP** | Model Context Protocol, standard Anthropic |
| **Embedding** | Représentation vectorielle d'un texte |

## C. Index du Code Source

```
src/
├── agent/
│   ├── reasoning/          # ToT, MCTS
│   ├── repair/             # ChatRepair
│   ├── multi-agent/        # Coordination
│   └── specialized/        # Agents spécialisés
├── context/
│   ├── codebase-rag/       # RAG
│   └── context-compressor.ts
├── tools/                  # 41 outils
├── database/               # SQLite
├── security/               # Sandbox, permissions
├── optimization/           # FrugalGPT, LLMCompiler
└── performance/            # Caching, lazy loading
```

---

*© 2025 Patrice Huetz — Tous droits réservés*
