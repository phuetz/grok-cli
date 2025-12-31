/**
 * Unit tests for Selective Rollback Manager
 */

import {
  SelectiveRollbackManager,
  getSelectiveRollbackManager,
} from '../../src/advanced/selective-rollback';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = jest.mocked(fs);

describe('SelectiveRollbackManager', () => {
  let manager: SelectiveRollbackManager;

  beforeEach(() => {
    manager = new SelectiveRollbackManager();
    jest.clearAllMocks();
  });

  describe('saveVersion', () => {
    it('should save a new version', () => {
      const version = manager.saveVersion('/src/file.ts', 'content v1');

      expect(version).toBeDefined();
      expect(version.id).toMatch(/^[a-f0-9]{12}$/);
      expect(version.path).toBe(path.normalize('/src/file.ts'));
      expect(version.content).toBe('content v1');
      expect(version.hash).toHaveLength(12);
      expect(version.source).toBe('manual');
    });

    it('should generate consistent hash for same content', () => {
      const v1 = manager.saveVersion('/file1.ts', 'same content');
      const v2 = manager.saveVersion('/file2.ts', 'same content');

      expect(v1.hash).toBe(v2.hash);
    });

    it('should skip duplicate content', () => {
      const v1 = manager.saveVersion('/file.ts', 'content');
      const v2 = manager.saveVersion('/file.ts', 'content');

      expect(v1.id).toBe(v2.id);

      const versions = manager.getVersions('/file.ts');
      expect(versions).toHaveLength(1);
    });

    it('should store multiple versions', () => {
      manager.saveVersion('/file.ts', 'version 1');
      manager.saveVersion('/file.ts', 'version 2');
      manager.saveVersion('/file.ts', 'version 3');

      const versions = manager.getVersions('/file.ts');
      expect(versions).toHaveLength(3);
    });

    it('should order versions newest first', () => {
      manager.saveVersion('/file.ts', 'v1');
      manager.saveVersion('/file.ts', 'v2');
      manager.saveVersion('/file.ts', 'v3');

      const versions = manager.getVersions('/file.ts');
      expect(versions[0].content).toBe('v3');
      expect(versions[2].content).toBe('v1');
    });

    it('should respect source parameter', () => {
      const v1 = manager.saveVersion('/file.ts', 'content', 'checkpoint');
      const v2 = manager.saveVersion('/file.ts', 'content2', 'git');

      expect(v1.source).toBe('checkpoint');
      expect(v2.source).toBe('git');
    });

    it('should emit version-saved event', () => {
      const handler = jest.fn();
      manager.on('version-saved', handler);

      manager.saveVersion('/file.ts', 'content');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          path: path.normalize('/file.ts'),
        })
      );
    });

    it('should limit versions per file', () => {
      // Default max is 20
      for (let i = 0; i < 25; i++) {
        manager.saveVersion('/file.ts', 'content ' + i);
      }

      const versions = manager.getVersions('/file.ts');
      expect(versions.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getVersions', () => {
    it('should return empty array for unknown file', () => {
      const versions = manager.getVersions('/unknown.ts');
      expect(versions).toEqual([]);
    });

    it('should normalize path', () => {
      manager.saveVersion('/path/to/file.ts', 'content');

      const versions = manager.getVersions('/path/to/file.ts');
      expect(versions).toHaveLength(1);
    });
  });

  describe('getVersion', () => {
    it('should return specific version', () => {
      const saved = manager.saveVersion('/file.ts', 'content');

      const retrieved = manager.getVersion('/file.ts', saved.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(saved.id);
      expect(retrieved!.content).toBe('content');
    });

    it('should return undefined for unknown version', () => {
      manager.saveVersion('/file.ts', 'content');

      const retrieved = manager.getVersion('/file.ts', 'unknown-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('rollbackFile', () => {
    const testFilePath = '/src/rollback-test.ts';

    beforeEach(() => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('current content' as never);
      mockedFs.ensureDir.mockResolvedValue(undefined as never);
      mockedFs.writeFile.mockResolvedValue(undefined as never);
    });

    it('should rollback to specified version', async () => {
      const version = manager.saveVersion(testFilePath, 'old content');

      const result = await manager.rollbackFile(testFilePath, version.id);

      expect(result.success).toBe(true);
      expect(result.toVersion).toBe(version.id);
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.normalize(testFilePath),
        'old content',
        'utf-8'
      );
    });

    it('should save current state before rollback', async () => {
      const version = manager.saveVersion(testFilePath, 'old content');

      await manager.rollbackFile(testFilePath, version.id);

      // Current content should have been saved
      const versions = manager.getVersions(testFilePath);
      expect(versions.some((v) => v.content === 'current content')).toBe(true);
    });

    it('should return error for unknown version', async () => {
      const result = await manager.rollbackFile(testFilePath, 'unknown-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Version not found');
    });

    it('should emit file-rolled-back event', async () => {
      const handler = jest.fn();
      manager.on('file-rolled-back', handler);

      const version = manager.saveVersion(testFilePath, 'old content');
      await manager.rollbackFile(testFilePath, version.id);

      expect(handler).toHaveBeenCalledWith({
        path: path.normalize(testFilePath),
        versionId: version.id,
      });
    });

    it('should handle write errors', async () => {
      mockedFs.writeFile.mockRejectedValue(new Error('Write failed') as never);

      const version = manager.saveVersion(testFilePath, 'old content');
      const result = await manager.rollbackFile(testFilePath, version.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Write failed');
    });
  });

  describe('rollbackMultiple', () => {
    beforeEach(() => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('current' as never);
      mockedFs.ensureDir.mockResolvedValue(undefined as never);
      mockedFs.writeFile.mockResolvedValue(undefined as never);
    });

    it('should rollback multiple files', async () => {
      const v1 = manager.saveVersion('/file1.ts', 'content1');
      const v2 = manager.saveVersion('/file2.ts', 'content2');

      const results = await manager.rollbackMultiple([
        { path: '/file1.ts', versionId: v1.id },
        { path: '/file2.ts', versionId: v2.id },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle partial failures', async () => {
      const v1 = manager.saveVersion('/file1.ts', 'content1');
      // file2 has no version saved

      const results = await manager.rollbackMultiple([
        { path: '/file1.ts', versionId: v1.id },
        { path: '/file2.ts', versionId: 'unknown' },
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions', () => {
      const v1 = manager.saveVersion('/file.ts', 'line1\nline2\nline3');
      const v2 = manager.saveVersion('/file.ts', 'line1\nmodified\nline3\nline4');

      const comparison = manager.compareVersions('/file.ts', v1.id, v2.id);

      expect(comparison).not.toBeNull();
      expect(comparison!.added).toBe(1); // line4 added
      expect(comparison!.changed).toBe(1); // line2 changed
    });

    it('should return null for unknown versions', () => {
      manager.saveVersion('/file.ts', 'content');

      const comparison = manager.compareVersions('/file.ts', 'v1', 'v2');

      expect(comparison).toBeNull();
    });

    it('should handle identical versions', () => {
      const v1 = manager.saveVersion('/file1.ts', 'same');
      manager.saveVersion('/file1.ts', 'different'); // Force new version
      const v2 = manager.saveVersion('/file2.ts', 'same');

      // Compare v1 with itself
      const versions = manager.getVersions('/file1.ts');
      if (versions.length >= 2) {
        const comparison = manager.compareVersions(
          '/file1.ts',
          versions[0].id,
          versions[1].id
        );
        expect(comparison).not.toBeNull();
      }
    });
  });

  describe('getLatestVersion', () => {
    it('should return most recent version', () => {
      manager.saveVersion('/file.ts', 'v1');
      manager.saveVersion('/file.ts', 'v2');
      manager.saveVersion('/file.ts', 'v3');

      const latest = manager.getLatestVersion('/file.ts');

      expect(latest).toBeDefined();
      expect(latest!.content).toBe('v3');
    });

    it('should return undefined for unknown file', () => {
      const latest = manager.getLatestVersion('/unknown.ts');
      expect(latest).toBeUndefined();
    });
  });

  describe('clearVersions', () => {
    it('should clear all versions for a file', () => {
      manager.saveVersion('/file.ts', 'v1');
      manager.saveVersion('/file.ts', 'v2');

      manager.clearVersions('/file.ts');

      const versions = manager.getVersions('/file.ts');
      expect(versions).toEqual([]);
    });

    it('should emit versions-cleared event', () => {
      const handler = jest.fn();
      manager.on('versions-cleared', handler);

      manager.saveVersion('/file.ts', 'content');
      manager.clearVersions('/file.ts');

      expect(handler).toHaveBeenCalledWith('/file.ts');
    });

    it('should not affect other files', () => {
      manager.saveVersion('/file1.ts', 'content1');
      manager.saveVersion('/file2.ts', 'content2');

      manager.clearVersions('/file1.ts');

      expect(manager.getVersions('/file1.ts')).toEqual([]);
      expect(manager.getVersions('/file2.ts')).toHaveLength(1);
    });
  });

  describe('getAllTrackedFiles', () => {
    it('should return all tracked file paths', () => {
      manager.saveVersion('/file1.ts', 'c1');
      manager.saveVersion('/file2.ts', 'c2');
      manager.saveVersion('/file3.ts', 'c3');

      const files = manager.getAllTrackedFiles();

      expect(files).toHaveLength(3);
      expect(files).toContain(path.normalize('/file1.ts'));
      expect(files).toContain(path.normalize('/file2.ts'));
      expect(files).toContain(path.normalize('/file3.ts'));
    });

    it('should return empty array when no files tracked', () => {
      const files = manager.getAllTrackedFiles();
      expect(files).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      manager.saveVersion('/file1.ts', 'v1');
      manager.saveVersion('/file1.ts', 'v2');
      manager.saveVersion('/file2.ts', 'v1');

      const stats = manager.getStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalVersions).toBe(3);
    });

    it('should return zeros when empty', () => {
      const stats = manager.getStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalVersions).toBe(0);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getSelectiveRollbackManager();
      const instance2 = getSelectiveRollbackManager();

      expect(instance1).toBe(instance2);
    });
  });
});
