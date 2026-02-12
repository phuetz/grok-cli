/**
 * Apply Patch Tool (Codex-inspired)
 *
 * Parses and applies unified diffs to files. The model outputs diffs
 * instead of full files, which is more token-efficient and safer.
 *
 * Supports:
 *   - Standard unified diff format (--- a/file, +++ b/file, @@ hunks)
 *   - Multiple file patches in one input
 *   - New file creation (--- /dev/null)
 *   - File deletion (+++ /dev/null)
 *   - Dry-run mode for preview
 */

import fs from 'fs';
import path from 'path';
import { ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface PatchHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

export interface FilePatch {
  oldPath: string;
  newPath: string;
  hunks: PatchHunk[];
  isNew: boolean;
  isDelete: boolean;
}

export interface ApplyPatchOptions {
  /** Working directory for relative paths */
  cwd?: string;
  /** Dry run — don't write files, just validate */
  dryRun?: boolean;
  /** Number of context lines to tolerate mismatch (fuzz factor) */
  fuzz?: number;
}

export interface PatchResult {
  file: string;
  applied: boolean;
  error?: string;
  hunksApplied: number;
  hunksTotal: number;
}

// ============================================================================
// Parser
// ============================================================================

const DIFF_HEADER = /^diff --git a\/(.*) b\/(.*)$/;
const OLD_FILE = /^--- (?:a\/)?(.+)$/;
const NEW_FILE = /^\+\+\+ (?:b\/)?(.+)$/;
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/**
 * Parse a unified diff string into FilePatch objects.
 */
export function parsePatch(diffText: string): FilePatch[] {
  const patches: FilePatch[] = [];
  const lines = diffText.split('\n');
  let i = 0;

  while (i < lines.length) {
    // Skip until we find a file header
    if (!lines[i].startsWith('---') && !DIFF_HEADER.test(lines[i])) {
      i++;
      continue;
    }

    // Skip "diff --git" line if present
    if (DIFF_HEADER.test(lines[i])) {
      i++;
      // Skip index, mode lines
      while (i < lines.length && !lines[i].startsWith('---')) {
        i++;
      }
    }

    // Parse --- and +++ lines
    const oldMatch = OLD_FILE.exec(lines[i]);
    if (!oldMatch) { i++; continue; }
    i++;

    const newMatch = NEW_FILE.exec(lines[i]);
    if (!newMatch) { i++; continue; }
    i++;

    const oldPath = oldMatch[1];
    const newPath = newMatch[1];
    const isNew = oldPath === '/dev/null';
    const isDelete = newPath === '/dev/null';

    const hunks: PatchHunk[] = [];

    // Parse hunks
    while (i < lines.length && HUNK_HEADER.test(lines[i])) {
      const hunkMatch = HUNK_HEADER.exec(lines[i])!;
      const hunk: PatchHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldCount: parseInt(hunkMatch[2] ?? '1', 10),
        newStart: parseInt(hunkMatch[3], 10),
        newCount: parseInt(hunkMatch[4] ?? '1', 10),
        lines: [],
      };
      i++;

      // Collect hunk lines
      while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line === '') {
          // An empty line in a diff is a context line
          hunk.lines.push(line === '' ? ' ' : line);
          i++;
        } else if (line.startsWith('\\')) {
          // "\ No newline at end of file"
          i++;
        } else {
          break;
        }
      }

      hunks.push(hunk);
    }

    patches.push({ oldPath, newPath, hunks, isNew, isDelete });
  }

  return patches;
}

// ============================================================================
// Applier
// ============================================================================

/**
 * Apply a single hunk to file content lines.
 */
function applyHunk(
  contentLines: string[],
  hunk: PatchHunk,
  fuzz: number = 0,
): { lines: string[]; applied: boolean } {
  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const line of hunk.lines) {
    if (line.startsWith('-')) {
      oldLines.push(line.slice(1));
    } else if (line.startsWith('+')) {
      newLines.push(line.slice(1));
    } else {
      // Context line (starts with ' ')
      const ctx = line.startsWith(' ') ? line.slice(1) : line;
      oldLines.push(ctx);
      newLines.push(ctx);
    }
  }

  // Try to find the old lines in the content, starting from the expected position
  const startLine = hunk.oldStart - 1; // 0-indexed

  // Try exact position first, then fuzz offsets
  for (let offset = 0; offset <= fuzz; offset++) {
    for (const dir of [0, -1, 1]) {
      const tryStart = startLine + (offset * (dir || 1));
      if (tryStart < 0 || tryStart + oldLines.length > contentLines.length) continue;

      // Check if old lines match at this position
      let matches = true;
      for (let j = 0; j < oldLines.length; j++) {
        if (contentLines[tryStart + j] !== oldLines[j]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        // Apply: replace old lines with new lines
        const result = [
          ...contentLines.slice(0, tryStart),
          ...newLines,
          ...contentLines.slice(tryStart + oldLines.length),
        ];
        return { lines: result, applied: true };
      }
    }
  }

  return { lines: contentLines, applied: false };
}

