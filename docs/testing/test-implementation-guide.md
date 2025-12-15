# Guide d'Implémentation des Tests - Code Buddy

Ce guide fournit des exemples concrets et des templates pour implémenter les tests manquants dans Code Buddy.

---

## 1. Templates de Tests par Type

### 1.1 Test Unitaire Simple

```typescript
/**
 * Tests for module-name.ts
 */

import { FunctionName, ClassName } from '../src/path/to/module.js';

describe('ClassName', () => {
  let instance: ClassName;

  beforeEach(() => {
    instance = new ClassName();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should do expected behavior', () => {
      const result = instance.methodName('input');
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      expect(() => instance.methodName(null)).toThrow();
    });
  });
});
```

### 1.2 Test avec Mocks

```typescript
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../src/dependencies/module.js', () => ({
  externalFunction: jest.fn().mockReturnValue('mocked'),
}));

describe('Module with Dependencies', () => {
  it('should use mocked dependency', () => {
    const { externalFunction } = require('../src/dependencies/module.js');
    
    // Test code
    const result = myFunction();
    
    expect(externalFunction).toHaveBeenCalled();
  });
});
```

### 1.3 Test Asynchrone

```typescript
describe('Async Operations', () => {
  it('should handle promises', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
  });

  it('should handle errors', async () => {
    await expect(failingAsync()).rejects.toThrow('Error message');
  });
});
```

### 1.4 Test avec EventEmitter

```typescript
import { EventEmitter } from 'events';

describe('Event-based System', () => {
  it('should emit events', (done) => {
    const emitter = new MyEmitter();
    
    emitter.on('event', (data) => {
      expect(data).toEqual({ foo: 'bar' });
      done();
    });
    
    emitter.trigger();
  });
});
```

---

## 2. Exemples Spécifiques pour Modules Critiques

### 2.1 Tests pour `grok-agent.ts`

```typescript
/**
 * Tests for grok-agent.ts - Agent Core
 */

import { CodeBuddyAgent } from '../src/agent/grok-agent.js';
import { jest } from '@jest/globals';

// Mock CodeBuddyClient
jest.mock('../src/codebuddy/client.js', () => ({
  CodeBuddyClient: jest.fn().mockImplementation(() => ({
    chat: jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'response' } }],
    }),
  })),
}));

describe('CodeBuddyAgent', () => {
  let agent: CodeBuddyAgent;

  beforeEach(() => {
    agent = new CodeBuddyAgent({
      apiKey: 'test-key',
      workingDirectory: '/test/dir',
    });
  });

  describe('Agentic Loop', () => {
    it('should execute tool calls in loop', async () => {
      // Mock tool execution
      const mockTool = jest.fn().mockResolvedValue({
        success: true,
        result: 'tool result',
      });

      await agent.run('Test task');

      // Verify tool was called
      expect(mockTool).toHaveBeenCalled();
    });

    it('should respect max rounds limit', async () => {
      // Configure for quick test
      agent.setMaxRounds(3);

      await agent.run('Complex task');

      // Verify stopped after max rounds
      expect(agent.getCurrentRound()).toBeLessThanOrEqual(3);
    });

    it('should handle streaming responses', (done) => {
      agent.on('stream', (chunk) => {
        expect(chunk).toBeDefined();
      });

      agent.on('complete', () => {
        done();
      });

      agent.run('Task');
    });
  });

  describe('Tool Management', () => {
    it('should register tools correctly', () => {
      const tool = {
        name: 'test-tool',
        description: 'Test tool',
        execute: jest.fn(),
      };

      agent.registerTool(tool);

      expect(agent.getTools()).toContain(tool);
    });

    it('should execute tool with confirmation', async () => {
      const confirmSpy = jest.spyOn(agent, 'requestConfirmation');
      confirmSpy.mockResolvedValue(true);

      await agent.executeTool('destructive-tool', {});

      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      const client = agent.getClient();
      client.chat.mockRejectedValue(new Error('API Error'));

      await expect(agent.run('Task')).rejects.toThrow();
    });

    it('should retry on transient errors', async () => {
      const client = agent.getClient();
      
      // Fail first two times, succeed third
      client.chat
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue({ success: true });

      const result = await agent.run('Task', { retries: 3 });
      
      expect(result.success).toBe(true);
    });
  });
});
```

