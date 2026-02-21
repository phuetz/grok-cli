# Architecture Documentation - Code Buddy

> **Version**: 2.6.0
> **Last Updated**: 2026-02-21

This document provides a comprehensive overview of the Code Buddy architecture, design patterns, and technical decisions.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Layers](#architecture-layers)
- [Core Components](#core-components)
- [Design Patterns](#design-patterns)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Technology Stack](#technology-stack)
- [Extension Points](#extension-points)

---

## System Overview

Code Buddy is an AI-powered command-line interface that enables developers to interact with their codebase through natural language. It implements an agentic architecture where an AI agent can autonomously use tools to accomplish tasks.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Input                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  CLI Entry Point                             │
│                  (Commander.js)                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Chat Interface (Ink/React)                   │
│  ┌────────────┬────────────┬────────────┬────────────┐     │
│  │ History    │ Input      │ Spinner    │ Dialogs    │     │
│  └────────────┴────────────┴────────────┴────────────┘     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 CodeBuddy Agent                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Message Processing                                  │  │
│  │  • Tool Orchestration                                  │  │
│  │  • Conversation History                                │  │
│  │  • Streaming Response                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────┬───────────────────────┬───────────────────────────┘
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────────┐
│  Grok API Client │    │  Confirmation        │
│  (OpenAI SDK)    │    │  Service             │
└──────────────────┘    └──────────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         Tools                                │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐  │
│  │ View   │Create  │ Edit   │ Bash   │Search  │ Todos  │  │
│  │ File   │ File   │ Text   │        │        │        │  │
│  └────────┴────────┴────────┴────────┴────────┴────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   File System / Shell                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Layers

### 1. Presentation Layer (UI)

**Location**: `src/ui/`

**Responsibility**: User interaction and visual feedback

**Components**:
- `ChatInterface`: Main orchestrator component
- `ChatHistory`: Message display with markdown rendering
- `ChatInput`: User input handling
- `ConfirmationDialog`: User confirmation for actions
- `DiffRenderer`: Visual diff display
- `LoadingSpinner`: Processing indicator
- `ApiKeyInput`: Secure API key entry
- `ModelSelection`: Model chooser

**Technology**: React 17 + Ink 3

**Key Features**:
- Real-time streaming response rendering
- Markdown and code syntax highlighting
- Interactive confirmations with previews
- Token counting display
- Processing timer

### 2. Application Layer (Agent)

**Location**: `src/agent/`

**Responsibility**: Core business logic and orchestration

**Main Class**: `CodeBuddyAgent`

```typescript
class CodeBuddyAgent {
  processMessage(message: string): AsyncIterator<AgentEvent>
  handleToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]>
  streamResponse(messages: Message[]): AsyncIterator<Chunk>
}
```

**Responsibilities**:
- Message processing and routing
- Tool call orchestration
- Conversation history management
- Streaming coordination
- Error handling and recovery

**Key Features**:
- Agentic loop (max 30 rounds)
- Abort controller for cancellation
- Token counting integration
- Custom instructions support
- WorkflowGuardMiddleware (priority-45 middleware, detects 3+ action verbs on turn 0, emits plan suggestion when no PLAN.md exists)
- LessonsTracker per-turn injection (lessons before todos in every LLM context)
- WorkflowRules system prompt block (plan triggers, auto-correction protocol, verification contract, elegance gate, subagent triggers)

### 3. API Layer (Grok Client)

**Location**: `src/codebuddy/`

**Responsibility**: Communication with Grok API

**Components**:
- `CodeBuddyClient`: OpenAI SDK wrapper
- `tools.ts`: Tool definitions and schemas

**Configuration**:
- Base URL support for different providers
- Streaming support
- Timeout handling (360s)
- Search parameters integration

### 4. Tool Layer

**Location**: `src/tools/`

**Responsibility**: Implement specific capabilities

**Tools**:

#### view_file
- File viewing with line ranges
- Directory listing
- Auto-limiting for large files

#### create_file
- New file creation
- Automatic parent directory creation
- Confirmation required

#### str_replace_editor
- Text replacement with fuzzy matching
- Multi-line function matching
- Diff generation
- Replace all support

#### bash
- Shell command execution
- Persistent cd support
- Configurable timeout
- Output buffering

#### search
- Unified text and file search
- ripgrep backend
- Glob patterns and regex
- Fuzzy file scoring

#### create_todo_list / update_todo_list
- Visual task tracking
- Status and priority management
- Colored output

### 5. Utility Layer

**Location**: `src/utils/`

**Responsibility**: Cross-cutting concerns and services

**Modules**:

#### ConfirmationService (Singleton)
```typescript
class ConfirmationService extends EventEmitter {
  requestConfirmation(operation: Operation): Promise<boolean>
  setAutoApprove(enabled: boolean): void
  reset(): void
}
```

#### PathValidator
```typescript
validatePath(inputPath: string, workingDir: string): string
validateFilePath(path: string, workingDir: string): Promise<string>
isPathSafe(path: string, workingDir: string): boolean
```

#### CommandValidator
```typescript
validateCommand(command: string, config: Config): string
sanitizeCommandArgs(args: string[]): string
isCommandSafe(command: string): boolean
```

#### Settings
```typescript
loadUserSettings(): Promise<UserSettings>
loadProjectSettings(): Promise<ProjectSettings>
saveSettings(settings: Settings): Promise<void>
```

#### TokenCounter
```typescript
countTokens(text: string): number
```

---

## Core Components

### CodeBuddyAgent (src/agent/codebuddy-agent.ts)

**Design**: Event-driven async iterator pattern

**State Management**:
```typescript
interface AgentState {
  messages: Message[];
  toolCallHistory: ToolCall[];
  tokenCount: number;
  round: number;
}
```

**Event Types**:
- `message_start`: AI starts responding
- `message_chunk`: Streaming chunk received
- `message_complete`: AI response complete
- `tool_call`: Tool execution requested
- `tool_result`: Tool execution complete
- `error`: Error occurred

**Agentic Loop**:
```
1. User sends message
2. AI processes message
3. If tool calls → Execute tools → Send results back to AI
4. Repeat step 3 up to 30 times
5. AI provides final response
6. Return to user
```

**Key Methods**:

```typescript
async *processMessage(message: string): AsyncIterator<AgentEvent> {
  // 1. Add user message to history
  // 2. Stream AI response
  // 3. Handle tool calls in loop
  // 4. Yield events for UI
  // 5. Return final response
}
```

### ConfirmationService (src/utils/confirmation-service.ts)

**Pattern**: Singleton + Event Emitter

**Purpose**: Centralize user confirmations for destructive operations

**Workflow**:
```
Tool wants to execute → Request confirmation →
Event emitted → UI shows dialog →
User approves/rejects → Promise resolves →
Tool proceeds/aborts
```

**Session Management**:
- Per-session approval flags
- "Don't ask again" support
- Auto-approve mode for headless

**Security Features**:
- Preview content before approval
- Reason capture for rejections
- VS Code integration attempt

### Tool System

**Interface**:
```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(args: ToolArgs): Promise<ToolResult>;
}
```

**Execution Flow**:
```
1. AI requests tool call
2. Agent validates tool exists
3. Confirmation requested (if needed)
4. Tool executes with validated args
5. Result returned to AI
6. History updated
```

**Error Handling**:
- Structured error messages
- Stack trace capture
- User-friendly formatting
- Recovery suggestions

### Context Injection Order (v2.6.0)

Per-turn context is appended at the **end** of the prepared message list in the following order to maximize transformer recency bias:

1. `<lessons_context>` — active lessons from `LessonsTracker` (`src/agent/lessons-tracker.ts`). Categories: PATTERN / RULE / CONTEXT / INSIGHT. Merged from `.codebuddy/lessons.md` (project) and `~/.codebuddy/lessons.md` (global). Injected **first** (before todos) so the most recent token slot is reserved for the task list.
2. `<todo_context>` — current task list from `TodoTracker` (`src/agent/todo-tracker.ts`). Injected **last** to exploit recency bias for active objectives.

**Singleton factories**: `getLessonsTracker(cwd)` / `getTodoTracker(cwd)` — both keyed per working directory.

### WorkflowGuardMiddleware (`src/agent/middleware/workflow-guard.ts`)

Priority-45 before-turn middleware registered as a default pipeline step in the `CodeBuddyAgent` constructor. On turn 0 it counts distinct action verbs in the user message. If 3 or more verbs are found and no `PLAN.md` exists in the project root, it emits a `warn` steer chunk suggesting the user run `plan init` before proceeding.

### WorkflowRules (`src/prompts/workflow-rules.ts`)

`getWorkflowRulesBlock()` is called once per session by `PromptBuilder.buildSystemPrompt()` and injected into the static system prompt. It encodes six concrete operating contracts:

| Contract | Description |
|:---------|:------------|
| **Plan Triggers** | 3+ distinct action verbs, 3+ files, new module, or API change → create PLAN.md first |
| **Auto-Correction Protocol** | Stop + re-plan after 2 consecutive failures on the same step |
| **Verification Contract** | Run tsc + tests + diff + behaviour check before marking any task complete |
| **Uncertainty Protocol** | Decide best path and document as `Assumption: X` rather than asking |
| **Elegance Gate** | >50 LOC or 3+ files changed → pause for review; <=10 LOC → skip plan step |
| **Subagent Triggers** | 5+ unknown files or >20% context used → delegate to subagent |

---

## Design Patterns

### 1. Singleton Pattern

**Used in**:
- `ConfirmationService`
- `Settings` management

**Rationale**: Ensure single source of truth for global state

```typescript
class ConfirmationService {
  private static instance: ConfirmationService;

  static getInstance(): ConfirmationService {
    if (!this.instance) {
      this.instance = new ConfirmationService();
    }
    return this.instance;
  }
}
```

### 2. Observer Pattern

**Used in**:
- Event system (`EventEmitter`)
- Confirmation flow
- UI updates

**Rationale**: Decouple components and enable reactive updates

```typescript
confirmationService.on('confirmation-needed', (operation) => {
  showDialog(operation);
});
```

### 3. Strategy Pattern

**Used in**:
- Tool implementations
- Search backends (ripgrep vs fuzzy)

**Rationale**: Swap algorithms without changing interface

```typescript
interface SearchStrategy {
  search(pattern: string, options: Options): Promise<Results>;
}

class RipgrepSearch implements SearchStrategy {
  // Fast text search
}

class FuzzyFileSearch implements SearchStrategy {
  // File name matching
}
```

### 4. Iterator Pattern

**Used in**:
- Streaming responses (`AsyncIterator`)
- Message processing

**Rationale**: Handle asynchronous data streams elegantly

```typescript
async *streamResponse(): AsyncIterator<Chunk> {
  for await (const chunk of apiStream) {
    yield chunk;
  }
}
```

### 5. Factory Pattern

**Used in**:
- Tool creation
- Message construction

**Rationale**: Centralize object creation logic

```typescript
function createToolCall(name: string, args: Args): ToolCall {
  return {
    id: generateId(),
    type: 'function',
    function: { name, arguments: JSON.stringify(args) }
  };
}
```

---

## Data Flow

### Message Processing Flow

```
User Input
    │
    ▼
ChatInterface
    │
    ▼
CodeBuddyAgent.processMessage()
    │
    ├─▶ Add to conversation history
    │
    ├─▶ CodeBuddyClient.streamChat()
    │       │
    │       ▼
    │   Grok API (streaming)
    │       │
    │       ▼
    │   Stream chunks back
    │
    ├─▶ Parse tool calls
    │
    ├─▶ For each tool call:
    │       │
    │       ├─▶ ConfirmationService
    │       │       │
    │       │       ├─▶ UI Dialog
    │       │       │       │
    │       │       │       ▼
    │       │       │   User approval
    │       │       │
    │       │       ▼
    │       │   Approved/Rejected
    │       │
    │       ├─▶ Tool.execute()
    │       │       │
    │       │       ├─▶ Path/Command validation
    │       │       │
    │       │       ├─▶ File system / Shell
    │       │       │
    │       │       ▼
    │       │   Return result
    │       │
    │       ▼
    │   Add tool result to history
    │
    ├─▶ Send tool results to API
    │
    ▼
Final Response
    │
    ▼
Display to User
```

### Settings Resolution

```
1. Check CLI arguments (--api-key, --model, etc.)
   │
   ▼
2. Check environment variables (GROK_API_KEY, etc.)
   │
   ▼
3. Check project settings (.grok/settings.json)
   │
   ▼
4. Check user settings (~/.grok/user-settings.json)
   │
   ▼
5. Use defaults or prompt user
```

---

## Security Architecture

### Defense in Depth

**Layer 1: Input Validation**
- Path validation (prevent traversal)
- Command validation (whitelist/blacklist)
- Argument sanitization

**Layer 2: Confirmation System**
- User approval required for destructive ops
- Preview before execution
- Session-based approvals

**Layer 3: Sandboxing**
- Working directory restrictions
- Sensitive file blacklist
- Command timeout limits

**Layer 4: Monitoring**
- Operation history tracking
- Error logging
- Security event capture

### Path Validation

```typescript
// Block: ../../../etc/passwd
// Block: /etc/passwd
// Block: .env, credentials.json
// Block: .ssh/id_rsa
// Allow: src/index.ts
// Allow: ./config.json
```

### Command Validation

```typescript
// Whitelist mode (strict):
const ALLOWED = ['ls', 'git', 'npm', 'cat', ...];

// Blacklist mode (default):
const DANGEROUS = [
  /rm\s+-rf\s+\//,  // rm -rf /
  /:\(\)\{/,         // Fork bomb
  /curl.*\|\s*sh/,   // Pipe to shell
];
```

---

## Technology Stack

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 4.9.5 | Type safety |
| `react` | 17.0.2 | UI framework |
| `ink` | 3.2.0 | Terminal UI |
| `commander` | 11.1.0 | CLI parsing |
| `openai` | 5.10.1 | API client |
| `tiktoken` | 1.0.21 | Token counting |
| `ripgrep-node` | 1.0.0 | Fast search |
| `fs-extra` | 11.1.1 | File operations |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `vitest` | Testing framework |
| `prettier` | Code formatting |
| `eslint` | Linting |
| `husky` | Git hooks |
| `lint-staged` | Pre-commit checks |
| `@commitlint` | Commit message validation |

---

## Extension Points

### Adding a New Tool

1. **Define tool schema** in `src/codebuddy/tools.ts`:
```typescript
{
  name: 'my_tool',
  description: 'Tool description',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string' }
    }
  }
}
```

2. **Implement tool** in `src/tools/my-tool.ts`:
```typescript
export async function executeTool(args: Args): Promise<Result> {
  // Validate args
  // Request confirmation if needed
  // Execute operation
  // Return result
}
```

3. **Register in agent** in `src/agent/codebuddy-agent.ts`:
```typescript
case 'my_tool':
  return await executeMyTool(args);
```

### Adding a New UI Component

1. Create component in `src/ui/components/`:
```typescript
export const MyComponent: React.FC<Props> = (props) => {
  return <Box>...</Box>;
};
```

2. Use in `ChatInterface`:
```typescript
<MyComponent {...props} />
```

### Supporting a New Model

1. Add model to default list
2. Update base URL if needed
3. Test streaming compatibility
4. Update documentation

---

## Performance Considerations

### Optimizations Implemented

1. **Streaming**: Incremental response rendering
2. **ripgrep**: Sub-second search performance
3. **Lazy Loading**: Components loaded on demand
4. **Token Counting**: Cached calculations
5. **Fuzzy Matching**: Optimized algorithms

### Performance Limits

```typescript
const LIMITS = {
  MAX_TOOL_ROUNDS: 30,        // Prevent infinite loops
  API_TIMEOUT: 360_000,       // 360 seconds
  BASH_TIMEOUT: 30_000,       // 30 seconds
  BASH_BUFFER: 1_048_576,     // 1MB
  MAX_HISTORY: 100,           // Messages
};
```

---

## Local LLM Infrastructure

### Hardware Module (`src/hardware/`)

**Purpose**: GPU monitoring and resource management for local LLM inference.

**Components**:

#### GPUMonitor (`src/hardware/gpu-monitor.ts`)

```typescript
class GPUMonitor extends EventEmitter {
  getStats(): Promise<VRAMStats>
  calculateOffloadRecommendation(modelSizeMB: number): OffloadRecommendation
  getRecommendedLayers(modelSizeMB: number, totalLayers: number): number
  formatStatus(): string
}
```

**Supported GPUs**:
- **NVIDIA**: nvidia-smi
- **AMD**: ROCm (rocm-smi)
- **Apple**: Metal (ioreg)
- **Intel**: intel_gpu_top

**Key Features**:
- Real-time VRAM monitoring
- Dynamic offload recommendations
- Memory pressure detection
- Vendor-agnostic abstraction

---

### Models Module (`src/models/`)

**Purpose**: HuggingFace model management and auto-download.

**Components**:

#### ModelHub (`src/models/model-hub.ts`)

```typescript
class ModelHub extends EventEmitter {
  initialize(): Promise<void>
  downloadModel(modelId: string, quantization: QuantizationType): Promise<DownloadedModel>
  getRecommendedModels(vramMB: number): ModelInfo[]
  listDownloadedModels(): Promise<DownloadedModel[]>
  deleteModel(modelPath: string): Promise<void>
  formatStatus(): string
}
```

**Recommended Models**:
| Model | VRAM | Use Case |
|-------|------|----------|
| devstral-7b | 6GB | Code-specialized |
| codellama-7b | 6GB | Meta code model |
| deepseek-coder-7b | 6GB | Chinese code model |
| qwen-coder-7b | 6GB | Alibaba code model |
| llama-3.2-3b | 3GB | Lightweight, fast |
| granite-3b | 3GB | IBM efficient model |

**Quantization Types**: Q8_0, Q6_K, Q5_K_M, Q4_K_M, Q4_0

---

### Codebase RAG Enhancements (`src/context/codebase-rag/`)

#### OllamaEmbeddingProvider (`ollama-embeddings.ts`)

```typescript
class OllamaEmbeddingProvider extends EventEmitter {
  initialize(): Promise<boolean>
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  embedChunk(chunk: CodeChunk): Promise<number[]>
  similarity(a: number[], b: number[]): number
  getDimensions(): number
}
```

**Embedding Models**:
| Model | Dimensions | Description |
|-------|------------|-------------|
| nomic-embed-text | 768 | Best quality for code |
| mxbai-embed-large | 1024 | High quality, larger |
| all-minilm | 384 | Fast, lightweight |
| snowflake-arctic-embed | 1024 | State-of-the-art retrieval |
| bge-m3 | 1024 | Multilingual |

**Features**:
- Auto-pulls models from Ollama
- Batch processing with configurable batch size
- Retry logic with exponential backoff
- Graceful fallback to zero vectors

#### HNSWVectorStore (`hnsw-store.ts`)

```typescript
class HNSWVectorStore {
  add(id: string, vector: number[], metadata?: Record<string, unknown>): void
  search(query: number[], k: number): Array<{ id: string; score: number }>
  delete(id: string): boolean
  save(filePath: string): Promise<void>
  load(filePath: string): Promise<void>
  getStats(): object
}
```

**HNSW Parameters**:
```typescript
{
  M: 16,              // Max connections per node
  efConstruction: 200, // Build-time quality
  efSearch: 50,        // Search-time quality
  maxElements: 1000000 // Max capacity
}
```

**Performance**:
| Size | Brute Force | HNSW |
|------|-------------|------|
| 10K vectors | 100ms | 2ms |
| 100K vectors | 1s | 5ms |
| 1M vectors | 10s | 10ms |

**Features**:
- O(log n) search complexity
- Persistence to disk
- Incremental updates
- Metadata filtering

---

### Architecture Diagram (Updated)

```
┌─────────────────────────────────────────────────────────────┐
│                      Local LLM Stack                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  GPUMonitor  │    │  ModelHub    │    │ OllamaEmbed  │  │
│  │              │    │              │    │              │  │
│  │ • VRAM stats │    │ • Download   │    │ • Embed text │  │
│  │ • Offload    │    │ • Recommend  │    │ • Batch      │  │
│  │ • Layers     │    │ • Quantize   │    │ • Similarity │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         └─────────────┬─────┴─────────────┬─────┘           │
│                       │                   │                 │
│                       ▼                   ▼                 │
│              ┌──────────────┐    ┌──────────────┐          │
│              │ HNSWStore    │    │ Ollama/LM    │          │
│              │              │    │ Studio       │          │
│              │ • Add vector │    │              │          │
│              │ • Search     │    │ • /api/embed │          │
│              │ • Persist    │    │ • /api/chat  │          │
│              └──────────────┘    └──────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Analytics Module (`src/analytics/`)

**Purpose**: Track and analyze usage patterns, costs, and codebase evolution.

### PrometheusExporter

```typescript
class PrometheusExporter extends EventEmitter {
  registerMetric(definition: MetricDefinition): void
  inc(name: string, value?: number, labels?: Record<string, string>): void
  set(name: string, value: number, labels?: Record<string, string>): void
  observe(name: string, value: number, labels?: Record<string, string>): void
  start(): Promise<void>  // HTTP server on port 9090
  pushToGateway(url: string, job: string): Promise<void>
}
```

**Default Metrics**:
- `codebuddy_sessions_total`: Total sessions started
- `codebuddy_messages_total`: Messages by role
- `codebuddy_tokens_total`: Token usage by type
- `codebuddy_tool_calls_total`: Tool calls by tool/status
- `codebuddy_api_cost_dollars`: API costs
- `codebuddy_response_time_seconds`: Response latency histogram

### ROITracker

```typescript
class ROITracker {
  recordTask(task: TaskCompletion): void
  getReport(days?: number): ROIReport
  formatReport(report: ROIReport): string
}
```

**Metrics Tracked**:
- Time saved vs manual completion
- API cost per task type
- Productivity multiplier
- Net value (time saved × hourly rate - API cost)

### CodeEvolution

```typescript
function generateEvolutionReport(options: EvolutionOptions): EvolutionReport
function formatEvolutionReport(report: EvolutionReport): string
```

**Analyzes**:
- Lines of code over time
- File count trends
- Language distribution
- Growth velocity

### CodebaseHeatmap

```typescript
function generateHeatmap(options: HeatmapOptions): HeatmapData
function formatHeatmap(data: HeatmapData): string
```

**Visualizes**:
- File modification frequency
- Churn analysis (additions + deletions)
- Top contributors
- Hot/cold spots

---

## Intelligence Module (`src/intelligence/`)

**Purpose**: Provide intelligent suggestions and analysis capabilities.

### SemanticSearch

```typescript
class SemanticSearchEngine {
  indexConversation(messages: ConversationMessage[]): void
  search(query: string, options?: SearchOptions): SearchResult[]
  getSuggestions(partial: string): string[]
}
```

**Features**:
- Fuzzy matching with configurable threshold
- Word-level indexing
- Stop word filtering
- Result scoring and ranking

### ProactiveSuggestions

```typescript
class ProactiveSuggestions extends EventEmitter {
  analyze(): Promise<Suggestion[]>
  getGitSuggestions(): Promise<Suggestion[]>
  getCodeSuggestions(): Promise<Suggestion[]>
}
```

**Suggestion Types**:
- Uncommitted changes
- Outdated dependencies
- Missing tests
- Documentation gaps
- Security issues

### RefactoringRecommender

```typescript
class RefactoringRecommender {
  analyzeFile(filePath: string): Promise<RefactoringOpportunity[]>
  analyzeProject(options?: AnalysisOptions): Promise<RefactoringReport>
}
```

**Detects 20+ Patterns**:
- Extract method/variable
- Simplify conditionals
- Remove dead code
- Modernize syntax
- Improve type safety

### TaskComplexityEstimator

```typescript
class TaskComplexityEstimator {
  estimateTask(description: string): ComplexityEstimate
  estimateFromFiles(files: string[]): ComplexityEstimate
}
```

**Estimates**:
- Task type classification
- Effort in hours
- Risk level
- Breakdown by phase

---

## API Module (`src/api/`)

**Purpose**: External integration capabilities.

### RestApiServer

```typescript
class RestApiServer extends EventEmitter {
  start(): Promise<void>
  stop(): Promise<void>
}
```

**Endpoints**:
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/prompt | Send prompt to AI |
| POST | /api/tools/:tool | Execute specific tool |
| GET | /api/sessions | List sessions |
| GET | /api/metrics | Get usage metrics |

### WebhookManager

```typescript
class WebhookManager extends EventEmitter {
  register(webhook: WebhookConfig): void
  trigger(event: string, payload: object): Promise<void>
  verify(signature: string, payload: string): boolean
}
```

**Events**:
- `session.start`, `session.end`
- `message.sent`, `message.received`
- `tool.called`, `tool.completed`
- `file.read`, `file.write`
- `error`, `cost.threshold`

**Security**: HMAC-SHA256 signature verification

---

## UI Enhancements (`src/ui/`)

### New Components

| Component | Purpose |
|-----------|---------|
| `NavigableHistory` | Up/down arrow navigation |
| `PathAutocomplete` | File path completion |
| `ModificationPreview` | Diff before changes |
| `SplitScreenDiff` | Side-by-side comparison |
| `ClipboardManager` | Enhanced copy/paste with history |
| `SoundNotifications` | Audio feedback |
| `CompactMode` | Small screen optimization |
| `MetricsDashboard` | Usage visualization |

---

## Future Architecture Considerations

### Planned Improvements

1. **Plugin System**
   - Dynamic tool loading
   - Third-party extensions
   - Plugin marketplace

2. **Workspace Awareness**
   - Git branch context
   - Project type detection
   - Auto-configuration

3. **Advanced Caching**
   - Response caching
   - Tool result caching
   - Prompt template caching

4. **Multi-Agent Support**
   - Parallel agent execution
   - Agent specialization
   - Agent communication

---

## Diagrams

### Component Dependency Graph

```
index.ts
    │
    ├─▶ ChatInterface
    │       │
    │       ├─▶ ChatHistory
    │       ├─▶ ChatInput
    │       ├─▶ ConfirmationDialog
    │       └─▶ DiffRenderer
    │
    └─▶ CodeBuddyAgent
            │
            ├─▶ CodeBuddyClient
            │
            ├─▶ ConfirmationService
            │
            └─▶ Tools
                    │
                    ├─▶ PathValidator
                    ├─▶ CommandValidator
                    └─▶ FileOperations
```

---

## Conclusion

Code Buddy's architecture prioritizes:
- **Modularity**: Clear separation of concerns
- **Security**: Multiple validation layers
- **Extensibility**: Easy to add new tools and features
- **User Experience**: Responsive UI with visual feedback
- **Reliability**: Comprehensive error handling

For questions or clarifications, please open an issue on GitHub.
