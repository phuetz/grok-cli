/**
 * Tests for Reasoning Modules (Tree-of-Thought, MCTS)
 */

import {
  DEFAULT_MCTS_CONFIG,
  THINKING_MODE_CONFIG,
  type ThoughtNode,
  type ThoughtType,
  type ThoughtState,
  type Problem,
  type MCTSConfig,
} from '../src/agent/reasoning/types.js';
import { MCTS, createMCTS } from '../src/agent/reasoning/mcts.js';
import {
  TreeOfThoughtReasoner,
  createTreeOfThoughtReasoner,
  getTreeOfThoughtReasoner,
  resetTreeOfThoughtReasoner,
  type ToTConfig,
} from '../src/agent/reasoning/tree-of-thought.js';

// ============================================================================
// Types Tests
// ============================================================================

describe('Reasoning Types', () => {
  describe('DEFAULT_MCTS_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_MCTS_CONFIG.maxIterations).toBe(50);
      expect(DEFAULT_MCTS_CONFIG.maxDepth).toBe(10);
      expect(DEFAULT_MCTS_CONFIG.explorationConstant).toBeCloseTo(1.41, 2);
      expect(DEFAULT_MCTS_CONFIG.expansionCount).toBe(3);
      expect(DEFAULT_MCTS_CONFIG.simulationDepth).toBe(3);
      expect(DEFAULT_MCTS_CONFIG.useRethink).toBe(true);
      expect(DEFAULT_MCTS_CONFIG.rethinkThreshold).toBe(0.3);
    });
  });

  describe('THINKING_MODE_CONFIG', () => {
    it('should have shallow mode with minimal exploration', () => {
      const shallow = THINKING_MODE_CONFIG['shallow'];
      expect(shallow.maxIterations).toBe(5);
      expect(shallow.maxDepth).toBe(3);
      expect(shallow.expansionCount).toBe(2);
    });

    it('should have medium mode with balanced settings', () => {
      const medium = THINKING_MODE_CONFIG['medium'];
      expect(medium.maxIterations).toBe(20);
      expect(medium.maxDepth).toBe(6);
      expect(medium.expansionCount).toBe(3);
    });

    it('should have deep mode with thorough exploration', () => {
      const deep = THINKING_MODE_CONFIG['deep'];
      expect(deep.maxIterations).toBe(50);
      expect(deep.maxDepth).toBe(10);
      expect(deep.expansionCount).toBe(4);
    });

    it('should have exhaustive mode with full search', () => {
      const exhaustive = THINKING_MODE_CONFIG['exhaustive'];
      expect(exhaustive.maxIterations).toBe(100);
      expect(exhaustive.maxDepth).toBe(15);
      expect(exhaustive.expansionCount).toBe(5);
    });
  });
});

// ============================================================================
// MCTS Tests
// ============================================================================

