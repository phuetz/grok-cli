# COLAB.md - AI Collaboration Workspace

**Project:** Code Buddy - AI-Powered Terminal Agent
**Version:** 2.0.0
**Last Updated:** 2026-02-06
**Status:** Phase 2 Complete - All 17 iterations implemented and tested

---

## Table of Contents

1. [Application Audit](#application-audit)
2. [Architecture Overview](#architecture-overview)
3. [Restructuration Plan (v2)](#restructuration-plan-v2)
4. [AI Collaboration Rules](#ai-collaboration-rules)
5. [Work Log](#work-log)

---

## Application Audit

### Project Statistics

| Metric | Value |
|--------|-------|
| Source Files | 539+ |
| Lines of Code | 161,169+ |
| Directories | 90+ |
| Dependencies | 27 |
| Optional Dependencies | 16 |
| Test Files | 180+ |
| Test Coverage | ~80% |

### Phase 1 Sprint Progress (Completed 2026-01-11)

| Sprint | Tasks | Completed | Status |
|--------|-------|-----------|--------|
| Sprint 1: Core | 4 | 4 | **DONE** |
| Sprint 2: Features | 3 | 3 | **DONE** |
| Sprint 3: Testing | 2 | 2 | **DONE** |
| Sprint 4: Advanced | 3 | 3 | **DONE** |
| Sprint 5: Intelligence | 3 | 3 | **DONE** |
| Sprint 6: Extensibility | 7 | 7 | **DONE** |
| Sprint 7: Collaboration | 2 | 2 | **DONE** |
| Sprint 8: Integration | 4 | 4 | **DONE** |

### Current State Assessment

#### Strengths
- Multi-provider AI support (Grok, Claude, ChatGPT, Gemini, Ollama, LM Studio)
- Comprehensive tool ecosystem (59 tools)
- MCP (Model Context Protocol) integration
- Lazy loading for performance optimization
- Session persistence and recovery
- Security modes (suggest, auto-edit, full-auto)
- Unified VFS for all file operations
- Cross-session synchronization engine
- OpenClaw-inspired modules (tool policy, lifecycle hooks, smart compaction, retry fallback, semantic memory, plugin conflict detection)
- Multi-channel messaging (Telegram, Discord, Slack)
- SKILL.md natural language skills system
- Pipeline workflows and compositor
- Lane queue concurrency control

#### Issues Identified for Phase 2
1. **Sandbox Security**: `new Function` / `eval` usage in sandbox workers needs replacement with `vm.runInNewContext`
2. **God Files**: `error-formatter.ts` (2257 lines), `events/index.ts` (1794 lines) need splitting
3. **Large Validators**: `config-validator.ts`, `input-validator.ts`, `moltbot-hooks.ts` need modularization
4. **OpenClaw Wiring**: Session isolation, DM pairing, peer routing, identity links, lane queue modules exist but are not wired into runtime
5. **Empty Catch Blocks**: 28+ instances suppress errors silently
6. **Skill System Fragmentation**: Multiple skill implementations need unification
7. **Pipeline CLI**: No CLI interface for pipeline workflows

---

## Architecture Overview

### Core Components

```
+-------------------------------------------------------------+
|                        CLI Entry                             |
|                      (src/index.ts)                          |
+----------------------------+--------------------------------+
                             |
+----------------------------v--------------------------------+
|                    CodeBuddyAgent                            |
|              (src/agent/codebuddy-agent.ts)                  |
|  - Agentic loop (max 400 rounds)                            |
|  - Tool selection & execution                               |
|  - Context management                                        |
+----------------------------+--------------------------------+
                             |
    +------------------------+------------------------+
    |                        |                        |
+---v---+              +-----v-----+            +----v----+
| Tools |              | Providers |            |   UI    |
| (59)  |              | (6)       |            | (Ink)   |
+-------+              +-----------+            +---------+
```

### OpenClaw Modules

```
src/openclaw/index.ts          -- Facade: tool policy, lifecycle hooks,
                                  smart compaction, retry fallback,
                                  semantic memory, plugin conflicts

src/channels/
  session-isolation.ts         -- Per-channel session sandboxing
  dm-pairing.ts                -- DM <-> channel user pairing & auth
  peer-routing.ts              -- Route messages to correct agent peer
  identity-links.ts            -- Cross-platform identity resolution

src/concurrency/
  lane-queue.ts                -- Concurrency lanes for ordered execution

src/skills/
  skill-manager.ts             -- SKILL.md discovery and management
  skill-loader.ts              -- Natural language skill loading

src/workflows/
  pipeline.ts                  -- Pipeline compositor for multi-step flows

src/services/
  prompt-builder.ts            -- Dynamic prompt construction
```

### Data Flow

```
User Input --> ChatInterface --> CodeBuddyAgent --> Provider API
                                       |
                                 Tool Calls
                                       |
                               Tool Execution + Confirm
                                       |
                                 Results --> API (loop)

Channel Input --> Session Isolation --> DM Pairing --> Peer Routing
                                                          |
                                                   CodeBuddyAgent
                                                          |
                                                    LaneQueue (ordered)
```

---

## Restructuration Plan (v2)

### Overview

18 iterations to harden security, split god files, wire OpenClaw modules into the runtime, unify the skills system, and deliver end-to-end integration tests. Each iteration follows the 10-file rule and must pass `npm run validate` before handoff.

### Iteration 1: Sandbox Security

**Status:** COMPLETE
**Priority:** CRITICAL
**Objective:** Replace `new Function` / `eval` with `vm.runInNewContext` in sandbox workers to eliminate arbitrary code execution vectors.

**Files to modify (max 10):**
1. `src/plugins/sandbox-worker.ts` - Replace `new Function` with `vm.runInNewContext`
2. `src/fcs/fcs-engine.ts` - Replace any `eval` / `new Function` patterns
3. `src/interpreter/computer/skills.ts` - Audit and replace dynamic code execution
4. `src/security/sandbox.ts` - Harden sandbox context creation
5. `tests/unit/sandbox-security.test.ts` - New: Validate sandbox isolation

**Acceptance criteria:**
- [ ] Zero instances of `new Function` in production code
- [ ] Zero instances of `eval()` in production code
- [ ] `vm.runInNewContext` used with proper timeout and memory limits
- [ ] Sandbox escapes tested and blocked
- [ ] All existing tests pass

**Verification commands:**
```bash
grep -rn "new Function" src/ --include="*.ts" | wc -l  # Must be 0
grep -rn "eval(" src/ --include="*.ts" | wc -l          # Must be 0
npm run validate
```

---

### Iteration 2: Split error-formatter.ts (2257 lines)

**Status:** COMPLETE
**Priority:** HIGH
**Objective:** Break `src/utils/error-formatter.ts` into focused modules under `src/utils/errors/`.

**Files to modify (max 10):**
1. `src/utils/error-formatter.ts` - Refactor: keep as facade re-exporting submodules
2. `src/utils/errors/format-typescript.ts` - New: TypeScript error formatting
3. `src/utils/errors/format-runtime.ts` - New: Runtime error formatting
4. `src/utils/errors/format-network.ts` - New: Network/API error formatting
5. `src/utils/errors/format-tool.ts` - New: Tool execution error formatting
6. `src/utils/errors/format-common.ts` - New: Shared formatting utilities
7. `src/utils/errors/index.ts` - New: Barrel exports
8. `tests/unit/error-formatter-split.test.ts` - New: Tests for split modules

**Acceptance criteria:**
- [ ] No single file exceeds 500 lines
- [ ] `error-formatter.ts` re-exports all public API (backward compatible)
- [ ] All existing imports continue to work
- [ ] All existing tests pass

**Verification commands:**
```bash
wc -l src/utils/errors/*.ts src/utils/error-formatter.ts
npm run validate
```

---

### Iteration 3: Split events/index.ts (1794 lines)

**Status:** COMPLETE
**Priority:** HIGH
**Objective:** Break `src/events/index.ts` into focused modules under `src/events/`.

**Files to modify (max 10):**
1. `src/events/index.ts` - Refactor: keep as barrel re-exporting submodules
2. `src/events/event-bus.ts` - New: Core event bus implementation
3. `src/events/event-types.ts` - New: Event type definitions
4. `src/events/agent-events.ts` - New: Agent lifecycle events
5. `src/events/tool-events.ts` - New: Tool execution events
6. `src/events/channel-events.ts` - New: Channel/messaging events
7. `src/events/system-events.ts` - New: System-level events
8. `tests/unit/events-split.test.ts` - New: Tests for split modules

**Acceptance criteria:**
- [ ] No single file exceeds 500 lines
- [ ] `events/index.ts` re-exports all public API (backward compatible)
- [ ] All existing imports continue to work
- [ ] All existing tests pass

**Verification commands:**
```bash
wc -l src/events/*.ts
npm run validate
```

---

### Iteration 4: Split config-validator, input-validator, moltbot-hooks

**Status:** COMPLETE
**Priority:** MEDIUM
**Objective:** Break large validator and hook files into focused modules.

**Files to modify (max 10):**
1. `src/utils/config-validator.ts` - Refactor: extract domain-specific validators
2. `src/utils/validators/config-schema.ts` - New: Schema-based validation
3. `src/utils/validators/config-rules.ts` - New: Business rules
4. `src/utils/input-validator.ts` - Refactor: extract input sanitization
5. `src/utils/validators/input-sanitize.ts` - New: Sanitization utilities
6. `src/utils/validators/input-rules.ts` - New: Input validation rules
7. `src/hooks/moltbot-hooks.ts` - Refactor: split by hook domain
8. `src/hooks/moltbot/lifecycle.ts` - New: Lifecycle hooks
9. `src/hooks/moltbot/security.ts` - New: Security hooks
10. `tests/unit/validators-split.test.ts` - New: Tests for split modules

**Acceptance criteria:**
- [ ] No single file exceeds 500 lines
- [ ] All existing imports continue to work via re-exports
- [ ] All existing tests pass

**Verification commands:**
```bash
wc -l src/utils/config-validator.ts src/utils/input-validator.ts src/hooks/moltbot-hooks.ts
npm run validate
```

---

### Iteration 5: Wire LaneQueue in Agent Executor

**Status:** COMPLETE
**Priority:** HIGH
**Objective:** Integrate `LaneQueue` from `src/concurrency/lane-queue.ts` into the agent executor to enforce ordered tool execution and concurrency limits.

**Files to modify (max 10):**
1. `src/concurrency/lane-queue.ts` - Add agent-specific lane presets
2. `src/agent/codebuddy-agent.ts` - Import and use LaneQueue for tool execution
3. `src/agent/facades/infrastructure-facade.ts` - Expose LaneQueue lifecycle
4. `src/concurrency/index.ts` - Barrel export
5. `tests/unit/lane-queue-agent.test.ts` - New: Integration tests

**Acceptance criteria:**
- [ ] Tool calls routed through LaneQueue
- [ ] Concurrency limit respected (default: 5 parallel tool calls)
- [ ] Lane priority ordering works (file ops > network > compute)
- [ ] Graceful shutdown drains queued tasks
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/lane-queue-agent.test.ts
npm run validate
```

---

### Iteration 6: Wire Session Isolation in Channels

**Status:** COMPLETE
**Priority:** HIGH
**Objective:** Integrate `SessionIsolation` from `src/channels/session-isolation.ts` into channel message handlers so each channel gets its own sandboxed session.

**Files to modify (max 10):**
1. `src/channels/session-isolation.ts` - Add factory methods for channel types
2. `src/channels/telegram.ts` - Wire session isolation
3. `src/channels/discord.ts` - Wire session isolation
4. `src/channels/slack.ts` - Wire session isolation
5. `src/channels/index.ts` - Export session isolation
6. `tests/unit/session-isolation-channels.test.ts` - New: Integration tests

**Acceptance criteria:**
- [ ] Each channel chat/guild gets isolated session context
- [ ] Session data does not leak between channels
- [ ] Session cleanup on channel disconnect
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/session-isolation-channels.test.ts
npm run validate
```

---

### Iteration 7: Wire DM Pairing in Channel Handlers

**Status:** COMPLETE
**Priority:** MEDIUM
**Objective:** Integrate `DMPairing` from `src/channels/dm-pairing.ts` into channel handlers to enable secure DM-to-channel user pairing.

**Files to modify (max 10):**
1. `src/channels/dm-pairing.ts` - Add pairing verification and timeout
2. `src/channels/telegram.ts` - Wire DM pairing for private messages
3. `src/channels/discord.ts` - Wire DM pairing for DMs
4. `src/channels/slack.ts` - Wire DM pairing for direct messages
5. `tests/unit/dm-pairing-channels.test.ts` - New: Pairing flow tests

**Acceptance criteria:**
- [ ] Users can pair DM identity to channel identity
- [ ] Pairing requires confirmation from both sides
- [ ] Pairing timeout after 5 minutes
- [ ] Unpair command works
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/dm-pairing-channels.test.ts
npm run validate
```

---

### Iteration 8: Wire Peer Routing in Agent

**Status:** COMPLETE
**Priority:** MEDIUM
**Objective:** Integrate `PeerRouting` from `src/channels/peer-routing.ts` into the agent so messages are routed to the correct agent instance in multi-agent setups.

**Files to modify (max 10):**
1. `src/channels/peer-routing.ts` - Add routing table management
2. `src/agent/codebuddy-agent.ts` - Register as peer, handle routed messages
3. `src/orchestration/orchestrator.ts` - Use peer routing for multi-agent dispatch
4. `src/channels/index.ts` - Export peer routing
5. `tests/unit/peer-routing-agent.test.ts` - New: Routing tests

**Acceptance criteria:**
- [ ] Agent registers as a peer on startup
- [ ] Messages route to correct agent peer by capability
- [ ] Fallback routing when preferred peer unavailable
- [ ] Peer deregistration on shutdown
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/peer-routing-agent.test.ts
npm run validate
```

---

### Iteration 9: Wire Identity Links in Sessions

**Status:** COMPLETE
**Priority:** MEDIUM
**Objective:** Integrate `IdentityLinks` from `src/channels/identity-links.ts` into session management to enable cross-platform identity resolution.

**Files to modify (max 10):**
1. `src/channels/identity-links.ts` - Add link persistence and lookup
2. `src/agent/facades/session-facade.ts` - Resolve identity on session load
3. `src/memory/index.ts` - Store identity links in memory system
4. `src/channels/index.ts` - Export identity links
5. `tests/unit/identity-links-sessions.test.ts` - New: Identity resolution tests

**Acceptance criteria:**
- [ ] User identities linked across Telegram/Discord/Slack
- [ ] Session history follows linked identity
- [ ] Memory context shared across linked identities
- [ ] Unlink command removes cross-platform association
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/identity-links-sessions.test.ts
npm run validate
```

---

### Iteration 10: Wire LaneQueue in Channel Processing

**Status:** COMPLETE
**Priority:** MEDIUM
**Objective:** Apply `LaneQueue` to inbound channel message processing to prevent message floods from overwhelming the agent.

**Files to modify (max 10):**
1. `src/concurrency/lane-queue.ts` - Add channel-specific lane configuration
2. `src/channels/telegram.ts` - Route incoming messages through LaneQueue
3. `src/channels/discord.ts` - Route incoming messages through LaneQueue
4. `src/channels/slack.ts` - Route incoming messages through LaneQueue
5. `src/channels/index.ts` - Shared queue setup helper
6. `tests/unit/lane-queue-channels.test.ts` - New: Rate limiting tests

**Acceptance criteria:**
- [ ] Channel messages queued with per-user rate limiting
- [ ] Priority messages (admin commands) bypass queue
- [ ] Queue overflow returns "busy" response
- [ ] Metrics exposed for queue depth
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/lane-queue-channels.test.ts
npm run validate
```

---

### Iteration 11: Remediate Empty Catch Blocks (28+)

**Status:** COMPLETE
**Priority:** HIGH
**Objective:** Replace all empty catch blocks with proper error handling (logging, re-throwing, or explicit ignore comments).

**Files to modify (max 10):**
1-10. Top 10 files with most empty catch blocks (identified by `grep -rn "catch.*{}" src/`)

**Acceptance criteria:**
- [ ] Zero empty catch blocks in `src/`
- [ ] Each catch block either: logs, re-throws, returns error result, or has `// intentionally ignored: <reason>` comment
- [ ] No new lint warnings introduced
- [ ] All existing tests pass

**Verification commands:**
```bash
grep -rn "catch.*{" src/ --include="*.ts" -A1 | grep -c "^--$"  # Review
npm run lint
npm run validate
```

---

### Iteration 12: Unify Skills (types + registry)

**Status:** COMPLETE
**Priority:** HIGH
**Objective:** Create a unified skill type system and registry, replacing fragmented skill implementations.

**Files to modify (max 10):**
1. `src/skills/types.ts` - New: Unified skill type definitions
2. `src/skills/registry.ts` - New: Centralized skill registry (singleton)
3. `src/skills/skill-manager.ts` - Refactor to use unified types and registry
4. `src/skills/skill-loader.ts` - Refactor to use unified types
5. `src/skills/index.ts` - New: Barrel exports
6. `tests/unit/skill-registry.test.ts` - New: Registry tests

**Acceptance criteria:**
- [ ] Single `Skill` type definition used everywhere
- [ ] `SkillRegistry` singleton manages all skills
- [ ] SKILL.md files parsed into unified `Skill` objects
- [ ] Backward compatible with existing skill usage
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/skill-registry.test.ts
npm run validate
```

---

### Iteration 13: Wire Skills in Tool Selection

**Status:** COMPLETE
**Priority:** HIGH
**Objective:** Integrate the unified skill registry into the tool selection pipeline so skills augment available tools based on context.

**Files to modify (max 10):**
1. `src/skills/registry.ts` - Add method to export skills as tool definitions
2. `src/codebuddy/tools.ts` - Include skill-derived tools in RAG selection
3. `src/tools/tool-selector.ts` - Accept skill tools alongside built-in tools
4. `src/agent/codebuddy-agent.ts` - Initialize skill registry on startup
5. `src/services/prompt-builder.ts` - Inject active skill context into prompts
6. `tests/unit/skills-tool-selection.test.ts` - New: Integration tests

**Acceptance criteria:**
- [ ] Skills appear in tool selection when relevant to query
- [ ] Skill execution routed through unified tool executor
- [ ] Prompt builder includes active skill instructions
- [ ] Skills can be enabled/disabled at runtime
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/skills-tool-selection.test.ts
npm run validate
```

---

### Iteration 14: Pipeline CLI Interface

**Status:** COMPLETE
**Priority:** MEDIUM
**Objective:** Add CLI commands for creating, listing, running, and managing pipeline workflows.

**Files to modify (max 10):**
1. `src/commands/handlers/pipeline-handlers.ts` - New: Pipeline CLI command handlers
2. `src/commands/slash-commands.ts` - Register `/pipeline` commands
3. `src/commands/handlers/index.ts` - Export pipeline handlers
4. `src/workflows/pipeline.ts` - Add list/describe methods
5. `src/agent/pipelines.ts` - Bridge pipeline execution to agent
6. `tests/unit/pipeline-cli.test.ts` - New: CLI command tests

**Acceptance criteria:**
- [ ] `/pipeline list` shows available pipelines
- [ ] `/pipeline run <name>` executes a pipeline
- [ ] `/pipeline create <name>` creates from template
- [ ] `/pipeline status` shows running pipelines
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/pipeline-cli.test.ts
npm run validate
```

---

### Iteration 15: Deprecate Legacy Skill Manager

**Status:** COMPLETE
**Priority:** LOW
**Objective:** Mark legacy skill manager code as deprecated, redirect all callers to the unified registry, and remove dead code.

**Files to modify (max 10):**
1. `src/skills/skill-manager.ts` - Add `@deprecated` annotations, proxy to registry
2. `src/skills/skill-loader.ts` - Add `@deprecated` annotations, proxy to registry
3. `src/interpreter/computer/skills.ts` - Migrate to unified registry
4. `src/commands/slash-commands.ts` - Update `/skill` commands to use registry
5. `src/agent/codebuddy-agent.ts` - Remove legacy skill manager references
6. `tests/unit/skill-deprecation.test.ts` - New: Verify deprecation warnings

**Acceptance criteria:**
- [ ] All skill access goes through unified registry
- [ ] Legacy methods log deprecation warnings
- [ ] No dead code remaining in skill files
- [ ] All existing tests pass

**Verification commands:**
```bash
npm test -- tests/unit/skill-deprecation.test.ts
npm run validate
```

---

### Iteration 16: E2E Integration Tests

**Status:** COMPLETE
**Priority:** HIGH
**Objective:** Create end-to-end tests that exercise the full agent loop including OpenClaw modules, channels, skills, and pipelines.

**Files to modify (max 10):**
1. `tests/e2e/agent-loop.test.ts` - New: Full agent loop with tool calls
2. `tests/e2e/channel-isolation.test.ts` - New: Multi-channel session isolation
3. `tests/e2e/skill-pipeline.test.ts` - New: Skill-driven pipeline execution
4. `tests/e2e/lane-queue-flow.test.ts` - New: Concurrency under load
5. `tests/e2e/identity-resolution.test.ts` - New: Cross-platform identity
6. `tests/e2e/setup.ts` - New: Shared E2E test fixtures
7. `jest.config.cjs` - Add E2E test configuration

**Acceptance criteria:**
- [ ] Agent loop completes a multi-tool task end-to-end
- [ ] Channel isolation prevents cross-session leaks
- [ ] Pipeline executes skill sequence correctly
- [ ] LaneQueue orders concurrent operations
- [ ] Identity links resolve across platforms
- [ ] All E2E tests pass in CI

**Verification commands:**
```bash
npm test -- tests/e2e/
npm run validate
```

---

### Iteration 17: Final Documentation + COLAB.md Update

**Status:** COMPLETE
**Priority:** MEDIUM
**Objective:** Update all documentation to reflect the completed Phase 2 changes, update COLAB.md with final status, and generate architecture diagrams.

**Files to modify (max 10):**
1. `COLAB.md` - Update all iteration statuses to DONE
2. `CLAUDE.md` - Update architecture overview with OpenClaw modules
3. `src/openclaw/index.ts` - Update module documentation
4. `src/channels/index.ts` - Add comprehensive TSDoc
5. `src/concurrency/index.ts` - Add comprehensive TSDoc
6. `src/skills/index.ts` - Add comprehensive TSDoc
7. `src/workflows/index.ts` - Add comprehensive TSDoc

**Acceptance criteria:**
- [ ] All iteration statuses updated
- [ ] CLAUDE.md reflects current architecture
- [ ] OpenClaw module docs complete
- [ ] All existing tests pass
- [ ] `npm run validate` passes

**Verification commands:**
```bash
npm run validate
```

---

## AI Collaboration Rules

### Hard Rules (non-negotiable)

1. **Maximum 10 files per iteration** - Keeps changes reviewable and reduces merge conflicts
2. **Tests mandatory** - Every iteration must include or update tests; no untested production code
3. **`npm run validate` after each iteration** - Lint + typecheck + test must all pass before marking an iteration complete
4. **No breaking changes** - All existing imports and public APIs must continue to work
5. **No new `any` types** - TypeScript strict mode enforced
6. **No `eval` or `new Function`** - After Iteration 1, these are banned permanently

### Handoff Protocol

When an AI agent finishes an iteration or hands off to another agent, it must update this file with:

```markdown
## Completed Iteration N: <Title>

**Agent:** <Agent Name/ID>
**Date:** <YYYY-MM-DD>
**Duration:** <Time spent>

### Files modified:
1. `path/to/file.ts` - <What changed>
...

### Tests added/updated:
- `tests/unit/file.test.ts` (N tests)

### Verification:
npm run validate   # Exit code: 0
npm test -- tests/unit/specific.test.ts  # N passed

### Issues encountered:
<Any problems or blockers>

### Handoff notes for next iteration:
<Context the next agent needs>
```

### Starting an Iteration

Before writing any code:

1. Read this COLAB.md to understand current state
2. Identify the next NOT STARTED iteration
3. Verify prerequisites (prior iterations) are complete
4. Announce the iteration start in the work log section below
5. Follow the file list and acceptance criteria exactly

### Iteration Checklist (before marking DONE)

- [ ] All modified files are at most 10
- [ ] All new code has tests
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes (no new errors)
- [ ] No new `any` types introduced
- [ ] No `eval` or `new Function` introduced
- [ ] Backward compatibility maintained
- [ ] Work log entry added below

### Code Standards

#### TypeScript
```typescript
// Good: Explicit types, no any
function processMessage(message: Message): Promise<Response> {
  // ...
}

// Bad: Using any
function processMessage(message: any): any {
  // ...
}
```

#### Error Handling
```typescript
// Good: Specific error types with context
throw new ToolExecutionError('Failed to execute bash', {
  command: cmd,
  exitCode: result.code,
});

// Bad: Generic errors or empty catch
throw new Error('Failed');
catch (e) {} // BANNED
```

#### Testing
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange, Act, Assert
    });
    it('should handle edge case', () => { /* ... */ });
    it('should throw on invalid input', () => { /* ... */ });
  });
});
```

---

## Work Log

*Entries below are added by AI agents as they complete iterations. Most recent entries appear first.*

---

### 2026-02-06 - COLAB.md v2 Created

**Agent:** Claude Opus 4.6
**Task:** Restructure COLAB.md with 17-iteration Phase 2 plan

**Summary:**
- Replaced Phase 1 sprint-based plan (all DONE) with Phase 2 iteration-based plan
- Added OpenClaw module architecture to overview
- Defined 17 iterations covering security hardening, god file splitting, OpenClaw wiring, skill unification, pipeline CLI, E2E tests, and documentation
- Established hard collaboration rules (10 files, tests mandatory, npm run validate)
- Added handoff protocol for multi-agent collaboration

**Next iteration to start:** Iteration 1 (Sandbox Security)

---

## Quick Reference

### Commands

```bash
# Development
npm run dev          # Start with Bun
npm run build        # Build TypeScript
npm run validate     # Lint + typecheck + test (REQUIRED before marking iteration done)

# Testing
npm test                          # Run all tests
npm test -- path/to/file.test.ts  # Single file
npm run test:coverage             # With coverage

# Quality
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

### Key File Locations

| Component | Location |
|-----------|----------|
| Entry Point | `src/index.ts` |
| Main Agent | `src/agent/codebuddy-agent.ts` |
| Tools | `src/tools/` |
| Providers | `src/providers/` |
| UI | `src/ui/` |
| OpenClaw Facade | `src/openclaw/index.ts` |
| Channels | `src/channels/` |
| Concurrency | `src/concurrency/lane-queue.ts` |
| Skills | `src/skills/` |
| Pipelines | `src/workflows/pipeline.ts` |
| Tests | `tests/unit/`, `tests/e2e/` |
| Config | `package.json`, `tsconfig.json` |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GROK_API_KEY` | API key for Grok |
| `GROK_BASE_URL` | Custom API endpoint |
| `GROK_MODEL` | Default model |
| `YOLO_MODE` | Full autonomy mode |
| `MAX_COST` | Session cost limit |

---

*This document is maintained by AI agents collaborating on Code Buddy development.*