/**
 * Apply a FilePatch to the filesystem.
 */
function applyFilePatch(
  patch: FilePatch,
  options: ApplyPatchOptions = {},
): PatchResult {
  const cwd = options.cwd || process.cwd();
  const fuzz = options.fuzz ?? 2;
  const filePath = path.resolve(cwd, patch.isNew ? patch.newPath : patch.oldPath);
  const result: PatchResult = {
    file: patch.isNew ? patch.newPath : patch.oldPath,
    applied: false,
    hunksApplied: 0,
    hunksTotal: patch.hunks.length,
  };

  try {
    // Handle deletion
    if (patch.isDelete) {
      if (!options.dryRun) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      result.applied = true;
      result.hunksApplied = patch.hunks.length;
      return result;
    }

    // Handle new file
    if (patch.isNew) {
      const newContent: string[] = [];
      for (const hunk of patch.hunks) {
        for (const line of hunk.lines) {
          if (line.startsWith('+')) {
            newContent.push(line.slice(1));
          }
        }
      }

      if (!options.dryRun) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const content = newContent.join('\n') + (newContent.length > 0 ? '\n' : '');
        fs.writeFileSync(filePath, content);
      }
      result.applied = true;
      result.hunksApplied = patch.hunks.length;
      return result;
    }

    // Regular modification
    if (!fs.existsSync(filePath)) {
      result.error = `File not found: ${filePath}`;
      return result;
    }

    let contentLines = fs.readFileSync(filePath, 'utf-8').split('\n');

    for (const hunk of patch.hunks) {
      const { lines, applied } = applyHunk(contentLines, hunk, fuzz);
      if (applied) {
        contentLines = lines;
        result.hunksApplied++;
      } else {
        logger.debug('Hunk failed to apply', {
          file: filePath,
          oldStart: hunk.oldStart,
          oldCount: hunk.oldCount,
        });
      }
    }

    result.applied = result.hunksApplied === result.hunksTotal;

    if (result.applied && !options.dryRun) {
      fs.writeFileSync(filePath, contentLines.join('\n'));
    }

    if (!result.applied && result.hunksApplied > 0) {
      result.error = `Partial apply: ${result.hunksApplied}/${result.hunksTotal} hunks — file NOT modified`;
    } else if (result.hunksApplied === 0) {
      result.error = 'No hunks could be applied (content mismatch)';
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

// ============================================================================
// Tool interface
// ============================================================================

/**
 * Apply a unified diff patch to one or more files.
 */
export async function applyPatch(
  diffText: string,
  options: ApplyPatchOptions = {},
): Promise<ToolResult> {
  try {
    const patches = parsePatch(diffText);

    if (patches.length === 0) {
      return { success: false, error: 'No valid patches found in input' };
    }

    const results: PatchResult[] = [];
    for (const patch of patches) {
      results.push(applyFilePatch(patch, options));
    }

    const allApplied = results.every(r => r.applied);
    const summary = results.map(r => {
      const status = r.applied ? 'OK' : 'FAILED';
      const hunks = `${r.hunksApplied}/${r.hunksTotal} hunks`;
      const err = r.error ? ` — ${r.error}` : '';
      return `  ${status}: ${r.file} (${hunks}${err})`;
    }).join('\n');

    const action = options.dryRun ? 'Dry run' : 'Applied';

    return {
      success: allApplied,
      output: `${action} ${patches.length} file(s):\n${summary}`,
      data: { results },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to apply patch: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Preview what a patch would do without applying it.
 */
export async function previewPatch(
  diffText: string,
  cwd?: string,
): Promise<ToolResult> {
  return applyPatch(diffText, { dryRun: true, cwd });
}
