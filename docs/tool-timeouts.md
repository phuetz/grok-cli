# Tool Timeout System

## Overview

The Grok CLI implements a comprehensive per-tool timeout system to prevent runaway tool executions and provide better control over long-running operations.

## Features

### 1. Per-Tool Timeout Configuration

Each tool has a specific timeout value that can be configured independently:

```typescript
// Default timeouts (in milliseconds)
{
  bash: 300000,              // 5 minutes (long-running commands)
  search: 30000,             // 30 seconds (large codebases)
  view_file: 10000,          // 10 seconds (file reading)
  create_file: 10000,        // 10 seconds (file writing)
  str_replace_editor: 30000, // 30 seconds (editing)
  edit_file: 60000,          // 60 seconds (Morph API)
  web_search: 30000,         // 30 seconds (network)
  web_fetch: 30000,          // 30 seconds (network)
  default: 60000,            // 60 seconds (fallback)
  hardLimit: 600000          // 10 minutes (absolute max)
}
```

### 2. Configuration Methods

#### Via Settings File

Edit `.grok/settings.json` in your project:

```json
{
  "model": "grok-code-fast-1",
  "toolTimeouts": {
    "bash": 600000,
    "search": 45000,
    "default": 90000,
    "hardLimit": 900000
  }
}
```

#### Via Settings Manager API

```typescript
import { getSettingsManager } from "./utils/settings-manager";

const manager = getSettingsManager();

// Update specific tool timeout
manager.updateToolTimeouts({
  bash: 600000  // 10 minutes
});

// Get timeout for a specific tool
const timeout = manager.getToolTimeout("bash");
```

### 3. Timeout Behavior

When a tool execution exceeds its timeout:

1. **Abort Signal**: The execution receives an abort signal
2. **Error Response**: Returns a `ToolResult` with `success: false`
3. **Error Message**: Provides clear timeout information:
   ```
   Tool 'bash' execution timed out after 300000ms.
   Consider increasing the timeout or optimizing the operation.
   ```
4. **Metrics Update**: Increments timeout counters for tracking
5. **Resource Cleanup**: Automatically cleans up abort controllers

### 4. Timeout Metrics

The system tracks comprehensive timeout metrics:

```typescript
interface ToolMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timeoutCount: number;              // Total timeout occurrences
  timeoutsByTool: Map<string, number>; // Per-tool timeout counts
  totalExecutionTime: number;
  toolRequestCounts: Map<string, number>;
}

// Access metrics
const metrics = toolExecutor.getMetrics();
console.log(`Total timeouts: ${metrics.timeoutCount}`);
console.log(`Bash timeouts: ${metrics.timeoutsByTool.get('bash')}`);
```

### 5. Execution Control

Advanced control methods for managing tool executions:

```typescript
// Abort specific execution
const aborted = toolExecutor.abortExecution(toolCallId);

// Abort all active executions
toolExecutor.abortAllExecutions();

// Check active execution count
const activeCount = toolExecutor.getActiveExecutionCount();
```

## Implementation Details

### Architecture

The timeout system is implemented across three main components:

#### 1. Settings Manager (`src/utils/settings-manager.ts`)

- Stores and manages timeout configurations
- Provides per-tool timeout lookup
- Enforces hard limits

#### 2. Tool Executor (`src/agent/tool-executor.ts`)

- Wraps tool execution with timeout protection
- Uses `Promise.race()` for timeout enforcement
- Manages abort controllers for cleanup
- Tracks timeout metrics

#### 3. Tool Definitions (`src/grok/tools.ts`)

- Provides timeout hints for each tool
- Documents recommended timeouts
- Helps optimize performance

### Execution Flow

```
1. Tool Call Received
   ↓
2. Get Timeout from Settings (per-tool or default)
   ↓
3. Create AbortController
   ↓
4. Execute with Promise.race([execution, timeout])
   ↓
5. If timeout wins:
   - Abort execution
   - Log timeout
   - Return error
   ↓
6. Cleanup AbortController
   ↓
7. Update Metrics
```

### Key Implementation Features

#### Race Condition Protection

```typescript
const result = await Promise.race([
  toolExecution(),
  timeoutPromise
]);
```

#### Proper Resource Cleanup

```typescript
try {
  const result = await executeWithTimeout(...);
  return result;
} finally {
  // Always cleanup abort controller
  this.activeExecutions.delete(toolCall.id);
}
```

#### Meaningful Error Messages

```typescript
return {
  success: false,
  error: `Tool '${toolName}' execution timed out after ${timeoutMs}ms.
          Consider increasing the timeout or optimizing the operation.`
};
```

## Testing

Comprehensive test suite in `tests/agent/tool-timeout.test.ts`:

### Test Coverage

1. **Configuration Tests**
   - Per-tool timeout application
   - Different timeouts for different tools
   - Settings manager integration

2. **Timeout Behavior Tests**
   - Long-running operations timeout
   - Fast operations complete successfully
   - Meaningful error messages

