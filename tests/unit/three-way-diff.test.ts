/**
 * Unit tests for Three-Way Diff
 */

import { ThreeWayDiff, getThreeWayDiff } from '../../src/advanced/three-way-diff';

describe('ThreeWayDiff', () => {
  let diff: ThreeWayDiff;

  beforeEach(() => {
    diff = new ThreeWayDiff();
  });

  describe('diff', () => {
    it('should detect no changes', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nline2\nline3';
      const theirs = 'line1\nline2\nline3';

      const result = diff.diff(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflictCount).toBe(0);
      expect(result.hunks).toHaveLength(0);
    });

    it('should detect changes only in ours', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nmodified\nline3';
      const theirs = 'line1\nline2\nline3';

      const result = diff.diff(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
      expect(result.hunks).toHaveLength(1);
      expect(result.hunks[0].status).toBe('auto-merged');
    });

    it('should detect changes only in theirs', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nline2\nline3';
      const theirs = 'line1\nmodified\nline3';

      const result = diff.diff(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
      expect(result.hunks).toHaveLength(1);
      expect(result.hunks[0].status).toBe('auto-merged');
    });

    it('should detect same changes in both', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nsame-change\nline3';
      const theirs = 'line1\nsame-change\nline3';

      const result = diff.diff(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
    });

    it('should detect conflicts', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nour-change\nline3';
      const theirs = 'line1\ntheir-change\nline3';

      const result = diff.diff(base, ours, theirs);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictCount).toBe(1);
      expect(result.hunks[0].status).toBe('conflict');
      expect(result.merged).toBeNull();
    });

    it('should handle multiple hunks', () => {
      const base = 'a\nb\nc\nd\ne';
      const ours = 'a\nX\nc\nY\ne';
      const theirs = 'a\nb\nc\nd\ne';

      const result = diff.diff(base, ours, theirs);

      expect(result.hunks.length).toBeGreaterThanOrEqual(1);
      expect(result.hasConflicts).toBe(false);
    });

    it('should handle added lines', () => {
      const base = 'line1\nline2';
      const ours = 'line1\nline2\nline3';
      const theirs = 'line1\nline2';

      const result = diff.diff(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
    });

    it('should handle removed lines', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nline3';
      const theirs = 'line1\nline2\nline3';

      const result = diff.diff(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
    });

    it('should auto-merge when possible', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nour-change\nline3';
      const theirs = 'line1\nline2\nline3';

      const result = diff.diff(base, ours, theirs);

      expect(result.merged).not.toBeNull();
      expect(result.merged).toContain('our-change');
    });
  });

  describe('resolveConflicts', () => {
    it('should resolve conflict with ours', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nour-change\nline3';
      const theirs = 'line1\ntheir-change\nline3';

      const diffResult = diff.diff(base, ours, theirs);

      const resolved = diff.resolveConflicts(diffResult, [
        { hunkIndex: 0, choice: 'ours' },
      ]);

      expect(resolved).toContain('our-change');
      expect(resolved).not.toContain('their-change');
    });

    it('should resolve conflict with theirs', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nour-change\nline3';
      const theirs = 'line1\ntheir-change\nline3';

      const diffResult = diff.diff(base, ours, theirs);

      const resolved = diff.resolveConflicts(diffResult, [
        { hunkIndex: 0, choice: 'theirs' },
      ]);

      expect(resolved).toContain('their-change');
      expect(resolved).not.toContain('our-change');
    });

    it('should resolve conflict with both', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nour-change\nline3';
      const theirs = 'line1\ntheir-change\nline3';

      const diffResult = diff.diff(base, ours, theirs);

      const resolved = diff.resolveConflicts(diffResult, [
        { hunkIndex: 0, choice: 'both' },
      ]);

      expect(resolved).toContain('our-change');
      expect(resolved).toContain('their-change');
    });

    it('should resolve conflict with custom content', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nour-change\nline3';
      const theirs = 'line1\ntheir-change\nline3';

      const diffResult = diff.diff(base, ours, theirs);

      const resolved = diff.resolveConflicts(diffResult, [
        {
          hunkIndex: 0,
          choice: 'custom',
          customContent: 'custom-resolution',
        },
      ]);

      expect(resolved).toContain('custom-resolution');
    });

    it('should keep unresolved conflicts with markers', () => {
      const base = 'line1\nline2\nline3';
      const ours = 'line1\nour-change\nline3';
      const theirs = 'line1\ntheir-change\nline3';

      const diffResult = diff.diff(base, ours, theirs);

      // No resolutions provided
      const resolved = diff.resolveConflicts(diffResult, []);

      expect(resolved).toContain('<<<<<<< OURS');
      expect(resolved).toContain('=======');
      expect(resolved).toContain('>>>>>>> THEIRS');
    });
  });

  describe('formatConflictMarkers', () => {
    it('should format conflict markers correctly', () => {
      const hunk = {
        startLine: 0,
        endLine: 0,
        base: ['original'],
        ours: ['our version'],
        theirs: ['their version'],
        status: 'conflict' as const,
      };

      const formatted = diff.formatConflictMarkers(hunk);

      expect(formatted).toBe(
        '<<<<<<< OURS\nour version\n=======\ntheir version\n>>>>>>> THEIRS'
      );
    });

    it('should handle multi-line conflicts', () => {
      const hunk = {
        startLine: 0,
        endLine: 2,
        base: ['a', 'b', 'c'],
        ours: ['x', 'y', 'z'],
        theirs: ['1', '2', '3'],
        status: 'conflict' as const,
      };

      const formatted = diff.formatConflictMarkers(hunk);

      expect(formatted).toContain('x\ny\nz');
      expect(formatted).toContain('1\n2\n3');
    });
  });

  describe('parseConflictMarkers', () => {
    it('should parse conflict markers', () => {
      const content = `line1
<<<<<<< OURS
our change
=======
their change
>>>>>>> THEIRS
line3`;

      const hunks = diff.parseConflictMarkers(content);

      expect(hunks).toHaveLength(1);
      expect(hunks[0].ours).toEqual(['our change']);
      expect(hunks[0].theirs).toEqual(['their change']);
      expect(hunks[0].status).toBe('conflict');
    });

    it('should parse multiple conflicts', () => {
      const content = `<<<<<<< OURS
a
=======
b
>>>>>>> THEIRS
middle
<<<<<<< OURS
c
=======
d
>>>>>>> THEIRS`;

      const hunks = diff.parseConflictMarkers(content);

      expect(hunks).toHaveLength(2);
    });

    it('should handle empty sections', () => {
      const content = `<<<<<<< OURS
=======
their content
>>>>>>> THEIRS`;

      const hunks = diff.parseConflictMarkers(content);

      expect(hunks).toHaveLength(1);
      expect(hunks[0].ours).toEqual([]);
      expect(hunks[0].theirs).toEqual(['their content']);
    });

    it('should return empty array for no conflicts', () => {
      const content = 'no conflicts here\njust normal content';

      const hunks = diff.parseConflictMarkers(content);

      expect(hunks).toEqual([]);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getThreeWayDiff();
      const instance2 = getThreeWayDiff();

      expect(instance1).toBe(instance2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const result = diff.diff('', '', '');

      expect(result.hasConflicts).toBe(false);
      expect(result.hunks).toHaveLength(0);
    });

    it('should handle single line', () => {
      const result = diff.diff('single', 'modified', 'single');

      expect(result.hasConflicts).toBe(false);
    });

    it('should handle unicode content', () => {
      const base = '日本語\n中文\n한국어';
      const ours = '日本語\nmodified\n한국어';
      const theirs = '日本語\n中文\n한국어';

      const result = diff.diff(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
      expect(result.merged).toContain('modified');
    });

    it('should handle whitespace differences', () => {
      const base = 'line with spaces';
      const ours = 'line  with  spaces';
      const theirs = 'line with spaces';

      const result = diff.diff(base, ours, theirs);

      expect(result.hunks.length).toBeGreaterThan(0);
    });
  });
});
