/**
 * Pipeline + Skills integration tests.
 */

import { PipelineCompositor, getPipelineCompositor, resetPipelineCompositor } from '../../src/workflows/pipeline.js';

describe('Pipeline-Skill Flow', () => {
  let compositor: PipelineCompositor;

  beforeEach(() => {
    resetPipelineCompositor();
    compositor = getPipelineCompositor();
  });

  afterEach(() => {
    resetPipelineCompositor();
  });

  it('should execute a multi-step pipeline in order', async () => {
    const order: string[] = [];

    compositor.setToolExecutor(async (name: string, _args: Record<string, unknown>, _input?: string) => {
      order.push(name);
      return { success: true, output: `result-${name}` };
    });

    const result = await compositor.execute([
      { name: 'read_file', type: 'tool', args: { path: '/test.txt' } },
      { name: 'search', type: 'tool', args: { query: 'test' } },
    ]);

    expect(result.success).toBe(true);
    expect(order).toEqual(['read_file', 'search']);
  });

  it('should validate pipeline definitions', () => {
    const valid = compositor.validateDefinition([
      { name: 'count', type: 'transform', args: {} },
    ]);
    expect(valid.valid).toBe(true);
    expect(valid.errors).toHaveLength(0);

    const invalid = compositor.validateDefinition([]);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('should execute transforms in sequence', async () => {
    const result = await compositor.execute([
      { name: 'count', type: 'transform', args: {}, rawArgs: 'hello world' },
    ]);
    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
  });

  it('should handle tool execution failure gracefully', async () => {
    compositor.setToolExecutor(async () => {
      return { success: false, output: '', error: 'tool failed' };
    });

    const result = await compositor.execute([
      { name: 'bad_tool', type: 'tool', args: {} },
    ]);

    expect(result.success).toBe(false);
  });

  it('should track execution duration', async () => {
    const result = await compositor.execute([
      { name: 'lowercase', type: 'transform', args: {}, rawArgs: 'HELLO' },
    ]);
    expect(result.totalDurationMs).toBeDefined();
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });
});
