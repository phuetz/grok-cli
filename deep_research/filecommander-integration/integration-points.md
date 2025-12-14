# Integration Points Analysis

## Executive Summary

This document identifies specific integration points between code-buddy and FileCommander Enhanced, mapping compatible interfaces, protocols, and subsystems that can enable communication and feature sharing.

---

## 1. FCS Scripting Language Compatibility

### 1.1 Overview

Both code-buddy and FileCommander implement the FCS (FileCommander Script) language, making this the most natural integration point.

### 1.2 code-buddy FCS Implementation

**Location:** `src/fcs/`

**Components:**
- `lexer.ts` - Tokenization
- `parser.ts` - AST generation
- `runtime.ts` - Execution engine
- `builtins.ts` - Standard library
- `grok-bindings.ts` - AI integration

**Namespaces Provided:**
```typescript
grok {
  ask(prompt: string): Promise<string>
  chat(message: string): Promise<string>
  generate(prompt: string, language?: string): Promise<string>
  explain(code: string): Promise<string>
  review(code: string): Promise<string>
  clearHistory(): void
  history(): Array<{role: string, content: string}>
}

tool {
  read(path: string, start?: number, end?: number): string
  write(path: string, content: string): boolean
  edit(path: string, old: string, new: string): boolean
  multiEdit(path: string, edits: Array): boolean
  glob(pattern: string): string[]
  grep(pattern: string, filePattern?: string): Array
  rg(pattern: string, filePattern?: string): Array
  ls(path?: string): string[]
  stat(path: string): object
}

agent {
  run(task: string): Promise<string>
  parallel(tasks: string[]): Promise<string[]>
  securityReview(path?: string): Promise<string>
  codeReview(path?: string): Promise<string>
  generateTests(path: string): Promise<string>
  refactor(path: string, instructions: string): Promise<string>
}

mcp {
  servers(): string[]
  tools(server: string): string[]
  call(server: string, tool: string, args?: object): Promise<unknown>
}

git {
  status(): string
  diff(file?: string): string
  add(pattern: string): boolean
  commit(message: string): boolean
  log(count?: number): string
  branch(): string
}
```

### 1.3 FileCommander FCS Implementation

**Location:** `Scripts/FCS/`

**Available Scripts:**
- `pdf-commands.fcs` - PDF operations
- `help-pdf.fcs` - PDF help
- `demo-ultrathink-pdf.fcs` - PDF demonstrations
- `test-pdf.fcs` - PDF testing

**Scripting Service:** `Services/AdvancedScriptingService.cs`

### 1.4 Integration Opportunity

**Shared FCS Runtime:** Create a bridge that allows both systems to execute FCS scripts with access to both code-buddy AI features and FileCommander VFS operations.

```fcs
// Example: Cross-platform script
let files = vfs.list("vfs://ftp:server!/docs/*.pdf")
for file in files {
  let analysis = grok.ask("Summarize this PDF: " + file.content)
  tool.write(file.name + ".summary.txt", analysis)
}
```

---

## 2. AI/Copilot Provider System

### 2.1 FileCommander ICopilotProvider Interface

```csharp
public interface ICopilotProvider : IDisposable
{
    string Name { get; }
    CopilotProviderType ProviderType { get; }
    CopilotProviderStatus Status { get; }
    bool RequiresAuthentication { get; }
    bool IsAuthenticated { get; }

    Task<bool> InitializeAsync(string? apiKey, CopilotProviderConfig? config, CancellationToken ct);
    Task<CopilotSuggestion?> GetCompletionAsync(CopilotContext context, CancellationToken ct);
    Task<CopilotSuggestion[]> GetAlternativeCompletionsAsync(CopilotContext context, int maxAlternatives, CancellationToken ct);
    Task<bool> ValidateApiKeyAsync(string apiKey, CancellationToken ct);
    Task<string> GetHealthStatusAsync(CancellationToken ct);
    void ReportAcceptance(string suggestionId);
    void ReportRejection(string suggestionId);
}
```

### 2.2 code-buddy Provider System

