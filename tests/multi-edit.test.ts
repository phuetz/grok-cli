import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { MultiEditTool, getMultiEditTool, EditOperation } from '../src/tools/multi-edit';

// Mock the confirmation service
jest.mock('../src/utils/confirmation-service', () => ({
  ConfirmationService: {
    getInstance: () => ({
      getSessionFlags: () => ({ fileOperations: true, allOperations: true }),
      requestConfirmation: jest.fn().mockResolvedValue({ confirmed: true }),
    }),
  },
}));

// Mock the checkpoint manager
jest.mock('../src/checkpoints/checkpoint-manager', () => ({
  getCheckpointManager: () => ({
    checkpointBeforeEdit: jest.fn(),
  }),
}));

describe('MultiEditTool', () => {
  let multiEdit: MultiEditTool;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'multi-edit-test-'));
    multiEdit = new MultiEditTool();
    multiEdit.setBaseDirectory(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('execute', () => {
    it('should return error for empty edits array', async () => {
      const result = await multiEdit.execute([]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No edits provided');
    });

    it('should return error for undefined edits', async () => {
      const result = await multiEdit.execute(undefined as unknown as EditOperation[]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No edits provided');
    });

    it('should successfully edit a single file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      const result = await multiEdit.execute([
        {
          file_path: filePath,
          old_str: 'World',
          new_str: 'Universe',
        },
      ]);

      expect(result.success).toBe(true);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Hello Universe');
    });

    it('should edit multiple files', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'AAA');
      await fs.writeFile(file2, 'BBB');

      const result = await multiEdit.execute([
        { file_path: file1, old_str: 'AAA', new_str: '111' },
        { file_path: file2, old_str: 'BBB', new_str: '222' },
      ]);

      expect(result.success).toBe(true);
      expect(await fs.readFile(file1, 'utf-8')).toBe('111');
      expect(await fs.readFile(file2, 'utf-8')).toBe('222');
    });

    it('should replace all occurrences when replace_all is true', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'foo bar foo baz foo');

      const result = await multiEdit.execute([
        {
          file_path: filePath,
          old_str: 'foo',
          new_str: 'XXX',
          replace_all: true,
        },
      ]);

      expect(result.success).toBe(true);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('XXX bar XXX baz XXX');
    });

    it('should replace only first occurrence when replace_all is false', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'foo bar foo baz foo');

      const result = await multiEdit.execute([
        {
          file_path: filePath,
          old_str: 'foo',
          new_str: 'XXX',
          replace_all: false,
        },
      ]);

      expect(result.success).toBe(true);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('XXX bar foo baz foo');
    });

    it('should return error for non-existent file', async () => {
      const result = await multiEdit.execute([
        {
          file_path: path.join(tempDir, 'nonexistent.txt'),
          old_str: 'old',
          new_str: 'new',
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error for string not found in file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello World');

      const result = await multiEdit.execute([
        {
          file_path: filePath,
          old_str: 'NotFound',
          new_str: 'New',
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.output).toContain('failed');
    });

    it('should reject paths outside base directory', async () => {
      const result = await multiEdit.execute([
        {
          file_path: '/etc/passwd',
          old_str: 'old',
          new_str: 'new',
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should reject path traversal attempts', async () => {
      const traversalPath = path.join(tempDir, '..', '..', 'etc', 'passwd');
      const result = await multiEdit.execute([
        {
          file_path: traversalPath,
          old_str: 'old',
          new_str: 'new',
        },
      ]);

      expect(result.success).toBe(false);
    });

    it('should include summary in output', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Hello');

      const result = await multiEdit.execute([
        { file_path: filePath, old_str: 'Hello', new_str: 'Hi' },
      ]);

      expect(result.output).toContain('Multi-Edit Results');
      expect(result.output).toContain('successful');
    });

    it('should handle string not found errors in summary', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');

      const result = await multiEdit.execute([
        { file_path: file1, old_str: 'content1', new_str: 'new1' },
        { file_path: file2, old_str: 'NOTFOUND', new_str: 'y' },
      ]);

      expect(result.success).toBe(false);
      expect(result.output).toContain('1 successful');
      expect(result.output).toContain('1 failed');
    });
  });

  describe('executeParallel', () => {
    it('should execute edits on different files in parallel', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'AAA');
      await fs.writeFile(file2, 'BBB');

      const result = await multiEdit.executeParallel([
        { file_path: file1, old_str: 'AAA', new_str: '111' },
        { file_path: file2, old_str: 'BBB', new_str: '222' },
      ]);

      expect(result.success).toBe(true);
      expect(await fs.readFile(file1, 'utf-8')).toBe('111');
      expect(await fs.readFile(file2, 'utf-8')).toBe('222');
    });

    it('should execute edits on same file sequentially', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'ABC');

      const result = await multiEdit.executeParallel([
        { file_path: filePath, old_str: 'A', new_str: 'X' },
        { file_path: filePath, old_str: 'X', new_str: 'Y' },
      ]);

      expect(result.success).toBe(true);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('YBC');
    });

    it('should return error for empty edits', async () => {
      const result = await multiEdit.executeParallel([]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No edits provided');
    });

    it('should stop processing same file on first error', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'ABC');

      const result = await multiEdit.executeParallel([
        { file_path: filePath, old_str: 'NOTFOUND', new_str: 'X' },
        { file_path: filePath, old_str: 'A', new_str: 'Y' },
      ]);

      expect(result.success).toBe(false);
      // Second edit should not have been attempted
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('ABC');
    });
  });

  describe('setBaseDirectory', () => {
    it('should update the base directory', () => {
      const newDir = '/new/base/dir';
      multiEdit.setBaseDirectory(newDir);
      // No error means success - we can't directly access private pathValidator
    });
  });

  describe('getMultiEditTool', () => {
    it('should return singleton instance', () => {
      const instance1 = getMultiEditTool();
      const instance2 = getMultiEditTool();
      expect(instance1).toBe(instance2);
    });

    it('should return MultiEditTool instance', () => {
      const instance = getMultiEditTool();
      expect(instance).toBeInstanceOf(MultiEditTool);
    });
  });
});