### 2.2 Tests pour `slash-commands.ts`

```typescript
/**
 * Tests for slash-commands.ts
 */

import { SlashCommandHandler } from '../src/commands/slash-commands.js';
import { jest } from '@jest/globals';

describe('SlashCommandHandler', () => {
  let handler: SlashCommandHandler;
  let mockAgent: any;

  beforeEach(() => {
    mockAgent = {
      setModel: jest.fn(),
      getStats: jest.fn().mockReturnValue({ tokens: 1000 }),
      clear: jest.fn(),
    };

    handler = new SlashCommandHandler(mockAgent);
  });

  describe('/model command', () => {
    it('should switch model', async () => {
      await handler.execute('/model grok-2');
      
      expect(mockAgent.setModel).toHaveBeenCalledWith('grok-2');
    });

    it('should list available models', async () => {
      const result = await handler.execute('/model');
      
      expect(result).toContain('Available models:');
    });
  });

  describe('/stats command', () => {
    it('should display statistics', async () => {
      const result = await handler.execute('/stats');
      
      expect(result).toContain('tokens: 1000');
    });

    it('should support summary format', async () => {
      const result = await handler.execute('/stats summary');
      
      expect(result).toMatch(/Summary:/);
    });
  });

  describe('/clear command', () => {
    it('should clear chat history', async () => {
      await handler.execute('/clear');
      
      expect(mockAgent.clear).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands', async () => {
      const result = await handler.execute('/unknown');
      
      expect(result).toContain('Unknown command');
    });

    it('should handle malformed commands', async () => {
      const result = await handler.execute('no-slash');
      
      expect(result).toBe(null);
    });
  });
});
```

### 2.3 Tests pour `bash.ts`

```typescript
/**
 * Tests for bash.ts - Critical Security Tests
 */

import { BashTool } from '../src/tools/bash.js';
import { jest } from '@jest/globals';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('BashTool', () => {
  let bashTool: BashTool;

  beforeEach(() => {
    bashTool = new BashTool({ workdir: '/test' });
  });

  describe('Security', () => {
    it('should block dangerous commands', async () => {
      const dangerous = [
        'rm -rf /',
        'dd if=/dev/zero of=/dev/sda',
        'chmod -R 777 /',
      ];

      for (const cmd of dangerous) {
        await expect(bashTool.execute(cmd)).rejects.toThrow(/blocked/i);
      }
    });

    it('should require confirmation for destructive ops', async () => {
      const confirmSpy = jest.fn().mockResolvedValue(true);
      bashTool.setConfirmation(confirmSpy);

      await bashTool.execute('rm file.txt');

      expect(confirmSpy).toHaveBeenCalled();
    });

    it('should sandbox execution', async () => {
      const result = await bashTool.execute('pwd');
      
      expect(result.cwd).toBe('/test');
    });
  });

  describe('Command Execution', () => {
    it('should execute safe commands', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };

      spawn.mockReturnValue(mockProcess);

      const result = await bashTool.execute('echo "test"');
      
      expect(result.exitCode).toBe(0);
    });

    it('should handle command errors', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn((event, cb) => {
          cb('error message');
        }) },
        on: jest.fn((event, cb) => {
          if (event === 'close') cb(1);
        }),
      };

      spawn.mockReturnValue(mockProcess);

      const result = await bashTool.execute('invalid-command');
      
      expect(result.exitCode).not.toBe(0);
    });

    it('should timeout long-running commands', async () => {
      bashTool.setTimeout(100);

      // Mock never-ending process
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
      };

      spawn.mockReturnValue(mockProcess);

      await expect(bashTool.execute('sleep 999')).rejects.toThrow(/timeout/i);
    });
  });

  describe('Environment', () => {
    it('should preserve safe environment variables', async () => {
      bashTool.setEnv({ SAFE_VAR: 'value' });

      const result = await bashTool.execute('echo $SAFE_VAR');
      
      expect(result.output).toContain('value');
    });

    it('should not expose sensitive env vars', async () => {
      // System should not expose API keys, passwords, etc.
      process.env.GROK_API_KEY = 'secret';

      const result = await bashTool.execute('env');
      
      expect(result.output).not.toContain('secret');
    });
  });
});
```

### 2.4 Tests pour `multi-agent-system.ts`

