import {
  MiddlewarePipeline,
  ConversationMiddleware,
  MiddlewareContext,
  MiddlewareResult,
} from '../../../src/agent/middleware/index.js';

function makeContext(overrides: Partial<MiddlewareContext> = {}): MiddlewareContext {
  return {
    toolRound: 0,
    maxToolRounds: 50,
    sessionCost: 0,
    sessionCostLimit: 10,
    inputTokens: 100,
    outputTokens: 50,
    history: [],
    messages: [],
    isStreaming: true,
    ...overrides,
  };
}

describe('MiddlewarePipeline', () => {
  let pipeline: MiddlewarePipeline;

  beforeEach(() => {
    pipeline = new MiddlewarePipeline();
  });

  it('should return continue when no middlewares are registered', async () => {
    const result = await pipeline.runBeforeTurn(makeContext());
    expect(result.action).toBe('continue');
  });

  it('should execute middlewares in priority order', async () => {
    const order: string[] = [];

    const lowPriority: ConversationMiddleware = {
      name: 'low',
      priority: 200,
      beforeTurn: () => { order.push('low'); return { action: 'continue' }; },
    };

    const highPriority: ConversationMiddleware = {
      name: 'high',
      priority: 10,
      beforeTurn: () => { order.push('high'); return { action: 'continue' }; },
    };

    pipeline.use(lowPriority).use(highPriority);

    await pipeline.runBeforeTurn(makeContext());
    expect(order).toEqual(['high', 'low']);
  });

  it('should short-circuit on stop action', async () => {
    const order: string[] = [];

    pipeline.use({
      name: 'stopper',
      priority: 10,
      beforeTurn: () => { order.push('stopper'); return { action: 'stop', message: 'Stopped!' }; },
    });
    pipeline.use({
      name: 'after',
      priority: 20,
      beforeTurn: () => { order.push('after'); return { action: 'continue' }; },
    });

    const result = await pipeline.runBeforeTurn(makeContext());
    expect(result.action).toBe('stop');
    expect(result.message).toBe('Stopped!');
    expect(order).toEqual(['stopper']);
  });

  it('should short-circuit on compact action', async () => {
    pipeline.use({
      name: 'compactor',
      priority: 10,
      beforeTurn: () => ({ action: 'compact', message: 'Compacting' }),
    });

    const result = await pipeline.runBeforeTurn(makeContext());
    expect(result.action).toBe('compact');
  });

  it('should collect warnings and continue', async () => {
    pipeline.use({
      name: 'w1',
      priority: 10,
      beforeTurn: () => ({ action: 'warn', message: 'Warning 1' }),
    });
    pipeline.use({
      name: 'w2',
      priority: 20,
      beforeTurn: () => ({ action: 'warn', message: 'Warning 2' }),
    });

    const result = await pipeline.runBeforeTurn(makeContext());
    expect(result.action).toBe('warn');
    expect(result.message).toContain('Warning 1');
    expect(result.message).toContain('Warning 2');
  });

  it('should handle async middlewares', async () => {
    pipeline.use({
      name: 'async-mw',
      priority: 10,
      beforeTurn: async () => {
        await new Promise(r => setTimeout(r, 5));
        return { action: 'continue' };
      },
    });

    const result = await pipeline.runBeforeTurn(makeContext());
    expect(result.action).toBe('continue');
  });

  it('should survive middleware errors gracefully', async () => {
    pipeline.use({
      name: 'thrower',
      priority: 10,
      beforeTurn: () => { throw new Error('Boom'); },
    });
    pipeline.use({
      name: 'safe',
      priority: 20,
      beforeTurn: () => ({ action: 'continue' }),
    });

    const result = await pipeline.runBeforeTurn(makeContext());
    expect(result.action).toBe('continue');
  });

  it('should remove middlewares by name', () => {
    pipeline.use({ name: 'a', priority: 10 });
    pipeline.use({ name: 'b', priority: 20 });

    expect(pipeline.getMiddlewareNames()).toEqual(['a', 'b']);
    expect(pipeline.remove('a')).toBe(true);
    expect(pipeline.getMiddlewareNames()).toEqual(['b']);
    expect(pipeline.remove('nonexistent')).toBe(false);
  });

  it('should run afterTurn phase', async () => {
    const called: string[] = [];

    pipeline.use({
      name: 'after-mw',
      priority: 10,
      afterTurn: () => { called.push('after-mw'); return { action: 'continue' }; },
    });

    await pipeline.runAfterTurn(makeContext());
    expect(called).toEqual(['after-mw']);
  });

  it('should skip middlewares without the requested phase', async () => {
    pipeline.use({
      name: 'before-only',
      priority: 10,
      beforeTurn: () => ({ action: 'stop', message: 'stop' }),
    });

    // afterTurn should not be affected by a middleware that only has beforeTurn
    const result = await pipeline.runAfterTurn(makeContext());
    expect(result.action).toBe('continue');
  });
});
