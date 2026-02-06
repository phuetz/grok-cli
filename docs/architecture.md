# Architecture Overview

## System Flow

```
User Input
    |
    v
ChatInterface (Ink/React)
    |
    v
CodeBuddyAgent
    |--- Skill Matching (SkillRegistry + UnifiedSkill)
    |--- Tool Selection (RAG + skill-augmented)
    |--- System Prompt Builder (+ skill context)
    |
    v
LLM Provider (Grok/Claude/ChatGPT/Gemini/Ollama/LM Studio)
    |
    v
Tool Calls ──> LaneQueue (serial by default, parallel for read-only)
    |                |
    v                v
Tool Execution   Agent Executor
    |
    v
Results back to LLM (agentic loop)
```

## Channel Message Processing

```
Inbound Message
    |
    v
Session Isolation ─── getSessionKey(message)
    |
    v
DM Pairing ────────── checkDMPairing(message) [approval gate]
    |
    v
Identity Links ────── getCanonicalIdentity(message) [cross-channel]
    |
    v
Peer Routing ──────── resolveRoute(message) [multi-agent dispatch]
    |
    v
Lane Queue ────────── enqueueMessage(sessionKey, handler) [serialization]
    |
    v
Agent Processing
```

## Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| Agent Executor | `src/agent/execution/` | Core agentic loop with LaneQueue integration |
| Channels | `src/channels/` | Multi-channel messaging (Telegram, Discord, Slack) |
| Session Isolation | `src/channels/session-isolation.ts` | Per-session context isolation |
| DM Pairing | `src/channels/dm-pairing.ts` | Approval-based DM security |
| Peer Routing | `src/channels/peer-routing.ts` | Multi-agent message dispatch |
| Identity Links | `src/channels/identity-links.ts` | Cross-channel identity resolution |
| Lane Queue | `src/concurrency/lane-queue.ts` | Concurrency control (serial/parallel) |
| Skills (SKILL.md) | `src/skills/registry.ts` | Natural language skill definitions |
| Skills (Unified) | `src/skills/adapters/` | Bridges legacy JSON + SKILL.md systems |
| Pipeline | `src/workflows/pipeline.ts` | Pipe syntax workflow compositor |
| Sandbox | `src/sandbox/safe-eval.ts` | Safe expression evaluation via `vm` |
| Events | `src/events/` | Typed event bus with filtering |

## Concurrency Model

**Default Serial, Explicit Parallel** (OpenClaw-inspired):
- Tool calls in the agent executor are serialized per lane by default
- Read-only tools (grep, glob, read_file, etc.) run in parallel
- Channel messages are serialized per session key
- Different sessions process in parallel
