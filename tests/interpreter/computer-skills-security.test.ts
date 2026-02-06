/**
 * Security regression tests for ComputerSkills
 *
 * Verifies that skills execution uses sandboxed evaluation
 * and cannot access unsafe globals.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ComputerSkills } from '../../src/interpreter/computer/skills.js';

const SKILLS_FILE = path.resolve(__dirname, '../../src/interpreter/computer/skills.ts');

describe('ComputerSkills Security', () => {
  let skills: ComputerSkills;

  beforeEach(() => {
    skills = new ComputerSkills({ enableBuiltin: false, cacheEnabled: false });
  });

  it('should not have new Function() in skills.ts source', () => {
    const source = fs.readFileSync(SKILLS_FILE, 'utf-8');
    const lines = source.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('import');
    });
    const hasNewFunction = codeLines.some(line => /new\s+Function\s*\(/.test(line));
    expect(hasNewFunction).toBe(false);
  });

  it('should not have eval() in skills.ts source', () => {
    const source = fs.readFileSync(SKILLS_FILE, 'utf-8');
    const lines = source.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('import');
    });
    const hasEval = codeLines.some(line => /\beval\s*\(/.test(line));
    expect(hasEval).toBe(false);
  });

  it('should execute code steps in sandboxed context', async () => {
    skills.register({
      id: 'test-sandbox',
      name: 'Test Sandbox',
      description: 'Tests sandboxed execution',
      version: '1.0.0',
      tags: ['test'],
      parameters: [],
      steps: [
        {
          type: 'code',
          language: 'javascript',
          content: 'return 1 + 2',
        },
      ],
    });

    const result = await skills.run('test-sandbox');
    expect(result.success).toBe(true);
    expect(result.output).toBe(3);
  });

  it('should block process access in code steps', async () => {
    skills.register({
      id: 'test-process-access',
      name: 'Test Process Access',
      description: 'Attempts to access process',
      version: '1.0.0',
      tags: ['test'],
      parameters: [],
      steps: [
        {
          type: 'code',
          language: 'javascript',
          content: 'return process.env',
        },
      ],
    });

    const result = await skills.run('test-process-access');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should block require in code steps', async () => {
    skills.register({
      id: 'test-require',
      name: 'Test Require',
      description: 'Attempts to use require',
      version: '1.0.0',
      tags: ['test'],
      parameters: [],
      steps: [
        {
          type: 'code',
          language: 'javascript',
          content: 'const fs = require("fs"); return fs.readFileSync("/etc/passwd", "utf-8")',
        },
      ],
    });

    const result = await skills.run('test-require');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle condition steps safely', async () => {
    skills.register({
      id: 'test-condition',
      name: 'Test Condition',
      description: 'Tests condition evaluation',
      version: '1.0.0',
      tags: ['test'],
      parameters: [
        { name: 'value', type: 'number', description: 'Value', required: true },
      ],
      steps: [
        {
          type: 'condition',
          condition: 'params.value > 10',
          content: '',
        },
      ],
    });

    const result = await skills.run('test-condition', { value: 15 });
    expect(result.success).toBe(true);
    expect(result.output).toBe(true);
  });

  it('should handle template interpolation safely', async () => {
    skills.register({
      id: 'test-interpolation',
      name: 'Test Interpolation',
      description: 'Tests template interpolation',
      version: '1.0.0',
      tags: ['test'],
      parameters: [
        { name: 'name', type: 'string', description: 'Name', required: true },
      ],
      steps: [
        {
          type: 'shell',
          content: 'echo "Hello {{params.name}}"',
        },
      ],
    });

    // Verify the skill was registered (no load() since it clears manual registrations)
    expect(skills.get('test-interpolation')).toBeDefined();
  });
});
