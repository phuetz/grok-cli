# OpenClaw Integration

Code Buddy integrates several modules inspired by the OpenClaw architecture for multi-agent, multi-channel AI systems.

## Modules

### Session Isolation (`src/channels/session-isolation.ts`)
Maintains separate context per session scope (global, channel, peer, or account+channel+peer). Each message gets a deterministic session key used for context isolation and lane queue serialization.

### DM Pairing (`src/channels/dm-pairing.ts`)
Security gate for direct messages. Unknown senders must be approved via a pairing code before their messages are processed. Disabled by default; enable in config.

### Peer Routing (`src/channels/peer-routing.ts`)
Routes messages to different agent configurations based on channel type, peer identity, and conditions (is-dm, message-pattern). Supports model override, system prompt override, and forwarding to other agents.

### Identity Links (`src/channels/identity-links.ts`)
Links identities across channels (e.g., same user on Telegram and Discord). Linked identities share the same canonical identity and session key, enabling cross-channel conversation continuity.

### Lane Queue (`src/concurrency/lane-queue.ts`)
Concurrency control following "Default Serial, Explicit Parallel". Used in:
- **Agent Executor**: Serializes tool calls per session, parallel for read-only tools
- **Channel Processing**: Serializes messages per session key

### Pipeline Compositor (`src/workflows/pipeline.ts`)
Composes tools and transforms into multi-step pipelines using pipe syntax (`search "query" | count | head 5`). Supports YAML/JSON file-based pipeline definitions via CLI.

### SKILL.md System (`src/skills/registry.ts`)
Natural language skill definitions using YAML frontmatter + Markdown. Three-tier loading (workspace > managed > bundled). Unified with legacy JSON skills via adapters.
