# Integration Tests

## Overview

Integration tests verify the interaction between multiple modules in the Code Buddy system.

## Test Files

| File | Covers |
|------|--------|
| `channel-system-e2e.test.ts` | Full channel message flow (session isolation → DM pairing → routing → lane queue) |
| `multi-channel-identity.test.ts` | Cross-channel identity linking and session key convergence |
| `pipeline-skill-flow.test.ts` | Pipeline execution with skills and transforms |
| `security-sandbox.test.ts` | Sandbox evaluation safety + source code static analysis |
| `concurrency-stress.test.ts` | LaneQueue stress tests (50+ concurrent tasks, deadlock detection) |

## Running

```bash
npm test -- tests/integration/
```

## What's Mocked

- **LLM API calls**: Never made; tool executors are stubbed
- **File system**: Minimal; only static analysis reads source files
- **Network**: No external connections

## What's Real

- Session isolation, identity linking, DM pairing logic
- LaneQueue concurrency control
- Pipeline compositor transforms
- Sandbox `vm.runInNewContext` evaluation
