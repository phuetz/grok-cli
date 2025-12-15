# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Development mode with Bun
npm run dev:node     # Development mode with tsx (Node.js)
npm run build        # Build with TypeScript
npm start            # Run built CLI
npm run validate     # Run lint + typecheck + test (use before committing)
```

## Testing

```bash
npm test                           # Run all tests
npm test -- path/to/file.test.ts   # Run a single test file
npm run test:watch                 # Watch mode
npm run test:coverage              # Coverage report
```

Tests are in `tests/` directory using Jest with ts-jest. Test files follow the pattern `*.test.ts`.

## Architecture Overview

Code Buddy is an AI-powered terminal agent using the Grok API (xAI) via OpenAI SDK. The core pattern is an **agentic loop** where the AI autonomously calls tools to complete tasks.

### Core Flow

```
User Input → ChatInterface (Ink/React) → CodeBuddyAgent → Grok API
                                              ↓
                                         Tool Calls (max 50/400 rounds)
                                              ↓
                                    Tool Execution + Confirmation
                                              ↓
                                      Results back to API (loop continues)
```

### Key Architecture Decisions

1. **Lazy Loading** - Heavy modules are loaded on-demand via getters in `CodeBuddyAgent` and lazy imports in `src/index.ts` to improve startup time

2. **Tool Selection** - RAG-based tool filtering (`src/codebuddy/tools.ts`) selects only relevant tools per query, reducing prompt tokens. Tools are cached after first selection round.

3. **Context Management** - `ContextManagerV2` compresses conversation history as it approaches token limits, using summarization to preserve context across long sessions

4. **Confirmation Service** - Singleton pattern for user confirmations on destructive operations. Use `ConfirmationService.getInstance()` for any file/bash operations that need approval.

5. **Checkpoints** - File operations create automatic checkpoints via `CheckpointManager` for undo/restore capability

### Key Entry Points

- `src/index.ts` - CLI entry, Commander setup, lazy loading
- `src/agent/codebuddy-agent.ts` - Main orchestrator (agentic loop, tool execution)
- `src/codebuddy/client.ts` - Grok API client (OpenAI SDK wrapper)
- `src/codebuddy/tools.ts` - Tool definitions and RAG selection
- `src/ui/components/chat-interface.tsx` - React/Ink terminal UI

### Tool Implementation Pattern

Tools are in `src/tools/`. Each tool exports a class with methods returning `Promise<ToolResult>`:

```typescript
interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}
```

To add a new tool:
1. Create tool class in `src/tools/`
2. Add tool definition in `src/codebuddy/tools.ts` (OpenAI function calling format)
3. Add execution case in `CodeBuddyAgent.executeTool()`

### Special Modes

- **YOLO Mode** (`YOLO_MODE=true`) - 400 tool rounds, higher cost limit, full autonomy
- **Security Modes** - Three tiers: `suggest` (confirm all), `auto-edit` (auto-approve safe), `full-auto`
- **Agent Modes** - `plan`, `code`, `ask`, `architect` - each restricts available tools

## Coding Conventions

- TypeScript strict mode, avoid `any`
- Single quotes, semicolons, 2-space indent
- Files: kebab-case (`text-editor.ts`)
- Components: PascalCase (`ChatInterface.tsx`)
- Commit messages: Conventional Commits (`feat(scope): description`)

## Environment Variables

- `GROK_API_KEY` - Required API key from x.ai
- `MORPH_API_KEY` - Optional, enables fast file editing
- `YOLO_MODE=true` - Full autonomy mode (requires `/yolo on` to activate)
- `MAX_COST` - Session cost limit in dollars (default $10, YOLO max $100)
- `GROK_BASE_URL` - Custom API endpoint (for Ollama, LM Studio, etc.)
- `GROK_MODEL` - Default model to use