```typescript
/**
 * Tests for multi-agent-system.ts
 */

import { MultiAgentSystem } from '../src/agent/multi-agent/multi-agent-system.js';
import { jest } from '@jest/globals';

describe('MultiAgentSystem', () => {
  let system: MultiAgentSystem;

  beforeEach(() => {
    system = new MultiAgentSystem({
      apiKey: 'test-key',
    });
  });

  describe('Agent Coordination', () => {
    it('should coordinate multiple agents', async () => {
      const task = {
        description: 'Build a feature',
        type: 'development',
      };

      const result = await system.execute(task);

      expect(result.success).toBe(true);
      expect(result.contributions).toHaveLength(3); // orchestrator, coder, reviewer
    });

    it('should allocate tasks to appropriate agents', async () => {
      const testTask = { type: 'testing' };
      
      const assignment = await system.allocateTask(testTask);

      expect(assignment.agent).toBe('tester');
    });

    it('should handle agent failures gracefully', async () => {
      // Mock coder agent failure
      const coderAgent = system.getAgent('coder');
      jest.spyOn(coderAgent, 'execute').mockRejectedValue(new Error('Coder failed'));

      const result = await system.execute({
        description: 'Task',
        fallback: true,
      });

      // Should use fallback agent
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('Performance Tracking', () => {
    it('should track agent performance', async () => {
      await system.execute({ description: 'Task 1', type: 'code' });
      await system.execute({ description: 'Task 2', type: 'code' });

      const stats = system.getAgentStats('coder');

      expect(stats.tasksCompleted).toBe(2);
      expect(stats.successRate).toBeGreaterThan(0);
    });

    it('should adapt task allocation based on performance', async () => {
      // Make one agent perform poorly
      const weakAgent = system.getAgent('coder');
      weakAgent.setSuccessRate(0.2);

      const strongAgent = system.getAgent('orchestrator');
      strongAgent.setSuccessRate(0.9);

      const assignment = await system.allocateTask({
        type: 'code',
        adaptive: true,
      });

      // Should prefer strong agent
      expect(assignment.agent).toBe('orchestrator');
    });
  });
});
```

---

## 3. Best Practices

### 3.1 Naming Conventions

```typescript
// Good
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => {});
    it('should throw error for invalid email', () => {});
  });
});

// Bad
describe('User stuff', () => {
  it('test 1', () => {});
});
```

### 3.2 Test Organization

```
tests/
├── unit/           # Tests unitaires purs
│   ├── utils/
│   ├── tools/
│   └── agent/
├── integration/    # Tests d'intégration
│   ├── database/
│   ├── api/
│   └── workflow/
└── e2e/           # Tests end-to-end
    ├── scenarios/
    └── user-flows/
```

### 3.3 Fixtures et Helpers

```typescript
// tests/fixtures/agent-fixtures.ts
export const mockAgent = () => ({
  execute: jest.fn().mockResolvedValue({ success: true }),
  getTools: jest.fn().mockReturnValue([]),
  setModel: jest.fn(),
});

// tests/helpers/test-utils.ts
export async function waitFor(condition: () => boolean, timeout = 1000) {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 10));
  }
  if (!condition()) throw new Error('Timeout waiting for condition');
}
```

---

## 4. Configuration Jest Recommandée

```javascript
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

---

## 5. Checklist pour Nouveaux Tests

Avant de commencer:
- [ ] Identifier le module à tester
- [ ] Lister les fonctions/méthodes critiques
- [ ] Identifier les dépendances à mocker
- [ ] Définir les cas de test (nominal, erreurs, edge cases)

Pendant l'écriture:
- [ ] Test de comportement nominal
- [ ] Tests d'erreurs
- [ ] Tests de cas limites (null, undefined, empty)
- [ ] Tests asynchrones si applicable
- [ ] Tests de sécurité si critique

Après l'écriture:
- [ ] Vérifier couverture >70%
- [ ] Exécuter tous les tests
- [ ] Vérifier pas de tests flaky
- [ ] Documenter tests complexes
- [ ] Review par un pair

---

## 6. Outils Utiles

### Test Coverage Report
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Watch Mode
```bash
npm run test:watch
```

### Test Specific File
```bash
npm test -- path/to/test.test.ts
```

### Debug Tests
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

*Guide maintenu par l'équipe Code Buddy - 2025-12-09*
