# Disposable System Documentation

## Overview

The Disposable system provides a standardized way to manage lifecycle and cleanup for singleton instances and other long-lived resources in the Grok CLI application.

## Architecture

### Core Components

1. **Disposable Interface** (`src/utils/disposable.ts`)
   - Defines the contract for disposable resources
   - Single method: `dispose(): void | Promise<void>`

2. **DisposableManager** (`src/utils/disposable.ts`)
   - Singleton manager that tracks all disposable resources
   - Handles cleanup in LIFO (Last In, First Out) order
   - Supports both synchronous and asynchronous disposal
   - Error-resilient: continues disposal even if individual resources throw errors

3. **Helper Functions**
   - `registerDisposable(disposable)` - Register a resource for cleanup
   - `unregisterDisposable(disposable)` - Remove a resource from tracking
   - `disposeAll()` - Dispose all registered resources
   - `getDisposableManager()` - Get the singleton manager instance

## Implemented Singletons

### 1. ConfirmationService (`src/utils/confirmation-service.ts`)

**Cleanup Actions:**
- Rejects pending confirmations with shutdown message
- Clears pending promises
- Empties dry-run log
- Resets all session flags (fileOperations, bashCommands, allOperations)
- Removes all event listeners

**Example:**
```typescript
import { ConfirmationService } from './utils/confirmation-service.js';

const service = ConfirmationService.getInstance();
// ... use service ...

// On shutdown, automatically cleaned up via disposeAll()
// Or manually: service.dispose();
```

### 2. SettingsManager (`src/utils/settings-manager.ts`)

**Cleanup Actions:**
- Clears internal caches (userSettingsCache, projectSettingsCache)
- Settings files remain intact

**Features:**
- Added caching layer to reduce filesystem reads
- Cache is cleared on disposal to prevent stale data

**Example:**
```typescript
import { SettingsManager } from './utils/settings-manager.js';

const manager = SettingsManager.getInstance();
// ... use manager ...

// Automatically cleaned up on shutdown
```

### 3. RenderManager (`src/renderers/render-manager.ts`)

**Cleanup Actions:**
- Clears all registered renderers
- Resets render context to defaults

**Example:**
```typescript
import { getRenderManager } from './renderers/render-manager.js';

const manager = getRenderManager();
// ... use manager ...

// Automatically cleaned up on shutdown
```

## Integration with Process Lifecycle

The disposable system is integrated into `src/index.ts` to ensure proper cleanup on application exit:

```typescript
// Cleanup on various exit signals
process.on("SIGTERM", async () => {
  await cleanup(); // Calls disposeAll()
  process.exit(0);
});

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught exception:", error);
  await cleanup();
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  await cleanup();
  process.exit(1);
});

process.on("beforeExit", async () => {
  await cleanup();
});
```

## Benefits

1. **Predictable Cleanup**: All resources are cleaned up in a consistent order
2. **Resource Leak Prevention**: Ensures event listeners, caches, and pending operations are properly disposed
3. **Testing Support**: Singletons can be reset between tests via `resetInstance()` methods
4. **Error Resilience**: Disposal continues even if individual resources fail
5. **Async Support**: Handles both sync and async cleanup operations

## Usage Patterns

### Creating a Disposable Singleton

```typescript
import { Disposable, registerDisposable } from './utils/disposable.js';

export class MyService implements Disposable {
  private static instance: MyService;

  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
      registerDisposable(MyService.instance);
    }
    return MyService.instance;
  }

  dispose(): void {
    // Clean up resources
    // - Clear caches
    // - Remove event listeners
    // - Close connections
    // - Cancel pending operations
  }

  static resetInstance(): void {
    if (MyService.instance) {
      MyService.instance.dispose();
      MyService.instance = null as any;
    }
  }
}
```

### Testing Disposable Resources

```typescript
import { describe, it, beforeEach, afterEach } from '@jest/globals';
import { getDisposableManager } from '../src/utils/disposable.js';
import { MyService } from '../src/services/my-service.js';

describe('MyService', () => {
  beforeEach(() => {
    // Reset for clean test state
    getDisposableManager().reset();
    MyService.resetInstance();
  });

  afterEach(async () => {
    // Clean up after test
    await getDisposableManager().disposeAll();
  });

  it('should clean up resources on dispose', () => {
    const service = MyService.getInstance();
    // ... test disposal behavior ...
  });
});
```

## Disposal Order

Resources are disposed in **LIFO (Last In, First Out)** order:

```typescript
registerDisposable(serviceA); // First registered
registerDisposable(serviceB);
registerDisposable(serviceC); // Last registered

await disposeAll();
// Disposal order: serviceC → serviceB → serviceA
```

This ensures that dependencies are disposed in the correct order (most recent first).

## Error Handling

The DisposableManager handles errors gracefully:

```typescript
const disposable = {
  dispose: () => {
    throw new Error('Disposal failed');
  }
};

registerDisposable(disposable);
await disposeAll(); // Continues despite error, logs to console
```

Errors are logged but do not prevent other resources from being disposed.

## Future Enhancements

Potential additions to the disposable system:

1. **Dependency Tracking**: Explicit dependency relationships between disposables
2. **Disposal Groups**: Organize disposables into groups with different lifecycles
3. **Disposal Events**: Emit events before/after disposal for monitoring
4. **Timeout Support**: Enforce maximum disposal time per resource
5. **Disposal Priorities**: Allow manual priority ordering instead of just LIFO

## API Reference

### Disposable Interface

```typescript
interface Disposable {
  dispose(): void | Promise<void>;
}
```

### DisposableManager

```typescript
class DisposableManager {
  register(disposable: Disposable): void
  unregister(disposable: Disposable): void
  disposeAll(): Promise<void>
  isDisposed(): boolean
  getCount(): number
  reset(): void
}
```

### Helper Functions

```typescript
function registerDisposable(disposable: Disposable): void
function unregisterDisposable(disposable: Disposable): void
function disposeAll(): Promise<void>
function getDisposableManager(): DisposableManager
```

## Testing

Comprehensive test coverage includes:

- **Unit Tests** (`tests/utils/disposable.test.ts`): Tests for DisposableManager core functionality
- **Integration Tests** (`tests/utils/singleton-disposal.test.ts`): Tests for singleton cleanup behavior

Run tests:
```bash
npm test -- tests/utils/disposable.test.ts
npm test -- tests/utils/singleton-disposal.test.ts
```

All tests pass with 100% coverage of disposal logic.