```typescript
// src/providers/types.ts - Inferred structure
interface LLMProvider {
  chat(messages: Message[]): Promise<Response>
  complete(prompt: string): Promise<string>
  stream(messages: Message[]): AsyncGenerator<Chunk>
}
```

### 2.3 Integration Opportunity

**GrokProvider for FileCommander:** Implement `ICopilotProvider` that wraps code-buddy capabilities.

```csharp
// Potential implementation
public class GrokCLIProvider : ICopilotProvider
{
    public string Name => "Grok CLI";
    public CopilotProviderType ProviderType => CopilotProviderType.LocalModel;

    private Process? _grokProcess;

    public async Task<bool> InitializeAsync(...)
    {
        // Start code-buddy as background process with MCP/stdio mode
        _grokProcess = Process.Start(new ProcessStartInfo
        {
            FileName = "grok",
            Arguments = "--mcp-server",
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
        });
        return true;
    }

    public async Task<CopilotSuggestion?> GetCompletionAsync(CopilotContext context, CancellationToken ct)
    {
        // Send request via JSON-RPC to code-buddy MCP interface
        var request = new { method = "tools/call", params = new { name = "grok.complete", arguments = context } };
        // ...
    }
}
```

---

## 3. Model Context Protocol (MCP)

### 3.1 code-buddy MCP Client

**Location:** `src/mcp/mcp-client.ts`

**Capabilities:**
- stdio transport
- JSON-RPC 2.0
- Tool listing and calling
- Resource reading
- Server management

**Configuration:** `.grok/mcp-servers.json`

```json
{
  "servers": [
    {
      "name": "filecommander",
      "command": "filecommander",
      "args": ["--mcp-server"],
      "enabled": true
    }
  ]
}
```

### 3.2 Integration Opportunity

**FileCommander as MCP Server:** Expose FileCommander's VFS and services via MCP.

```
code-buddy                          FileCommander
    |                                   |
    |-- JSON-RPC: tools/list -->       |
    |<-- {tools: [vfs.list,...]} ------|
    |                                   |
    |-- JSON-RPC: tools/call -->       |
    |   {name: "vfs.copy",             |
    |    args: {src, dst}}             |
    |<-- {result: "success"} ----------|
```

**MCP Tools FileCommander Could Expose:**
- `vfs.list` - List directory contents
- `vfs.read` - Read file content
- `vfs.write` - Write file content
- `vfs.copy` - Copy files
- `vfs.move` - Move files
- `vfs.delete` - Delete files
- `archive.list` - List archive contents
- `archive.extract` - Extract archive
- `search.files` - Search for files
- `search.content` - Search file contents

---

## 4. Plugin Systems

### 4.1 code-buddy Plugin Points

- MCP server integration
- Custom tool registration
- FCS bindings extension
- Provider plugins

### 4.2 FileCommander Plugin Points

**Total Commander Plugins:**
- WCX (Archive)
- WFX (File System)
- WLX (Lister/Viewer)
- WDX (Content)

**Advanced Plugin System:** `Services/Advanced/AdvancedPluginSystem.cs`
- Dynamic loading
- Plugin API
- Scripting bindings

### 4.3 Integration Opportunity

**Cross-Plugin Bridge:**
- code-buddy as a WFX plugin (virtual AI-powered filesystem)
- FileCommander operations exposed as code-buddy tools

---

## 5. IPC Mechanisms

### 5.1 Available Mechanisms

| Mechanism | code-buddy Support | FileCommander Support | Complexity |
|-----------|-----------------|---------------------|-----------|
| stdin/stdout | Native (MCP) | Needs implementation | Low |
| Named Pipes | Node.js supported | .NET supported | Medium |
| Unix Sockets | Node.js supported | .NET supported | Medium |
| TCP/HTTP | Node.js supported | .NET supported | Medium |
| WebSocket | Node.js supported | .NET supported | Medium |
| Shared Memory | Limited | .NET supported | High |

### 5.2 Recommended: JSON-RPC over stdio

