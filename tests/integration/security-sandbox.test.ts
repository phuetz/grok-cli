/**
 * Security sandbox regression tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import { safeEval, safeEvalCondition } from '../../src/sandbox/safe-eval.js';

const SRC_ROOT = path.resolve(__dirname, '../../src');

describe('Security Sandbox', () => {
  describe('Safe expression evaluation', () => {
    it('should evaluate math expressions', () => {
      expect(safeEval('2 + 3')).toBe(5);
      expect(safeEval('Math.max(1, 5, 3)')).toBe(5);
    });

    it('should evaluate string operations', () => {
      expect(safeEval('"hello".toUpperCase()')).toBe('HELLO');
      expect(safeEval('"abc".length')).toBe(3);
    });

    it('should evaluate with context variables', () => {
      expect(safeEval('x + y', { context: { x: 10, y: 20 } })).toBe(30);
    });

    it('should evaluate boolean conditions', () => {
      expect(safeEvalCondition('x > 5', { x: 10 })).toBe(true);
      expect(safeEvalCondition('x > 5', { x: 3 })).toBe(false);
    });
  });

  describe('Block dangerous operations', () => {
    it('should block process access', () => {
      expect(() => safeEval('process.exit(1)')).toThrow();
    });

    it('should block require', () => {
      expect(() => safeEval('require("fs")')).toThrow();
    });

    it('should not expose globalThis.process', () => {
      const result = safeEval('typeof process');
      expect(result).toBe('undefined');
    });
  });

  describe('Timeout protection', () => {
    it('should timeout on infinite loops', () => {
      expect(() => safeEval('while(true){}', { timeout: 100 })).toThrow();
    });
  });

  describe('Source code static analysis', () => {
    const criticalFiles = [
      'interpreter/computer/skills.ts',
      'orchestration/orchestrator.ts',
    ];

    for (const file of criticalFiles) {
      it(`should not have new Function() in ${file}`, () => {
        const filePath = path.join(SRC_ROOT, file);
        if (!fs.existsSync(filePath)) return; // Skip if file doesn't exist
        const source = fs.readFileSync(filePath, 'utf-8');
        const codeLines = source.split('\n').filter(line => {
          const t = line.trim();
          return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('import');
        });
        const hasNewFunction = codeLines.some(l => /new\s+Function\s*\(/.test(l));
        expect(hasNewFunction).toBe(false);
      });

      it(`should not have eval() in ${file}`, () => {
        const filePath = path.join(SRC_ROOT, file);
        if (!fs.existsSync(filePath)) return;
        const source = fs.readFileSync(filePath, 'utf-8');
        const codeLines = source.split('\n').filter(line => {
          const t = line.trim();
          return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('import');
        });
        const hasEval = codeLines.some(l => /\beval\s*\(/.test(l));
        expect(hasEval).toBe(false);
      });
    }
  });
});
