import { safeEval, safeEvalAsync, safeEvalCondition, safeInterpolate } from '../../src/sandbox/safe-eval.js';

describe('SafeEvaluator', () => {
  describe('safeEval', () => {
    it('should evaluate simple expressions', () => {
      expect(safeEval('1 + 2')).toBe(3);
      expect(safeEval('"hello" + " " + "world"')).toBe('hello world');
      expect(safeEval('Math.max(1, 2, 3)')).toBe(3);
    });

    it('should evaluate expressions with context variables', () => {
      expect(safeEval('x + y', { context: { x: 10, y: 20 } })).toBe(30);
      expect(safeEval('name.toUpperCase()', { context: { name: 'alice' } })).toBe('ALICE');
    });

    it('should evaluate array and object operations', () => {
      expect(safeEval('[1, 2, 3].length')).toBe(3);
      expect(safeEval('items.filter(x => x > 2)', { context: { items: [1, 2, 3, 4] } }))
        .toEqual([3, 4]);
    });

    it('should block access to process', () => {
      expect(() => safeEval('process.exit(1)')).toThrow();
    });

    it('should block access to require', () => {
      expect(() => safeEval('require("fs")')).toThrow();
    });

    it('should block access to global scope', () => {
      expect(() => safeEval('globalThis.process')).not.toThrow();
      // process should be undefined in the sandbox
      expect(safeEval('typeof process')).toBe('undefined');
    });

    it('should timeout on infinite loops', () => {
      expect(() => safeEval('while(true){}', { timeout: 100 })).toThrow();
    });

    it('should provide safe built-ins', () => {
      expect(safeEval('JSON.stringify({a: 1})')).toBe('{"a":1}');
      expect(safeEval('Math.PI')).toBe(Math.PI);
      expect(safeEval('parseInt("42")')).toBe(42);
      expect(safeEval('isNaN(NaN)')).toBe(true);
    });

    it('should throw on syntax errors', () => {
      expect(() => safeEval('function {')).toThrow();
    });
  });

  describe('safeEvalAsync', () => {
    it('should evaluate async expressions', async () => {
      const result = await safeEvalAsync('return 42');
      expect(result).toBe(42);
    });

    it('should handle await in async context', async () => {
      const result = await safeEvalAsync(
        'const p = Promise.resolve(99); return await p;'
      );
      expect(result).toBe(99);
    });

    it('should have access to context variables', async () => {
      const result = await safeEvalAsync(
        'return params.a + params.b',
        { context: { params: { a: 5, b: 10 } } }
      );
      expect(result).toBe(15);
    });

    it('should block access to unsafe globals in async mode', async () => {
      await expect(safeEvalAsync('return require("fs")')).rejects.toThrow();
    });

    it('should timeout on long-running async code', async () => {
      await expect(
        safeEvalAsync('while(true) {} return 1', { timeout: 100 })
      ).rejects.toThrow();
    });
  });

  describe('safeEvalCondition', () => {
    it('should evaluate truthy conditions', () => {
      expect(safeEvalCondition('true')).toBe(true);
      expect(safeEvalCondition('1 === 1')).toBe(true);
      expect(safeEvalCondition('x > 5', { x: 10 })).toBe(true);
    });

    it('should evaluate falsy conditions', () => {
      expect(safeEvalCondition('false')).toBe(false);
      expect(safeEvalCondition('1 === 2')).toBe(false);
      expect(safeEvalCondition('x > 5', { x: 3 })).toBe(false);
    });

    it('should return false on error', () => {
      expect(safeEvalCondition('throw new Error("fail")')).toBe(false);
      expect(safeEvalCondition('undefined.property')).toBe(false);
    });

    it('should return false on syntax errors', () => {
      expect(safeEvalCondition('{{invalid}}')).toBe(false);
    });
  });

  describe('safeInterpolate', () => {
    it('should interpolate simple expressions', () => {
      expect(safeInterpolate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
    });

    it('should interpolate computed expressions', () => {
      expect(safeInterpolate('Result: {{x + y}}', { x: 10, y: 20 })).toBe('Result: 30');
    });

    it('should handle multiple expressions', () => {
      const result = safeInterpolate('{{a}} + {{b}} = {{a + b}}', { a: 3, b: 4 });
      expect(result).toBe('3 + 4 = 7');
    });

    it('should preserve failed expressions as-is', () => {
      expect(safeInterpolate('{{unknown.prop}}', {})).toBe('{{unknown.prop}}');
    });

    it('should handle templates with no expressions', () => {
      expect(safeInterpolate('no expressions here', {})).toBe('no expressions here');
    });

    it('should handle nested object access', () => {
      const ctx = { obj: { nested: { value: 'found' } } };
      expect(safeInterpolate('{{obj.nested.value}}', ctx)).toBe('found');
    });
  });
});