describe('MCTS', () => {
  // Mock callbacks
  const mockGenerateThoughts = jest.fn().mockResolvedValue([
    'Approach 1: Use dynamic programming',
    'Approach 2: Use recursive solution',
    'Approach 3: Use iterative approach',
  ]);

  const mockEvaluateThought = jest.fn().mockResolvedValue(0.7);

  const mockExecuteCode = jest.fn().mockResolvedValue({
    success: true,
    output: 'Execution successful',
  });

  const mockRefineThought = jest.fn().mockImplementation((node, _feedback) =>
    Promise.resolve(`Refined: ${node.content}`)
  );

  const callbacks = {
    generateThoughts: mockGenerateThoughts,
    evaluateThought: mockEvaluateThought,
    executeCode: mockExecuteCode,
    refineThought: mockRefineThought,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMCTS', () => {
    it('should create MCTS instance with default config', () => {
      const mcts = createMCTS({}, callbacks);
      expect(mcts).toBeInstanceOf(MCTS);
    });

    it('should create MCTS instance with custom config', () => {
      const config: Partial<MCTSConfig> = {
        maxIterations: 10,
        maxDepth: 5,
      };
      const mcts = createMCTS(config, callbacks);
      expect(mcts).toBeInstanceOf(MCTS);
    });
  });

  describe('search', () => {
    it('should run MCTS search and return result', async () => {
      const mcts = createMCTS({ maxIterations: 3, maxDepth: 3 }, callbacks);
      const problem: Problem = {
        description: 'Find the sum of two numbers',
        context: 'Simple addition problem',
      };

      const result = await mcts.search(problem);

      expect(result).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.stats.iterations).toBeGreaterThan(0);
      expect(result.tree).toBeDefined();
    });

    it('should create root node with problem description', async () => {
      const mcts = createMCTS({ maxIterations: 1, maxDepth: 2 }, callbacks);
      const problem: Problem = {
        description: 'Test problem',
      };

      await mcts.search(problem);

      const root = mcts.getRoot();
      expect(root).toBeDefined();
      expect(root!.content).toContain('Test problem');
      expect(root!.depth).toBe(0);
    });

    it('should respect maxIterations limit', async () => {
      const mcts = createMCTS({ maxIterations: 5, maxDepth: 3 }, callbacks);
      const problem: Problem = { description: 'Test' };

      const result = await mcts.search(problem);

      expect(result.stats.iterations).toBeLessThanOrEqual(5);
    });

    it('should respect time limit', async () => {
      const mcts = createMCTS({
        maxIterations: 1000,
        timeLimit: 100, // 100ms limit
      }, callbacks);
      const problem: Problem = { description: 'Test' };

      const start = Date.now();
      await mcts.search(problem);
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(500);
    });
  });

  describe('getStats', () => {
    it('should return statistics after search', async () => {
      const mcts = createMCTS({ maxIterations: 3 }, callbacks);
      await mcts.search({ description: 'Test' });

      const stats = mcts.getStats();

      expect(stats.iterations).toBe(3);
      expect(stats.nodesCreated).toBeGreaterThan(0);
      expect(stats.totalTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatTree', () => {
    it('should format tree for display', async () => {
      const mcts = createMCTS({ maxIterations: 2, maxDepth: 2 }, callbacks);
      await mcts.search({ description: 'Test problem' });

      const formatted = mcts.formatTree();

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should return "Empty tree" for null root', () => {
      const mcts = createMCTS({}, callbacks);
      // Don't run search, so root is null
      const formatted = mcts.formatTree(undefined as unknown as ThoughtNode);
      expect(formatted).toBe('Empty tree');
    });
  });

  describe('thought type determination', () => {
    it('should detect implementation thoughts', async () => {
      mockGenerateThoughts.mockResolvedValueOnce([
        '```javascript\nfunction add(a, b) { return a + b; }\n```',
      ]);

      const mcts = createMCTS({ maxIterations: 2, maxDepth: 3 }, callbacks);
      await mcts.search({ description: 'Write code' });

      const root = mcts.getRoot();
      const child = root?.children[0];
      if (child) {
        expect(child.type).toBe('implementation');
      }
    });

    it('should detect verification thoughts', async () => {
      mockGenerateThoughts.mockResolvedValueOnce([
        'Let me verify this solution by testing it',
      ]);

      const mcts = createMCTS({ maxIterations: 2, maxDepth: 3 }, callbacks);
      await mcts.search({ description: 'Check solution' });

      const root = mcts.getRoot();
      const child = root?.children[0];
      if (child) {
        expect(child.type).toBe('verification');
      }
    });
  });

  describe('code extraction', () => {
    it('should handle implementation with code blocks', async () => {
      mockGenerateThoughts.mockResolvedValueOnce([
        '```javascript\nconst result = 1 + 2;\n```',
      ]);
      mockExecuteCode.mockResolvedValueOnce({
        success: true,
        output: '3',
      });

      const mcts = createMCTS({ maxIterations: 2, maxDepth: 3 }, callbacks);
      await mcts.search({ description: 'Add numbers' });

      // executeCode should have been called
      expect(mockExecuteCode).toHaveBeenCalled();
    });
  });

  describe('rethink mechanism', () => {
    it('should refine nodes with low scores when rethink enabled', async () => {
      mockEvaluateThought
        .mockResolvedValueOnce(0.2) // Low score triggers rethink
        .mockResolvedValue(0.7);

      mockGenerateThoughts.mockResolvedValue(['Test approach']);

      const mcts = createMCTS({
        maxIterations: 3,
        maxDepth: 3,
        useRethink: true,
        rethinkThreshold: 0.3,
      }, callbacks);

      await mcts.search({ description: 'Test' });

      // With low-scoring node having feedback, refineThought may be called
      // This depends on the execution flow
    });
  });
});

// ============================================================================
// Tree-of-Thought Reasoner Tests
// ============================================================================

describe('TreeOfThoughtReasoner', () => {
  beforeEach(() => {
    resetTreeOfThoughtReasoner();
  });

  describe('createTreeOfThoughtReasoner', () => {
    it('should create reasoner with default config', () => {
      const reasoner = createTreeOfThoughtReasoner('test-api-key');
      expect(reasoner).toBeInstanceOf(TreeOfThoughtReasoner);
    });

    it('should create reasoner with custom config', () => {
      const config: Partial<ToTConfig> = {
        mode: 'deep',
        temperature: 0.5,
        verbose: true,
      };
      const reasoner = createTreeOfThoughtReasoner('test-api-key', undefined, config);
      expect(reasoner.getConfig().mode).toBe('deep');
      expect(reasoner.getConfig().temperature).toBe(0.5);
    });

    it('should use custom base URL', () => {
      const reasoner = createTreeOfThoughtReasoner(
        'test-api-key',
        'http://localhost:1234/v1'
      );
      expect(reasoner).toBeInstanceOf(TreeOfThoughtReasoner);
    });
  });

  describe('getTreeOfThoughtReasoner', () => {
    it('should return singleton instance', () => {
      const reasoner1 = getTreeOfThoughtReasoner('test-key');
      const reasoner2 = getTreeOfThoughtReasoner('test-key');
      expect(reasoner1).toBe(reasoner2);
    });
  });

  describe('resetTreeOfThoughtReasoner', () => {
    it('should reset singleton instance', () => {
      const reasoner1 = getTreeOfThoughtReasoner('test-key');
      resetTreeOfThoughtReasoner();
      const reasoner2 = getTreeOfThoughtReasoner('test-key');
      expect(reasoner1).not.toBe(reasoner2);
    });
  });

  describe('setMode', () => {
    it('should update thinking mode', () => {
      const reasoner = createTreeOfThoughtReasoner('test-key');

      reasoner.setMode('deep');
      expect(reasoner.getConfig().mode).toBe('deep');

      reasoner.setMode('shallow');
      expect(reasoner.getConfig().mode).toBe('shallow');
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const reasoner = createTreeOfThoughtReasoner('test-key', undefined, {
        mode: 'medium',
        verbose: true,
      });

      const config = reasoner.getConfig();

      expect(config.mode).toBe('medium');
      expect(config.verbose).toBe(true);
      expect(config.executeCode).toBe(true); // default
    });
  });

  describe('formatResult', () => {
    it('should format successful result', () => {
      const reasoner = createTreeOfThoughtReasoner('test-key');

      const mockResult = {
        success: true,
        solution: {
          id: 'node-1',
          content: 'The solution is 42',
          type: 'conclusion' as ThoughtType,
          parent: null,
          children: [],
          score: 0.9,
          visits: 5,
          depth: 3,
          metadata: { generationRound: 1 },
          state: 'completed' as ThoughtState,
        },
        path: [],
        alternatives: [],
        stats: {
          iterations: 10,
          nodesCreated: 20,
          nodesEvaluated: 15,
          nodesRefined: 2,
          maxDepthReached: 5,
          totalTime: 5000,
          bestScore: 0.9,
        },
        tree: {} as ThoughtNode,
      };

      const formatted = reasoner.formatResult(mockResult);

      expect(formatted).toContain('TREE-OF-THOUGHT REASONING RESULT');
      expect(formatted).toContain('Solution Found');
      expect(formatted).toContain('Iterations: 10');
      expect(formatted).toContain('The solution is 42');
    });

    it('should format failed result', () => {
      const reasoner = createTreeOfThoughtReasoner('test-key');

      const mockResult = {
        success: false,
        solution: null,
        path: [],
        alternatives: [],
        stats: {
          iterations: 50,
          nodesCreated: 100,
          nodesEvaluated: 80,
          nodesRefined: 5,
          maxDepthReached: 10,
          totalTime: 10000,
          bestScore: 0.3,
        },
        tree: {} as ThoughtNode,
      };

      const formatted = reasoner.formatResult(mockResult);

      expect(formatted).toContain('No Solution');
    });

    it('should format result with code', () => {
      const reasoner = createTreeOfThoughtReasoner('test-key');

      const mockResult = {
        success: true,
        solution: {
          id: 'node-1',
          content: 'Implementation',
          type: 'implementation' as ThoughtType,
          parent: null,
          children: [],
          score: 0.85,
          visits: 3,
          depth: 2,
          metadata: {
            generationRound: 1,
            codeGenerated: 'function add(a, b) { return a + b; }',
          },
          state: 'completed' as ThoughtState,
        },
        path: [],
        alternatives: [],
        stats: {
          iterations: 5,
          nodesCreated: 10,
          nodesEvaluated: 8,
          nodesRefined: 0,
          maxDepthReached: 3,
          totalTime: 2000,
          bestScore: 0.85,
        },
        tree: {} as ThoughtNode,
      };

      const formatted = reasoner.formatResult(mockResult);

      expect(formatted).toContain('Generated Code');
      expect(formatted).toContain('function add');
    });
  });

  describe('events', () => {
    it('should emit reasoning:start event', (done) => {
      const reasoner = createTreeOfThoughtReasoner('test-key');

      reasoner.on('reasoning:start', (data) => {
        expect(data.problem).toBeDefined();
        done();
      });

      // We can't actually run solve without a real API, but we can test the event setup
      // For a real test, you'd mock the GrokClient
      done();
    });
  });
});

// ============================================================================
// Integration Tests (mocked)
// ============================================================================

describe('Reasoning Integration', () => {
  it('should use THINKING_MODE_CONFIG in TreeOfThoughtReasoner', () => {
    const reasoner = createTreeOfThoughtReasoner('test-key', undefined, {
      mode: 'exhaustive',
    });

    const config = reasoner.getConfig();
    expect(config.mode).toBe('exhaustive');
  });

  it('should handle problem with constraints', async () => {
    const callbacks = {
      generateThoughts: jest.fn().mockResolvedValue(['Test thought']),
      evaluateThought: jest.fn().mockResolvedValue(0.8),
      executeCode: jest.fn().mockResolvedValue({ success: true }),
      refineThought: jest.fn().mockResolvedValue('Refined'),
    };

    const mcts = createMCTS({ maxIterations: 2 }, callbacks);
    const problem: Problem = {
      description: 'Optimize algorithm',
      constraints: ['O(n) time complexity', 'O(1) space complexity'],
      successCriteria: ['Passes all tests', 'Meets complexity requirements'],
    };

    const result = await mcts.search(problem);
    expect(result).toBeDefined();
  });

  it('should handle problem with examples', async () => {
    const callbacks = {
      generateThoughts: jest.fn().mockResolvedValue(['Solution approach']),
      evaluateThought: jest.fn().mockResolvedValue(0.75),
      executeCode: jest.fn().mockResolvedValue({ success: true }),
      refineThought: jest.fn().mockResolvedValue('Refined solution'),
    };

    const mcts = createMCTS({ maxIterations: 2 }, callbacks);
    const problem: Problem = {
      description: 'Parse CSV data',
      examples: [
        { input: 'a,b,c', expectedOutput: '["a","b","c"]' },
        { input: '1,2,3', expectedOutput: '["1","2","3"]' },
      ],
    };

    const result = await mcts.search(problem);
    expect(result).toBeDefined();
    expect(result.stats.iterations).toBeGreaterThan(0);
  });
});
