/**
 * Modification Preview
 *
 * Preview changes before they are applied:
 * - Diff visualization
 * - Impact analysis
 * - Rollback information
 * - Interactive approval
 */

import * as path from 'path';

export type ModificationType = 'create' | 'modify' | 'delete' | 'rename' | 'move';

export interface FileModification {
  type: ModificationType;
  filePath: string;
  targetPath?: string; // For rename/move
  originalContent?: string;
  newContent?: string;
  description?: string;
}

export interface ModificationPreview {
  id: string;
  modifications: FileModification[];
  summary: {
    totalFiles: number;
    creates: number;
    modifies: number;
    deletes: number;
    renames: number;
    moves: number;
    linesAdded: number;
    linesRemoved: number;
  };
  risks: RiskAssessment[];
  createdAt: Date;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  file?: string;
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Create a modification preview
 */
export function createPreview(modifications: FileModification[]): ModificationPreview {
  const summary = {
    totalFiles: modifications.length,
    creates: 0,
    modifies: 0,
    deletes: 0,
    renames: 0,
    moves: 0,
    linesAdded: 0,
    linesRemoved: 0,
  };

  for (const mod of modifications) {
    switch (mod.type) {
      case 'create':
        summary.creates++;
        if (mod.newContent) {
          summary.linesAdded += countLines(mod.newContent);
        }
        break;
      case 'modify':
        summary.modifies++;
        if (mod.originalContent && mod.newContent) {
          const { added, removed } = countChangedLines(mod.originalContent, mod.newContent);
          summary.linesAdded += added;
          summary.linesRemoved += removed;
        }
        break;
      case 'delete':
        summary.deletes++;
        if (mod.originalContent) {
          summary.linesRemoved += countLines(mod.originalContent);
        }
        break;
      case 'rename':
        summary.renames++;
        break;
      case 'move':
        summary.moves++;
        break;
    }
  }

  const risks = assessRisks(modifications);

  return {
    id: `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    modifications,
    summary,
    risks,
    createdAt: new Date(),
  };
}

/**
 * Count lines in content
 */
function countLines(content: string): number {
  return content.split('\n').length;
}

/**
 * Count changed lines between original and new content
 */
function countChangedLines(original: string, updated: string): { added: number; removed: number } {
  const originalLines = new Set(original.split('\n'));
  const newLines = new Set(updated.split('\n'));

  let added = 0;
  let removed = 0;

  for (const line of newLines) {
    if (!originalLines.has(line)) added++;
  }
  for (const line of originalLines) {
    if (!newLines.has(line)) removed++;
  }

  return { added, removed };
}

/**
 * Assess risks of modifications
 */
function assessRisks(modifications: FileModification[]): RiskAssessment[] {
  const risks: RiskAssessment[] = [];

  for (const mod of modifications) {
    // Deleting files is risky
    if (mod.type === 'delete') {
      risks.push({
        level: 'medium',
        message: `File will be permanently deleted: ${path.basename(mod.filePath)}`,
        file: mod.filePath,
      });
    }

    // Modifying critical files
    const criticalPatterns = [
      /package\.json$/,
      /\.env$/,
      /config\./,
      /tsconfig\.json$/,
      /webpack\.config\./,
      /\.gitignore$/,
    ];

    if (criticalPatterns.some(p => p.test(mod.filePath))) {
      risks.push({
        level: 'high',
        message: `Modifying critical configuration file: ${path.basename(mod.filePath)}`,
        file: mod.filePath,
      });
    }

    // Large modifications
    if (mod.type === 'modify' && mod.originalContent && mod.newContent) {
      const originalLen = mod.originalContent.length;
      const newLen = mod.newContent.length;
      const changeRatio = Math.abs(newLen - originalLen) / Math.max(originalLen, 1);

      if (changeRatio > 0.5) {
        risks.push({
          level: 'medium',
          message: `Large change to file (${Math.round(changeRatio * 100)}% size change): ${path.basename(mod.filePath)}`,
          file: mod.filePath,
        });
      }
    }

    // Security-sensitive files
    const securityPatterns = [
      /\.pem$/,
      /\.key$/,
      /secret/i,
      /password/i,
      /credential/i,
      /\.env/,
    ];

    if (securityPatterns.some(p => p.test(mod.filePath))) {
      risks.push({
        level: 'critical',
        message: `Security-sensitive file affected: ${path.basename(mod.filePath)}`,
        file: mod.filePath,
      });
    }
  }

  // Sort by risk level
  const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  risks.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  return risks;
}

/**
 * Generate unified diff for a modification
 */
export function generateDiff(mod: FileModification): DiffLine[] {
  const lines: DiffLine[] = [];

  // Header
  if (mod.type === 'create') {
    lines.push({ type: 'header', content: `--- /dev/null` });
    lines.push({ type: 'header', content: `+++ ${mod.filePath}` });
  } else if (mod.type === 'delete') {
    lines.push({ type: 'header', content: `--- ${mod.filePath}` });
    lines.push({ type: 'header', content: `+++ /dev/null` });
  } else if (mod.type === 'rename' || mod.type === 'move') {
    lines.push({ type: 'header', content: `--- ${mod.filePath}` });
    lines.push({ type: 'header', content: `+++ ${mod.targetPath}` });
  } else {
    lines.push({ type: 'header', content: `--- ${mod.filePath}` });
    lines.push({ type: 'header', content: `+++ ${mod.filePath}` });
  }

  // Content diff
  if (mod.type === 'create' && mod.newContent) {
    const newLines = mod.newContent.split('\n');
    for (let i = 0; i < newLines.length; i++) {
      lines.push({
        type: 'addition',
        content: newLines[i],
        newLineNumber: i + 1,
      });
    }
  } else if (mod.type === 'delete' && mod.originalContent) {
    const oldLines = mod.originalContent.split('\n');
    for (let i = 0; i < oldLines.length; i++) {
      lines.push({
        type: 'deletion',
        content: oldLines[i],
        oldLineNumber: i + 1,
      });
    }
  } else if (mod.type === 'modify' && mod.originalContent && mod.newContent) {
    const diffLines = computeLineDiff(mod.originalContent, mod.newContent);
    lines.push(...diffLines);
  }

  return lines;
}

/**
 * Compute line-by-line diff
 */
function computeLineDiff(original: string, updated: string): DiffLine[] {
  const oldLines = original.split('\n');
  const newLines = updated.split('\n');
  const result: DiffLine[] = [];

  // Simple line-by-line comparison with context
  const _maxLen = Math.max(oldLines.length, newLines.length);
  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldIdx < oldLines.length ? oldLines[oldIdx] : undefined;
    const newLine = newIdx < newLines.length ? newLines[newIdx] : undefined;

    if (oldLine === newLine) {
      // Context line
      result.push({
        type: 'context',
        content: oldLine || '',
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
      });
      oldIdx++;
      newIdx++;
    } else if (oldLine !== undefined && !newLines.includes(oldLine)) {
      // Deleted line
      result.push({
        type: 'deletion',
        content: oldLine,
        oldLineNumber: oldIdx + 1,
      });
      oldIdx++;
    } else if (newLine !== undefined && !oldLines.includes(newLine)) {
      // Added line
      result.push({
        type: 'addition',
        content: newLine,
        newLineNumber: newIdx + 1,
      });
      newIdx++;
    } else {
      // Modified (one removed, one added)
      if (oldLine !== undefined) {
        result.push({
          type: 'deletion',
          content: oldLine,
          oldLineNumber: oldIdx + 1,
        });
        oldIdx++;
      }
      if (newLine !== undefined) {
        result.push({
          type: 'addition',
          content: newLine,
          newLineNumber: newIdx + 1,
        });
        newIdx++;
      }
    }
  }

  return result;
}

/**
 * Format diff for terminal display
 */
export function formatDiff(lines: DiffLine[]): string {
  const output: string[] = [];

  for (const line of lines) {
    switch (line.type) {
      case 'header':
        output.push(`\x1b[1m${line.content}\x1b[0m`);
        break;
      case 'addition':
        output.push(`\x1b[32m+ ${line.content}\x1b[0m`);
        break;
      case 'deletion':
        output.push(`\x1b[31m- ${line.content}\x1b[0m`);
        break;
      case 'context':
        output.push(`  ${line.content}`);
        break;
    }
  }

  return output.join('\n');
}

/**
 * Format modification preview for display
 */
export function formatPreview(preview: ModificationPreview): string {
  const lines: string[] = [
    '',
    '═══════════════════════════════════════════════════════════',
    '              MODIFICATION PREVIEW',
    '═══════════════════════════════════════════════════════════',
    '',
    'SUMMARY',
    '───────────────────────────────────────────────────────────',
    `  Total files:    ${preview.summary.totalFiles}`,
    `  Creates:        ${preview.summary.creates}`,
    `  Modifies:       ${preview.summary.modifies}`,
    `  Deletes:        ${preview.summary.deletes}`,
    `  Renames:        ${preview.summary.renames}`,
    `  Moves:          ${preview.summary.moves}`,
    '',
    `  Lines added:    +${preview.summary.linesAdded}`,
    `  Lines removed:  -${preview.summary.linesRemoved}`,
    '',
  ];

  // Risks
  if (preview.risks.length > 0) {
    lines.push('RISKS');
    lines.push('───────────────────────────────────────────────────────────');

    const levelIcons = {
      critical: '!!!',
      high: '!!',
      medium: '!',
      low: '-',
    };

    for (const risk of preview.risks) {
      lines.push(`  [${levelIcons[risk.level]}] ${risk.message}`);
    }
    lines.push('');
  }

  // File list
  lines.push('FILES');
  lines.push('───────────────────────────────────────────────────────────');

  const typeIcons = {
    create: '[+]',
    modify: '[~]',
    delete: '[-]',
    rename: '[R]',
    move: '[M]',
  };

  for (const mod of preview.modifications) {
    const icon = typeIcons[mod.type];
    let display = mod.filePath;

    if (mod.type === 'rename' || mod.type === 'move') {
      display = `${mod.filePath} → ${mod.targetPath}`;
    }

    lines.push(`  ${icon} ${display}`);

    if (mod.description) {
      lines.push(`      ${mod.description}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Format detailed preview with diffs
 */
export function formatDetailedPreview(preview: ModificationPreview): string {
  const lines: string[] = [formatPreview(preview)];

  lines.push('');
  lines.push('DETAILED CHANGES');
  lines.push('═══════════════════════════════════════════════════════════');

  for (const mod of preview.modifications) {
    lines.push('');
    lines.push(`File: ${mod.filePath}`);
    lines.push('───────────────────────────────────────────────────────────');

    const diffLines = generateDiff(mod);
    lines.push(formatDiff(diffLines));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Check if preview has critical risks
 */
export function hasCriticalRisks(preview: ModificationPreview): boolean {
  return preview.risks.some(r => r.level === 'critical');
}

/**
 * Check if preview has high risks
 */
export function hasHighRisks(preview: ModificationPreview): boolean {
  return preview.risks.some(r => r.level === 'critical' || r.level === 'high');
}

/**
 * Get files by modification type
 */
export function getFilesByType(
  preview: ModificationPreview,
  type: ModificationType
): FileModification[] {
  return preview.modifications.filter(m => m.type === type);
}

export default createPreview;
