# Plan de Mise à Jour de CLAUDE.md

**Date**: 9 Décembre 2025
**Objectif**: Documenter les 20+ modules manquants dans CLAUDE.md
**Priorité**: 🔴 Haute

---

## Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Modules à Ajouter](#modules-à-ajouter)
3. [Classes Importantes à Documenter](#classes-importantes-à-documenter)
4. [Mise à Jour des Tableaux](#mise-à-jour-des-tableaux)
5. [Diff Proposé](#diff-proposé)

---

## Vue d'Ensemble

### Statistiques Actuelles

- **Modules documentés**: 25/45 (56%)
- **Modules manquants**: 20 (44%)
- **Lignes à ajouter**: ~150-200

### Modules Critiques Manquants

| Module | Impact | Documentation Nécessaire |
|--------|--------|--------------------------|
| `src/commands/` | 🔴 Critique | Slash commands system |
| `src/lsp/` | 🔴 Critique | Language Server Protocol |
| `src/sandbox/` | 🔴 Critique | Docker sandbox |
| `src/plugins/` | 🔴 Critique | Plugin marketplace |
| `src/browser/` | 🟡 Important | Embedded browser |
| `src/integrations/` | 🟡 Important | External integrations |
| `src/modes/` | 🟡 Important | Agent modes |
| Autres | 🟢 Moindre | 13 modules restants |

---

## Modules à Ajouter

### 1. Browser (src/browser/)

```markdown
- **src/browser/** - Embedded browser for web automation and testing
  - **src/browser/embedded-browser.ts** - Puppeteer-based browser with screenshot, navigation, and interaction capabilities
```

**Détails**:
- Utilisé pour: Web scraping, testing, screenshots
- Technologies: Puppeteer
- Features: Navigation, screenshot, form interaction

---

### 2. Checkpoints (src/checkpoints/)

```markdown
- **src/checkpoints/** - Checkpoint system for undo/redo operations with file versioning
  - **src/checkpoints/checkpoint-manager.ts** - In-memory checkpoint storage with rollback
  - **src/checkpoints/persistent-checkpoint-manager.ts** - SQLite-backed persistent checkpoints
```

**Détails**:
- Tables DB: `checkpoints`, `checkpoint_files`
- Features: Undo/redo, file versioning, rollback
- Intégration: Database manager

---

### 3. Collaboration (src/collaboration/)

```markdown
- **src/collaboration/** - Team collaboration features for shared coding sessions
  - **src/collaboration/collaborative-mode.ts** - Real-time collaboration with WebSockets
  - **src/collaboration/team-session.ts** - Multi-user session management
```

**Détails**:
- Features: Shared sessions, real-time sync
- Technologies: WebSockets, session tokens
- Use cases: Pair programming, code review

---

### 4. Commands (src/commands/) 🔴

```markdown
- **src/commands/** - Slash commands system for interactive control
  - **src/commands/slash-commands.ts** - Command parser and dispatcher with validation
  - **src/commands/enhanced-command-handler.ts** - Advanced command handling with context
  - **src/commands/custom-commands.ts** - User-defined custom commands
  - **src/commands/handlers/** - Command handlers organized by category
    - **core-handlers.ts** - Core commands (/help, /clear, /model)
    - **stats-handlers.ts** - Statistics commands (/stats, /performance)
    - **security-handlers.ts** - Security commands (/security, /mode)
    - **memory-handlers.ts** - Memory commands (/memory, /forget)
    - **voice-handlers.ts** - Voice commands (/voice, /speak)
    - **test-handlers.ts** - Testing commands (/test, /coverage)
    - **context-handlers.ts** - Context commands (/context, /preload)
    - **branch-handlers.ts** - Git branch commands (/branch, /merge)
    - **ui-handlers.ts** - UI commands (/theme, /layout)
```

**Détails**:
- Total slash commands: 40+
- Catégories: Core, Stats, Security, Memory, Voice, Test, Context, Git, UI
- Validation: Input validation, permission checks
- Extensibilité: Custom commands support

---

### 5. Config (src/config/)

```markdown
- **src/config/** - Configuration management and validation
  - **src/config/config-loader.ts** - Multi-source configuration loading (file, env, CLI)
  - **src/config/config-validator.ts** - Schema validation with Zod
```

**Détails**:
- Sources: User settings, project settings, environment, CLI args
- Validation: Zod schemas
- Priority: CLI > Env > User > Project > Defaults

---

### 6. Features (src/features/)

```markdown
- **src/features/** - Feature flags and experimental features management
  - **src/features/index.ts** - Feature flag evaluation and rollout
```

**Détails**:
- Use cases: A/B testing, gradual rollout
- Configuration: Per-user, per-project
- Examples: New reasoning modes, experimental tools

---

### 7. Input (src/input/)

```markdown
- **src/input/** - Advanced input handling and validation
  - **src/input/input-handler.ts** - Multi-modal input (text, voice, file)
  - **src/input/input-validator.ts** - Input sanitization and validation
```

**Détails**:
- Modalities: Text, voice (Whisper), file upload
- Validation: XSS prevention, command injection protection
- Features: Auto-completion, syntax highlighting

---

### 8. Integrations (src/integrations/) 🟡

```markdown
- **src/integrations/** - External service integrations
  - **src/integrations/github-integration.ts** - GitHub API integration (issues, PRs, repos)
  - **src/integrations/ide-protocol.ts** - IDE communication protocol (VS Code, JetBrains)
```

**Détails**:
- GitHub: Issues, PRs, commits, releases
- IDE: VS Code extension protocol, JetBrains plugin
- Authentication: OAuth, tokens

---

### 9. LSP (src/lsp/) 🔴

```markdown
- **src/lsp/** - Language Server Protocol implementation for advanced code intelligence
  - **src/lsp/server.ts** - LSP server with go-to-definition, references, hover
  - **src/lsp/client.ts** - LSP client for external language servers
```

**Détails**:
- Features: Go to definition, find references, hover, completion
- Languages: TypeScript, Python, Go
- Integration: AST parser, symbol search

---

### 10. Modes (src/modes/) 🟡

```markdown
- **src/modes/** - Specialized agent modes for different workflows
  - **src/modes/code-review.ts** - Code review mode with automated checks
  - **src/modes/architect-mode.ts** - Architecture planning mode
  - **src/modes/refactor-mode.ts** - Refactoring mode with safety checks
```

**Détails**:
- Modes: code-review, architect, refactor, test, debug
- Features: Mode-specific prompts, tools, validations
- Switching: `/mode <mode-name>`

---

### 11. Observability (src/observability/)

```markdown
- **src/observability/** - Observability dashboard with metrics and tracing
  - **src/observability/dashboard.ts** - Real-time metrics dashboard
  - **src/observability/tracer.ts** - Distributed tracing for tool calls
```

**Détails**:
- Metrics: Latency, throughput, error rate, cache hit rate
- Tracing: Tool call spans, API call traces
- Visualization: Terminal dashboard, export to Prometheus

---

### 12. Offline (src/offline/)

```markdown
- **src/offline/** - Offline mode with local LLM support
  - **src/offline/offline-mode.ts** - Offline detection and fallback
  - **src/offline/local-cache.ts** - Aggressive caching for offline use
```

**Détails**:
- Detection: Network status monitoring
- Fallback: Local LLMs (Ollama, LM Studio)
- Caching: Aggressive caching of responses, embeddings

---

### 13. Personas (src/personas/)

```markdown
- **src/personas/** - Persona system for customized agent behavior
  - **src/personas/persona-manager.ts** - Persona loading and switching
  - **src/personas/default-personas.ts** - Built-in personas (senior dev, reviewer, tester)
```

**Détails**:
- Personas: Senior dev, code reviewer, tester, architect
- Customization: Custom system prompts, tool preferences
- Use cases: Role-based interactions

---

### 14. Plugins (src/plugins/) 🔴

```markdown
- **src/plugins/** - Plugin system with marketplace and sandboxed execution
  - **src/plugins/marketplace.ts** - Plugin discovery, installation, and updates
  - **src/plugins/sandbox-worker.ts** - Isolated plugin execution with resource limits
  - **src/plugins/plugin-api.ts** - Plugin API for custom tools and agents
```

**Détails**:
- Marketplace: npmjs.com based, semver versioning
- Sandbox: Worker threads, resource limits (CPU, memory)
- API: Tool registration, agent extension, UI components
- Security: Code signing, permissions, audit logs

---

### 15. Prompts (src/prompts/)

```markdown
- **src/prompts/** - System prompt templates and management
  - **src/prompts/system-base.ts** - Base system prompt with research-based improvements
  - **src/prompts/index.ts** - Prompt loading and composition
```

**Détails**:
- Templates: Base, mode-specific, persona-specific
- Composition: Layered prompts (base + mode + persona + project)
- Research: Optimized prompts based on Claude Code, Cursor patterns

---

### 16. Providers (src/providers/)

```markdown
- **src/providers/** - LLM provider abstraction layer
  - **src/providers/llm-provider.ts** - Universal LLM provider interface
  - **src/providers/local-llm-provider.ts** - Local LLM support (Ollama, LM Studio, llama.cpp)
```

**Détails**:
- Providers: Grok (xAI), OpenAI, Anthropic, local (Ollama, LM Studio)
- Interface: Unified API (chat, streaming, tool calls)
- Features: Auto-detection, fallback, load balancing

---

### 17. Sandbox (src/sandbox/) 🔴

```markdown
- **src/sandbox/** - Sandboxed execution environment for untrusted code
  - **src/sandbox/docker-sandbox.ts** - Docker-based command isolation with resource limits
  - **src/sandbox/firejail-sandbox.ts** - Firejail-based lightweight sandboxing
```

**Détails**:
- Technologies: Docker, Firejail
- Resource limits: CPU, memory, network, filesystem
- Use cases: Running untrusted bash commands, testing code
- Security: No host filesystem access, network isolation

---

### 18. Services (src/services/)

```markdown
- **src/services/** - High-level services and business logic
  - **src/services/codebase-explorer.ts** - Codebase exploration and navigation
  - **src/services/plan-generator.ts** - Task planning and decomposition
```

**Détails**:
- Codebase Explorer: Project structure, dependency graph, symbol search
- Plan Generator: Task decomposition, prioritization, estimation

---

### 19. Tasks (src/tasks/)

```markdown
- **src/tasks/** - Background task management and scheduling
  - **src/tasks/background-tasks.ts** - Task queue with priorities and retries
  - **src/tasks/scheduler.ts** - Cron-like scheduling for periodic tasks
```

**Détails**:
- Features: Priority queue, retries, concurrency control
- Use cases: Periodic codebase indexing, cache cleanup
- Storage: SQLite-backed task queue

---

### 20. Templates (src/templates/)

```markdown
- **src/templates/** - Project scaffolding templates
  - **src/templates/project-scaffolding.ts** - Project template generation (React, Node.js, etc.)
  - **src/templates/code-templates.ts** - Code snippet templates
```

**Détails**:
- Templates: React, Vue, Node.js, Python, Go
- Features: Customizable templates, placeholders
- Integration: `/create-project <template>`

---

### 21. Themes (src/themes/)

```markdown
- **src/themes/** - UI theme system with customization
  - **src/themes/theme-manager.ts** - Theme loading and switching
  - **src/themes/default-themes.ts** - Built-in themes (dark, light, solarized)
  - **src/themes/theme.ts** - Theme schema and types
```

**Détails**:
- Themes: Dark, light, solarized, custom
- Customization: Colors, fonts, spacing
- Command: `/theme <theme-name>`

---

## Classes Importantes à Documenter

### Section "Important Classes" - Ajouts

```markdown
- `CommandHandler` (src/commands/enhanced-command-handler.ts) - Enhanced command handling with context awareness
- `PluginManager` (src/plugins/marketplace.ts) - Plugin discovery, installation, and lifecycle management
- `DockerSandbox` (src/sandbox/docker-sandbox.ts) - Docker-based sandboxed execution with resource limits
- `LSPServer` (src/lsp/server.ts) - Language Server Protocol implementation for code intelligence
- `BrowserAgent` (src/browser/embedded-browser.ts) - Puppeteer-based browser automation
- `CheckpointManager` (src/checkpoints/checkpoint-manager.ts) - File versioning and undo/redo functionality
- `PersonaManager` (src/personas/persona-manager.ts) - Persona-based agent behavior customization
- `ThemeManager` (src/themes/theme-manager.ts) - UI theme management and customization
- `LocalLLMProvider` (src/providers/local-llm-provider.ts) - Local LLM support (Ollama, LM Studio)
- `CodebaseExplorer` (src/services/codebase-explorer.ts) - Project structure exploration and navigation
- `PlanGenerator` (src/services/plan-generator.ts) - Automated task planning and decomposition
- `BackgroundTasks` (src/tasks/background-tasks.ts) - Priority-based task queue with retries
```

---

## Mise à Jour des Tableaux

### Database System - Nouvelle Table

Ajouter dans la section "Database System":

```markdown
| Table | Purpose |
|-------|---------|
| ... (tables existantes) ... |
| `plugins` | Installed plugins with versions and metadata |
| `plugin_permissions` | Plugin permissions and access control |
```

### Slash Commands - Expansion

Remplacer le tableau existant par:

```markdown
### Slash Commands

Key interactive commands available during sessions:

| Command | Description | Category |
|---------|-------------|----------|
| `/help` | Show available commands | Core |
| `/clear` | Clear chat history | Core |
| `/model [name]` | Switch AI model | Core |
| `/mode <plan\|code\|ask>` | Change agent mode | Agent |
| `/stats [action]` | Performance statistics | Stats |
| `/security [action]` | Security dashboard | Security |
| `/cost [action]` | Cost tracking | Analytics |
| `/commit` | Generate and create git commit | Git |
| `/review` | Code review of current changes | Code |
| `/test` | Run and analyze tests | Testing |
| `/explain [file]` | Explain code | Code |
| `/voice [on\|off\|toggle]` | Voice control | Input |
| `/speak <text>` | Text-to-speech | Output |
| `/theme <name>` | Change UI theme | UI |
| `/plugin <action>` | Plugin management | Plugins |
| `/sandbox <on\|off>` | Toggle sandbox mode | Security |
| `/context <action>` | Context management | Context |
| `/branch <action>` | Git branch operations | Git |
| `/memory <action>` | Memory management | Memory |
```

---

## Diff Proposé

### Avant (Section Key Directories)

```markdown
### Key Directories

- **src/agent/** - Core agent logic, multi-agent system, reasoning (Tree-of-Thought/MCTS), auto-repair engine
  - **src/agent/repair/** - Iterative repair engine with test feedback loop (ChatRepair-inspired)
  - **src/agent/multi-agent/** - Multi-agent coordination with adaptive task allocation
  - **src/agent/specialized/** - Specialized agents for PDF, Excel, SQL, archives, data analysis
  - **src/agent/thinking-keywords.ts** - Extended thinking triggers (think/megathink/ultrathink)
- **src/tools/** - Tool implementations (file ops, bash, search, multi-edit) and code intelligence suite
  - **src/tools/enhanced-search.ts** - High-performance search with bundled ripgrep, symbol search, LRU caching
- **src/tools/intelligence/** - AST parser, symbol search, dependency analyzer, refactoring assistant
```

### Après (avec tous les modules)

```markdown
### Key Directories

- **src/agent/** - Core agent logic, multi-agent system, reasoning (Tree-of-Thought/MCTS), auto-repair engine
  - **src/agent/repair/** - Iterative repair engine with test feedback loop (ChatRepair-inspired)
  - **src/agent/multi-agent/** - Multi-agent coordination with adaptive task allocation
  - **src/agent/specialized/** - Specialized agents for PDF, Excel, SQL, archives, data analysis
  - **src/agent/thinking-keywords.ts** - Extended thinking triggers (think/megathink/ultrathink)
+ **src/analytics/** - Analytics and cost tracking with budget alerts
+   - **src/analytics/persistent-analytics.ts** - SQLite-backed analytics with daily/weekly/monthly aggregation
+   - **src/analytics/dashboard.ts** - Real-time analytics dashboard
+ **src/browser/** - Embedded browser for web automation and testing
+   - **src/browser/embedded-browser.ts** - Puppeteer-based browser with screenshot, navigation, interaction
+ **src/checkpoints/** - Checkpoint system for undo/redo operations
+   - **src/checkpoints/checkpoint-manager.ts** - In-memory checkpoint storage
+   - **src/checkpoints/persistent-checkpoint-manager.ts** - SQLite-backed persistent checkpoints
+ **src/collaboration/** - Team collaboration features
+   - **src/collaboration/collaborative-mode.ts** - Real-time collaboration with WebSockets
+   - **src/collaboration/team-session.ts** - Multi-user session management
+ **src/commands/** - Slash commands system (40+ commands)
+   - **src/commands/slash-commands.ts** - Command parser and dispatcher
+   - **src/commands/enhanced-command-handler.ts** - Advanced command handling
+   - **src/commands/handlers/** - Organized command handlers (core, stats, security, memory, etc.)
+ **src/config/** - Configuration management and validation
- **src/context/** - Codebase RAG, semantic mapping, context management
  - **src/context/context-compressor.ts** - Intelligent context compression (JetBrains research)
  - **src/context/dependency-aware-rag.ts** - RAG with dependency graph integration (CodeRAG)
  - **src/context/observation-masking.ts** - Tool output masking for irrelevant results
  - **src/context/cross-encoder-reranker.ts** - Cross-encoder reranking for improved RAG precision
+ **src/database/** - SQLite database for persistent storage
+   - **src/database/schema.ts** - Database schema with 14 tables
+   - **src/database/database-manager.ts** - Connection management, migrations, WAL mode
+   - **src/database/repositories/** - Repository pattern for each entity
+ **src/embeddings/** - Vector embeddings for semantic search
+   - **src/embeddings/embedding-provider.ts** - Local (transformers.js) or API-based embeddings
+ **src/features/** - Feature flags and experimental features
- **src/codebuddy/** - Grok API client wrapper and tool definitions
- **src/hooks/** - Event hooks system (PreToolUse, PostToolUse, etc.)
+ **src/input/** - Advanced input handling and validation
+ **src/integrations/** - External service integrations
+   - **src/integrations/github-integration.ts** - GitHub API integration
+   - **src/integrations/ide-protocol.ts** - IDE communication protocol
+ **src/learning/** - Persistent learning system
+   - **src/learning/persistent-learning.ts** - Repair strategies, conventions, tool effectiveness
+ **src/lsp/** - Language Server Protocol implementation
+   - **src/lsp/server.ts** - LSP server with go-to-definition, references, hover
- **src/mcp/** - Model Context Protocol integration
- **src/memory/** - Persistent memory system (4 types: episodic, semantic, procedural, prospective)
  - **src/memory/prospective-memory.ts** - Goal-oriented memory for tasks, goals, reminders
  - **src/memory/enhanced-memory.ts** - Unified memory with vector embeddings
+ **src/modes/** - Specialized agent modes
+   - **src/modes/code-review.ts** - Code review mode with automated checks
+ **src/observability/** - Observability dashboard with metrics and tracing
+ **src/offline/** - Offline mode with local LLM support
- **src/optimization/** - Research-based LLM optimizations
  - **src/optimization/tool-filtering.ts** - Dynamic tool filtering (Less-is-More research)
  - **src/optimization/model-routing.ts** - Tiered model routing (FrugalGPT)
  - **src/optimization/parallel-executor.ts** - Parallel tool execution (LLMCompiler)
  - **src/optimization/latency-optimizer.ts** - Latency optimization for flow state
- **src/performance/** - Performance optimization module
  - **src/performance/performance-manager.ts** - Central performance orchestrator
  - **src/performance/lazy-loader.ts** - Lazy loading for heavy modules
  - **src/performance/tool-cache.ts** - Semantic caching for tool calls
  - **src/performance/request-optimizer.ts** - Request batching and deduplication
+ **src/persistence/** - Session persistence and export
+   - **src/persistence/session-store.ts** - Session management with SQLite
+   - **src/persistence/session-export.ts** - Export sessions to JSON/Markdown
+ **src/personas/** - Persona system for customized agent behavior
+ **src/plugins/** - Plugin system with marketplace
+   - **src/plugins/marketplace.ts** - Plugin discovery and installation
+   - **src/plugins/sandbox-worker.ts** - Isolated plugin execution
+ **src/prompts/** - System prompt templates and management
+   - **src/prompts/system-base.ts** - Research-based system prompts
+ **src/providers/** - LLM provider abstraction
+   - **src/providers/llm-provider.ts** - Universal LLM provider interface
+   - **src/providers/local-llm-provider.ts** - Local LLM support (Ollama, LM Studio)
+ **src/renderers/** - Specialized output renderers
+   - **src/renderers/render-manager.ts** - Central render orchestration
+   - **src/renderers/specialized/** - Test results, weather, code structure renderers
+ **src/sandbox/** - Sandboxed execution environment
+   - **src/sandbox/docker-sandbox.ts** - Docker-based command isolation
- **src/security/** - Security and permission systems
  - **src/security/index.ts** - Unified security manager
  - **src/security/approval-modes.ts** - Three-tier approval system (read-only/auto/full-access)
  - **src/security/data-redaction.ts** - Automatic sensitive data masking
+ **src/services/** - High-level services and business logic
+   - **src/services/codebase-explorer.ts** - Codebase exploration
+   - **src/services/plan-generator.ts** - Task planning and decomposition
+ **src/skills/** - Auto-activating specialized abilities
+ **src/tasks/** - Background task management
+   - **src/tasks/background-tasks.ts** - Priority-based task queue
+ **src/templates/** - Project scaffolding templates
+   - **src/templates/project-scaffolding.ts** - Project generation (React, Node.js, etc.)
+ **src/testing/** - AI-powered integration testing
+ **src/themes/** - UI theme system
+   - **src/themes/theme-manager.ts** - Theme loading and switching
- **src/tools/** - Tool implementations (file ops, bash, search, multi-edit) and code intelligence suite
  - **src/tools/enhanced-search.ts** - High-performance search with bundled ripgrep, symbol search, LRU caching
- **src/tools/intelligence/** - AST parser, symbol search, dependency analyzer, refactoring assistant
- **src/types/** - Type definitions and interfaces
- **src/ui/** - Terminal UI components using React 18 + Ink 4
  - **src/ui/components/error-boundary.tsx** - React error boundaries for crash resilience
+ **src/undo/** - Undo/redo system (alias for checkpoints)
- **src/utils/** - Utility modules
  - **src/utils/semantic-cache.ts** - Semantic API response caching (68% API reduction)
  - **src/utils/shell-completions.ts** - Bash/zsh/fish completion scripts
```

---

## Checklist de Mise à Jour

### Phase 1: Préparation (30 min)

- [ ] Lire ce document en entier
- [ ] Faire une sauvegarde de CLAUDE.md
- [ ] Créer une branche git `docs/update-claude-md`

### Phase 2: Ajouts des Modules (2-3 heures)

- [ ] Ajouter les 21 modules dans "Key Directories"
- [ ] Maintenir l'ordre alphabétique
- [ ] Vérifier que chaque description est claire et concise
- [ ] Ajouter les sous-modules importants

### Phase 3: Classes et Patterns (1 heure)

- [ ] Ajouter les 12 nouvelles classes dans "Important Classes"
- [ ] Vérifier que les chemins de fichiers sont corrects
- [ ] Ajouter des descriptions concises (1 ligne)

### Phase 4: Tableaux (30 min)

- [ ] Mettre à jour le tableau "Database System" avec nouvelles tables
- [ ] Étendre le tableau "Slash Commands" avec tous les commands
- [ ] Vérifier que le tableau "Research-Based Improvements" est à jour

### Phase 5: Vérification (30 min)

- [ ] Relire l'intégralité de CLAUDE.md
- [ ] Vérifier que tous les chemins de fichiers existent
- [ ] Vérifier la cohérence des descriptions
- [ ] Tester la lisibilité (demander à Claude de lire)

### Phase 6: Publication (15 min)

- [ ] Commit avec message: `docs(claude): add 20+ missing modules to CLAUDE.md`
- [ ] Créer une PR
- [ ] Demander une review

---

## Estimation Temporelle

| Phase | Durée | Difficulté |
|-------|-------|------------|
| Préparation | 30 min | Facile |
| Ajouts modules | 2-3 h | Moyenne |
| Classes et patterns | 1 h | Facile |
| Tableaux | 30 min | Facile |
| Vérification | 30 min | Facile |
| Publication | 15 min | Facile |
| **TOTAL** | **4-5 h** | **Moyenne** |

---

## Ressources

- **Audit complet**: `docs/AUDIT_DOCUMENTATION.md`
- **CLAUDE.md actuel**: `/CLAUDE.md`
- **Structure du projet**: `find src -type d`

---

## Notes

- Privilégier la concision: 1-2 lignes par module
- Maintenir la cohérence avec le style existant
- Vérifier que tous les fichiers mentionnés existent réellement
- Ajouter des liens internes si pertinent
- Ne pas oublier de mettre à jour la date "Last Updated"

---

**Créé le**: 9 Décembre 2025
**Pour**: Mise à jour CLAUDE.md version 0.0.13
**Prochaine étape**: Exécuter Phase 1