**Advantages:**
- Already implemented in code-buddy (MCP)
- Simple, well-documented protocol
- No network configuration required
- Process lifecycle management

**Protocol:**
```
stdin:  {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"grok.ask","arguments":{"prompt":"..."}}}
stdout: {"jsonrpc":"2.0","id":1,"result":{"content":"..."}}
```

---

## 6. Data Exchange Formats

### 6.1 Tool Results

**code-buddy ToolResult:**
```typescript
interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}
```

**FileCommander Result<T>:**
```csharp
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
}
```

### 6.2 Context Exchange

**code-buddy CopilotContext equivalent:**
```typescript
interface Context {
  filePath: string;
  language: string;
  prefixText: string;
  suffixText: string;
  cursorLine: number;
  cursorColumn: number;
}
```

**FileCommander CopilotContext:**
```csharp
public class CopilotContext
{
    public string FilePath { get; set; }
    public string Language { get; set; }
    public string PrefixText { get; set; }
    public string SuffixText { get; set; }
    public int CursorLine { get; set; }
    public int CursorColumn { get; set; }
}
```

These structures are nearly identical, enabling straightforward mapping.

---

## 7. Service Integration Points

### 7.1 code-buddy Services for FileCommander

| Service | Description | Integration Value |
|---------|-------------|-------------------|
| GrokAgent | AI orchestration | High - Advanced AI capabilities |
| SearchTool | Code search | Medium - Enhanced file search |
| TextEditorTool | Smart editing | High - AI-assisted editing |
| GitTool | Git operations | Medium - VCS integration |
| WebSearchTool | Web search | High - Context enrichment |

### 7.2 FileCommander Services for code-buddy

| Service | Description | Integration Value |
|---------|-------------|-------------------|
| VirtualFileSystem3 | Unified file access | High - Archive/FTP/Cloud access |
| EnhancedSearchService | Advanced search | High - Cross-platform search |
| FileOperationService | File operations | Medium - Batch operations |
| PluginService | Plugin hosting | Medium - TC plugin access |
| AuditLoggingService | Audit trail | Low - Compliance features |

---

## 8. Configuration Alignment

### 8.1 code-buddy Configuration Files

- `.grok/settings.json` - Project settings
- `~/.grok/user-settings.json` - User settings
- `~/.grok/grok.db` - SQLite database
- `.grok/mcp-servers.json` - MCP configuration
- `.grokrules` - Project-specific AI behavior

### 8.2 FileCommander Configuration Files

- `~/.config/FileCommander/settings.json` - Application settings
- `~/.config/FileCommander/ftp_profiles.json` - FTP connections
- `~/.config/FileCommander/keyboard_shortcuts.json` - Shortcuts
- `~/.config/FileCommander/bookmarks.json` - Bookmarks

### 8.3 Integration Configuration

**Proposed `.grok/filecommander.json`:**
```json
{
  "enabled": true,
  "executablePath": "/usr/bin/filecommander",
  "mcpMode": true,
  "exposedTools": [
    "vfs.*",
    "archive.*",
    "search.*"
  ],
  "aiFeatures": {
    "codeCompletion": true,
    "fileAnalysis": true
  }
}
```

---

## 9. Summary: Key Integration Points

| Integration Point | Priority | Effort | Value |
|-------------------|----------|--------|-------|
| FCS Script Compatibility | High | Medium | Very High |
| MCP Bidirectional Communication | High | Medium | Very High |
| ICopilotProvider Implementation | Medium | Low | High |
| VFS Tool Exposure | High | Medium | High |
| Shared Configuration | Low | Low | Medium |
| Plugin Bridge | Medium | High | Medium |

### Recommended First Steps

1. **Define MCP Server Interface for FileCommander** - Enables code-buddy to use VFS operations
2. **Implement GrokProvider for FileCommander** - Enables FC to use code-buddy AI
3. **Align FCS Namespaces** - Create interoperable scripts
4. **Create Integration Configuration Schema** - Standardize settings

These integration points form the foundation for the technical options detailed in the next document.
