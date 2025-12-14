/**
 * Markdown Export Template
 *
 * Customizable markdown template for session exports
 */

import type { ExportOptions } from '../../utils/export-manager.js';

interface SessionData {
  id: string;
  name: string;
  projectPath?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  messageCount: number;
  toolCallsCount: number;
  messages: MessageData[];
  metadata?: Record<string, unknown>;
}

interface MessageData {
  id?: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
  toolCalls?: Array<{ name?: string; function?: { name?: string; arguments?: string }; arguments?: string }>;
  toolCallId?: string;
  tokens?: number;
}

/**
 * Markdown template for session exports
 */
export function markdownTemplate(data: SessionData, options: ExportOptions): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${options.title || data.name}`);
  lines.push('');

  // Session metadata
  if (options.includeMetadata) {
    lines.push('## Session Information');
    lines.push('');
    lines.push(`- **Session ID**: \`${data.id}\``);
    lines.push(`- **Created**: ${new Date(data.createdAt).toLocaleString()}`);
    lines.push(`- **Updated**: ${new Date(data.updatedAt).toLocaleString()}`);

    if (data.projectPath) {
      lines.push(`- **Project**: ${data.projectPath}`);
    }

    if (data.model) {
      lines.push(`- **Model**: ${data.model}`);
    }

    lines.push('');
    lines.push('### Statistics');
    lines.push('');
    lines.push(`- **Messages**: ${data.messageCount}`);
    lines.push(`- **Tool Calls**: ${data.toolCallsCount}`);
    lines.push(`- **Tokens In**: ${data.totalTokensIn.toLocaleString()}`);
    lines.push(`- **Tokens Out**: ${data.totalTokensOut.toLocaleString()}`);
    lines.push(`- **Total Tokens**: ${(data.totalTokensIn + data.totalTokensOut).toLocaleString()}`);
    lines.push(`- **Total Cost**: $${data.totalCost.toFixed(4)}`);
    lines.push('');

    if (data.metadata && Object.keys(data.metadata).length > 0) {
      lines.push('### Additional Metadata');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(data.metadata, null, 2));
      lines.push('```');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Messages
  lines.push('## Conversation');
  lines.push('');

  for (const msg of data.messages) {
    const roleEmoji = {
      user: '👤',
      assistant: '🤖',
      system: '⚙️',
      tool: '🔧',
    }[msg.role];

    const roleName = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    const timestamp = options.includeTimestamps && msg.timestamp
      ? ` *(${new Date(msg.timestamp).toLocaleTimeString()})*`
      : '';

    lines.push(`### ${roleEmoji} ${roleName}${timestamp}`);
    lines.push('');

    // Content
    let content = msg.content;
    if (options.maxContentLength && options.maxContentLength > 0) {
      content = content.slice(0, options.maxContentLength);
      if (msg.content.length > options.maxContentLength) {
        content += '\n\n*[Content truncated]*';
      }
    }

    lines.push(content);
    lines.push('');

    // Tool calls
    if (options.includeToolCalls && msg.toolCalls && msg.toolCalls.length > 0) {
      lines.push('#### Tool Calls');
      lines.push('');
      for (const tc of msg.toolCalls) {
        const toolName = tc.name || tc.function?.name || 'unknown';
        lines.push(`- **${toolName}**`);

        try {
          const args = typeof tc.arguments === 'string'
            ? JSON.parse(tc.arguments)
            : tc.function?.arguments
            ? JSON.parse(tc.function.arguments)
            : tc.arguments;

          lines.push('  ```json');
          lines.push('  ' + JSON.stringify(args, null, 2).split('\n').join('\n  '));
          lines.push('  ```');
        } catch {
          lines.push('  *(Could not parse arguments)*');
        }
      }
      lines.push('');
    }

    // Token count
    if (options.includeMetadata && msg.tokens) {
      lines.push(`*${msg.tokens.toLocaleString()} tokens*`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Footer
  lines.push('');
  lines.push(`*Exported from Grok CLI on ${new Date().toLocaleString()}*`);

  return lines.join('\n');
}
