/**
 * Export Command Handlers
 *
 * Handlers for exporting sessions, conversations, and tool results
 */

import { getExportManager, type ExportFormat } from '../../utils/export-manager.js';
import { getSessionRepository } from '../../database/repositories/session-repository.js';
import { CommandHandlerResult } from './branch-handlers.js';

/**
 * Handle /export command
 * Export current or specified session to file
 */
export async function handleExport(args: string[]): Promise<CommandHandlerResult> {
  const exportManager = getExportManager();
  const sessionRepo = getSessionRepository();

  // Parse arguments
  const format = (args.find(a => ['json', 'markdown', 'html', 'text'].includes(a)) as ExportFormat) || 'markdown';
  const sessionIdArg = args.find(a => a.startsWith('session:'))?.split(':')[1];
  const includeSecrets = args.includes('--include-secrets');
  const noToolCalls = args.includes('--no-tools');
  const noMetadata = args.includes('--no-metadata');

  // Get session to export
  let sessionId: string;
  if (sessionIdArg) {
    sessionId = sessionIdArg;
  } else {
    // Get most recent session
    const sessions = sessionRepo.findSessions({ limit: 1 });
    if (sessions.length === 0) {
      return {
        handled: true,
        entry: {
          type: 'assistant',
          content: 'No sessions found to export.',
          timestamp: new Date(),
        },
      };
    }
    sessionId = sessions[0].id;
  }

  // Export session
  const result = await exportManager.exportSession(sessionId, format, {
    redactSecrets: !includeSecrets,
    includeToolCalls: !noToolCalls,
    includeMetadata: !noMetadata,
  });

  if (result.success && result.filePath) {
    return {
      handled: true,
      entry: {
        type: 'assistant',
        content: `Session exported successfully!

**Format:** ${format}
**File:** ${result.filePath}

Use the following command to view the export:
\`\`\`bash
cat "${result.filePath}"
\`\`\``,
        timestamp: new Date(),
      },
    };
  } else {
    return {
      handled: true,
      entry: {
        type: 'assistant',
        content: `Failed to export session: ${result.error}`,
        timestamp: new Date(),
      },
    };
  }
}

/**
 * Handle /export-list command
 * List all exported files
 */
export async function handleExportList(): Promise<CommandHandlerResult> {
  const exportManager = getExportManager();
  const exports = await exportManager.listExports();

  if (exports.length === 0) {
    return {
      handled: true,
      entry: {
        type: 'assistant',
        content: 'No exported files found.',
        timestamp: new Date(),
      },
    };
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const lines: string[] = [];
  lines.push('Exported Files');
  lines.push('═'.repeat(60));
  lines.push('');

  for (const exp of exports.slice(0, 20)) {
    const date = exp.created.toLocaleDateString();
    const time = exp.created.toLocaleTimeString();
    const size = formatSize(exp.size);

    lines.push(`**${exp.filename}**`);
    lines.push(`  Created: ${date} ${time}`);
    lines.push(`  Size: ${size}`);
    lines.push(`  Path: \`${exp.path}\``);
    lines.push('');
  }

  if (exports.length > 20) {
    lines.push(`... and ${exports.length - 20} more`);
  }

  return {
    handled: true,
    entry: {
      type: 'assistant',
      content: lines.join('\n'),
      timestamp: new Date(),
    },
  };
}

/**
 * Handle /export-formats command
 * Show available export formats and options
 */
export function handleExportFormats(): CommandHandlerResult {
  const content = `
Export Formats & Options
═══════════════════════════════════════════════════════════════════

Available Formats:
  • json       - Structured JSON format (machine-readable)
  • markdown   - Markdown format (human-readable, default)
  • html       - Styled HTML format (shareable)
  • text       - Plain text format
  • csv        - Comma-separated values (for tables)

Export Commands:

  /export [format] [options]
      Export current or specified session

      Options:
        session:<id>         Export specific session
        --include-secrets    Don't redact sensitive data
        --no-tools          Exclude tool calls
        --no-metadata       Exclude metadata

  /export-list
      List all exported files

  /export-formats
      Show this help message

Examples:

  /export markdown
      Export current session as markdown

  /export json session:abc123
      Export specific session as JSON

  /export html --no-tools
      Export as HTML without tool calls

Export Directory:
  ~/.grok/exports/

All exports are saved with timestamps for easy organization.
  `.trim();

  return {
    handled: true,
    entry: {
      type: 'assistant',
      content,
      timestamp: new Date(),
    },
  };
}
