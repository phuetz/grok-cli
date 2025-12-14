# Grok CLI API Documentation

## Overview

Grok CLI is an AI-powered terminal agent using the Grok API (xAI) via OpenAI SDK. This document covers the main public APIs for developers.

## Table of Contents

1. [GrokAgent](#1-grokagent)
2. [Tool Executor](#2-tool-executor)
3. [Tools](#3-tools)
4. [Providers](#4-providers)
5. [Commands](#5-commands)
6. [Security](#6-security)
7. [Database](#7-database)
8. [Settings](#8-settings)

---

## 1. GrokAgent

**File:** `src/agent/grok-agent.ts`

Main orchestrator implementing the agentic loop.

### Constructor

```typescript
const agent = new GrokAgent(
  apiKey: string,
  baseURL?: string,
  model?: string,
  maxToolRounds?: number,
  useRAGToolSelection?: boolean,
  systemPromptId?: string,
  provider?: ProviderType
);
```

### Key Methods

| Method | Description |
|--------|-------------|
| `processUserMessage(prompt): Promise<ChatEntry[]>` | Process message with tool execution |
| `processUserMessageStream(prompt): AsyncIterable<StreamingChunk>` | Stream-based processing |
| `executeBashCommand(command): Promise<ToolResult>` | Execute bash commands |
| `setParallelToolExecution(enabled): void` | Enable/disable parallel tools |
| `setSelfHealing(enabled): void` | Configure self-healing |
| `dispose(): void` | Clean up resources |

### Events

```typescript
agent.on('tool:start', (toolName, args) => {});
agent.on('tool:complete', (toolName, result) => {});
agent.on('streaming:chunk', (chunk) => {});
agent.on('cost:update', (cost) => {});
```

---

## 2. Tool Executor

**File:** `src/agent/tool-executor.ts`

Centralized tool execution with parallel support.

### Constructor

```typescript
const executor = new ToolExecutor({
  textEditor: TextEditorTool,
  bash: BashTool,
  search: SearchTool,
  todoTool: TodoTool,
  imageTool: ImageTool,
  webSearch: WebSearchTool,
  checkpointManager: CheckpointManager,
  morphEditor?: MorphEditorTool
});
```

### Key Methods

| Method | Description |
|--------|-------------|
| `executeTool(toolCall, options?): Promise<ToolResult>` | Execute single tool |
| `executeToolsConcurrent(toolCalls): Promise<ToolResult[]>` | Parallel execution |
| `executeToolsSequential(toolCalls): Promise<ToolResult[]>` | Sequential execution |
| `getMetrics(): ToolMetrics` | Get execution statistics |

### Metrics

```typescript
interface ToolMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  averageExecutionTime: number;
  byTool: Map<string, ToolStats>;
}
```

---

## 3. Tools

**File:** `src/tools/index.ts`

### Available Tools

| Tool | Class | Purpose |
|------|-------|---------|
| BashTool | `BashTool` | Shell command execution |
| TextEditor | `TextEditorTool` | File operations (view, create, str_replace) |
| Search | `SearchTool` | Codebase search with ripgrep |
| WebSearch | `WebSearchTool` | Web search capabilities |
| MultiEdit | `MultiEditTool` | Batch file editing |
| Git | `GitTool` | Git operations |
| Todo | `TodoTool` | Task management |

### BashTool

```typescript
const bash = new BashTool();
const result = await bash.execute('ls -la', { timeout: 30000 });
// result: { success: boolean, output: string, error?: string }
```

**Security Features:**
- Blocked patterns: `rm -rf /`, `dd`, `mkfs`, fork bombs
- Protected paths: `.ssh`, `.gnupg`, `.aws`, `.docker`
- Confirmation service integration

### TextEditorTool

```typescript
const editor = new TextEditorTool();

// View file
await editor.view('/path/to/file.ts');

// Create file
await editor.create('/path/to/new.ts', 'content');

// Replace text
await editor.strReplace('/path/to/file.ts', 'oldText', 'newText');
```

**Security:** Path traversal prevention, symlink resolution, protected paths

---

## 4. Providers

**File:** `src/providers/types.ts`

### LLMProvider Interface

```typescript
interface LLMProvider {
  initialize(config: ProviderConfig): Promise<void>;
  isReady(): boolean;
  complete(options: CompletionOptions): Promise<LLMResponse>;
  stream(options: CompletionOptions): AsyncIterable<StreamChunk>;
  getModels(): Promise<string[]>;
  estimateTokens(text: string): number;
  getPricing(): { input: number; output: number };
  dispose(): void;
}
```

### Supported Providers

| Provider | Type | Description |
|----------|------|-------------|
| `grok` | Default | xAI Grok API |
| `claude-max` | OAuth | Anthropic Claude Max |
| `claude-sdk` | SDK | Claude Agent SDK |
| `openai` | API | OpenAI models |
| `gemini` | API | Google Gemini |

### Response Types

```typescript
interface LLMResponse {
  id: string;
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
  provider: ProviderType;
}

interface StreamChunk {
  type: 'content' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: Partial<ToolCall>;
  error?: string;
}
```

---

## 5. Commands

### Slash Commands

**File:** `src/commands/slash-commands.ts`

```typescript
const manager = new SlashCommandManager(workingDirectory);
manager.loadBuiltinCommands();
manager.loadCustomCommands(); // from .grok/commands/*.md

const result = await manager.executeCommand('review', ['--file', 'src/index.ts']);
```

**Built-in Commands:**
- `/help` - Show help
- `/clear` - Clear chat history
- `/model <name>` - Change model
- `/mode <plan|code|ask>` - Change agent mode
- `/checkpoints` - List checkpoints
- `/restore <id>` - Restore checkpoint
- `/review` - Code review
- `/commit` - Generate commit

### Enhanced Command Handler

**File:** `src/commands/enhanced-command-handler.ts`

Categories:
- **Branch/Checkpoint:** `/fork`, `/branches`, `/checkout`, `/merge`
- **Memory:** `/memory`, `/remember`, `/scan-todos`
- **Stats:** `/cost`, `/stats`, `/cache`
- **Security:** `/security`, `/dry-run`, `/guardian`
- **Context:** `/add-context`, `/context`, `/workspace`

---

## 6. Security

**File:** `src/security/index.ts`

### SecurityManager

```typescript
const security = getSecurityManager();

// Check approval
const result = security.checkApproval({
  type: 'file_write',
  path: '/path/to/file',
  description: 'Create new file'
});

// Sandbox execution
const sandboxResult = await security.sandboxExecute('npm test');

// Data redaction
const redacted = security.redact(sensitiveText);
```

### Configuration

```typescript
interface SecurityConfig {
  enabled: boolean;
  approvalMode: 'read-only' | 'auto' | 'full-access';
  securityMode: 'suggest' | 'auto-edit' | 'full-auto';
  sandboxEnabled: boolean;
  redactionEnabled: boolean;
  logEvents: boolean;
}
```

### Blocked Patterns

- `rm -rf /` or `~` - Destructive commands
- `dd if=* of=/dev/*` - Disk writes
- `mkfs.*` - Filesystem formatting
- `:(){ :|:& };:` - Fork bombs
- `wget|sh`, `curl|bash` - Remote execution

---

## 7. Database

**File:** `src/database/database-manager.ts`

### DatabaseManager

```typescript
const db = getDatabaseManager();
await db.initialize();

// Execute SQL
const results = db.execute('SELECT * FROM memories WHERE type = ?', ['episodic']);

// Get stats
const stats = await db.getStats();
```

### Tables

| Table | Purpose |
|-------|---------|
| `memories` | Episodic memory storage |
| `sessions` | Chat sessions |
| `messages` | Chat messages |
| `code_embeddings` | Code embeddings for RAG |
| `tool_stats` | Tool usage statistics |
| `checkpoints` | Saved agent states |
| `cache` | Response cache |

**Location:** `~/.grok/grok.db` (SQLite with WAL mode)

---

## 8. Settings

**File:** `src/utils/settings-manager.ts`

### SettingsManager

```typescript
const settings = getSettingsManager();

// Get values
const apiKey = settings.getApiKey();
const model = settings.getCurrentModel();
const timeout = settings.getToolTimeout('bash'); // 300000ms

// Update settings
settings.updateUserSetting('defaultModel', 'grok-3');
settings.saveUserSettings();
```

### Settings Paths

- User settings: `~/.grok/user-settings.json`
- Project settings: `./.grok/settings.json`

### Tool Timeouts (ms)

| Tool | Timeout |
|------|---------|
| bash | 300,000 (5 min) |
| search | 30,000 (30 sec) |
| view_file | 10,000 (10 sec) |
| create_file | 10,000 (10 sec) |
| str_replace_editor | 30,000 (30 sec) |
| web_search | 30,000 (30 sec) |
| default | 60,000 (60 sec) |
| hardLimit | 600,000 (10 min) |

---

## CLI Options

```bash
grok [options] [prompt]

Options:
  -d, --directory <dir>     Set working directory
  -k, --api-key <key>       API key
  -u, --base-url <url>      API endpoint
  -m, --model <model>       AI model
  -p, --prompt <prompt>     Headless mode
  --max-tool-rounds <n>     Max rounds (default: 400)
  --security-mode <mode>    suggest|auto-edit|full-auto
  --provider <provider>     grok|claude|openai|gemini
  --yolo                    YOLO mode (full autonomy)
  --auto-approve            Auto-approve all operations
  --dry-run                 Preview mode
  --continue                Resume last session
  --resume <id>             Resume specific session
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROK_API_KEY` | Required API key from x.ai |
| `MORPH_API_KEY` | Optional fast file editing |
| `YOLO_MODE=true` | Full autonomy mode |
| `MAX_COST` | Session cost limit (default $10) |

---

## Types Reference

### ChatEntry

```typescript
interface ChatEntry {
  type: 'user' | 'assistant' | 'tool_result';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}
```

### ToolCall

```typescript
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}
```

### ToolResult

```typescript
interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
```