3. **Metrics Tests**
   - Total timeout count tracking
   - Per-tool timeout tracking
   - Metrics reset functionality

4. **Execution Control Tests**
   - Active execution tracking
   - Abort specific execution
   - Abort all executions

5. **Edge Cases**
   - Errors before timeout
   - Timeout cleanup
   - Concurrent executions with different timeouts

### Running Tests

```bash
# Run timeout tests
npm test -- tests/agent/tool-timeout.test.ts

# Run all tool executor tests
npm test -- tests/agent/tool-executor.test.ts
```

## Use Cases

### 1. Preventing Infinite Loops

```typescript
// Bash command that might hang
{
  toolTimeouts: {
    bash: 60000  // Kill after 1 minute
  }
}
```

### 2. Network Operation Timeouts

```typescript
// Web operations with flaky network
{
  toolTimeouts: {
    web_search: 15000,  // 15 seconds
    web_fetch: 20000    // 20 seconds
  }
}
```

### 3. Large Codebase Operations

```typescript
// Search in massive repositories
{
  toolTimeouts: {
    search: 120000,        // 2 minutes
    find_references: 90000 // 1.5 minutes
  }
}
```

### 4. AI-Powered Tools

```typescript
// Tools using external APIs
{
  toolTimeouts: {
    edit_file: 120000,      // 2 minutes for Morph
    spawn_subagent: 600000  // 10 minutes for subagents
  }
}
```

## Best Practices

### 1. Set Appropriate Timeouts

- **Fast operations** (file I/O): 10-30 seconds
- **Network operations**: 30-60 seconds
- **Search operations**: 30-120 seconds
- **Bash commands**: 5-10 minutes
- **AI operations**: 1-5 minutes

### 2. Monitor Timeout Metrics

```typescript
const metrics = toolExecutor.getMetrics();
if (metrics.timeoutCount > metrics.totalExecutions * 0.1) {
  console.warn("High timeout rate - consider increasing timeouts");
}
```

### 3. Use Hard Limits

Always set a hard limit to prevent any tool from running indefinitely:

```typescript
{
  toolTimeouts: {
    hardLimit: 600000  // Absolute max: 10 minutes
  }
}
```

### 4. Cleanup on Abort

When aborting operations, ensure proper cleanup:

```typescript
try {
  await operation();
} catch (error) {
  if (error.name === 'AbortError') {
    // Cleanup resources
  }
}
```

## Troubleshooting

### Frequent Timeouts

**Problem**: Tools timing out regularly

**Solutions**:
1. Increase timeout for specific tool
2. Optimize the operation (e.g., limit search scope)
3. Check for performance issues
4. Consider using background tasks

### Long Wait Times

**Problem**: Operations taking too long without timeout

**Solutions**:
1. Reduce timeout values
2. Implement progress indicators
3. Break into smaller operations
4. Use streaming responses

### Memory Leaks

**Problem**: Abort controllers not being cleaned up

**Solutions**:
1. Verify `finally` blocks execute
2. Check `activeExecutions` map size
3. Call `abortAllExecutions()` on shutdown

## Future Enhancements

Potential improvements to the timeout system:

1. **Dynamic Timeouts**: Adjust based on operation size
2. **User Notifications**: Warn when approaching timeout
3. **Retry Logic**: Automatic retry with longer timeout
4. **Background Mode**: Move to background instead of timeout
5. **Timeout Profiles**: Preset configurations for different scenarios
6. **Rate Limiting**: Prevent too many concurrent operations

## API Reference

### ToolTimeoutConfig

```typescript
interface ToolTimeoutConfig {
  default?: number;
  bash?: number;
  search?: number;
  view_file?: number;
  create_file?: number;
  str_replace_editor?: number;
  edit_file?: number;
  web_search?: number;
  web_fetch?: number;
  hardLimit?: number;
}
```

### ToolExecutor Methods

```typescript
class ToolExecutor {
  execute(toolCall: GrokToolCall): Promise<ToolResult>
  abortExecution(toolCallId: string): boolean
  abortAllExecutions(): void
  getActiveExecutionCount(): number
  getMetrics(): ToolMetrics
  resetMetrics(): void
}
```

### SettingsManager Methods

```typescript
class SettingsManager {
  getToolTimeouts(): ToolTimeoutConfig
  updateToolTimeouts(timeouts: Partial<ToolTimeoutConfig>): void
  getToolTimeout(toolName: string): number
}
```

## Related Files

- **Implementation**:
  - `/src/utils/settings-manager.ts` - Configuration management
  - `/src/agent/tool-executor.ts` - Timeout enforcement
  - `/src/grok/tools.ts` - Timeout hints

- **Tests**:
  - `/tests/agent/tool-timeout.test.ts` - Timeout tests
  - `/tests/agent/tool-executor.test.ts` - General executor tests

- **Configuration**:
  - `.grok/settings.json` - Project settings
  - `~/.grok/user-settings.json` - User settings
