/**
 * HTML Export Template
 *
 * Customizable HTML template for session exports with syntax highlighting
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
 * Escape HTML special characters
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format content with code blocks
 */
function formatContent(content: string, _syntaxHighlight: boolean): string {
  let html = escapeHTML(content);

  // Convert code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    const language = lang || 'text';
    return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
  });

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert line breaks to paragraphs
  const paragraphs = html.split('\n\n').filter(p => p.trim());
  return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

/**
 * HTML template for session exports
 */
export function htmlTemplate(data: SessionData, options: ExportOptions): string {
  const title = options.title || data.name || 'Session Export';

  const defaultCSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f8f9fa;
      color: #212529;
      line-height: 1.6;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    header .subtitle {
      opacity: 0.9;
      font-size: 1.1em;
    }
    .metadata {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .metadata h2 {
      color: #495057;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e9ecef;
    }
    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .metadata-item {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .metadata-item dt {
      font-size: 0.9em;
      color: #6c757d;
      margin-bottom: 5px;
    }
    .metadata-item dd {
      font-size: 1.2em;
      font-weight: 600;
      color: #495057;
    }
    .message {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border-left: 4px solid #dee2e6;
    }
    .message.user { border-left-color: #007bff; }
    .message.assistant { border-left-color: #28a745; }
    .message.system { border-left-color: #6c757d; }
    .message.tool { border-left-color: #ffc107; }
    .message-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e9ecef;
    }
    .message-role {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 1.1em;
    }
    .message-role .icon {
      font-size: 1.5em;
    }
    .message-timestamp {
      color: #6c757d;
      font-size: 0.9em;
    }
    .message-content {
      color: #495057;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .message-content p {
      margin-bottom: 15px;
    }
    .message-content p:last-child {
      margin-bottom: 0;
    }
    .message-content code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.9em;
      color: #d63384;
    }
    .message-content pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 15px 0;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.9em;
      line-height: 1.5;
    }
    .message-content pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    .tool-calls {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }
    .tool-calls h4 {
      color: #495057;
      margin-bottom: 15px;
      font-size: 1em;
    }
    .tool-call {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .tool-call-name {
      font-weight: 600;
      color: #495057;
      margin-bottom: 10px;
    }
    .token-count {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e9ecef;
      color: #6c757d;
      font-size: 0.9em;
      text-align: right;
    }
    footer {
      text-align: center;
      margin-top: 40px;
      padding: 20px;
      color: #6c757d;
      font-size: 0.9em;
    }
    @media print {
      body { background: white; }
      .message { page-break-inside: avoid; }
    }
  `;

  const css = options.customCss || defaultCSS;

  const messageHTML = data.messages.map(msg => {
    const roleIcons = {
      user: '👤',
      assistant: '🤖',
      system: '⚙️',
      tool: '🔧',
    };

    const roleNames = {
      user: 'User',
      assistant: 'Assistant',
      system: 'System',
      tool: 'Tool',
    };

    let content = msg.content;
    if (options.maxContentLength && options.maxContentLength > 0) {
      content = content.slice(0, options.maxContentLength);
      if (msg.content.length > options.maxContentLength) {
        content += '\n\n[Content truncated]';
      }
    }

    const formattedContent = formatContent(content, options.syntaxHighlight || false);

    let toolCallsHTML = '';
    if (options.includeToolCalls && msg.toolCalls && msg.toolCalls.length > 0) {
      const toolCallItems = msg.toolCalls.map(tc => {
        const toolName = tc.name || tc.function?.name || 'unknown';
        let argsHTML = '';

        try {
          const args = typeof tc.arguments === 'string'
            ? JSON.parse(tc.arguments)
            : tc.function?.arguments
            ? JSON.parse(tc.function.arguments)
            : tc.arguments;

          argsHTML = `<pre><code>${escapeHTML(JSON.stringify(args, null, 2))}</code></pre>`;
        } catch {
          argsHTML = '<em>Could not parse arguments</em>';
        }

        return `
          <div class="tool-call">
            <div class="tool-call-name">${escapeHTML(toolName)}</div>
            ${argsHTML}
          </div>
        `;
      }).join('');

      toolCallsHTML = `
        <div class="tool-calls">
          <h4>Tool Calls</h4>
          ${toolCallItems}
        </div>
      `;
    }

    let tokenHTML = '';
    if (options.includeMetadata && msg.tokens) {
      tokenHTML = `<div class="token-count">${msg.tokens.toLocaleString()} tokens</div>`;
    }

    return `
      <div class="message ${msg.role}">
        <div class="message-header">
          <div class="message-role">
            <span class="icon">${roleIcons[msg.role]}</span>
            <span>${roleNames[msg.role]}</span>
          </div>
          ${options.includeTimestamps && msg.timestamp ? `
            <div class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
          ` : ''}
        </div>
        <div class="message-content">
          ${formattedContent}
        </div>
        ${toolCallsHTML}
        ${tokenHTML}
      </div>
    `;
  }).join('');

  let metadataHTML = '';
  if (options.includeMetadata) {
    metadataHTML = `
      <section class="metadata">
        <h2>Session Information</h2>
        <div class="metadata-grid">
          <div class="metadata-item">
            <dt>Session ID</dt>
            <dd>${escapeHTML(data.id.slice(0, 8))}...</dd>
          </div>
          <div class="metadata-item">
            <dt>Model</dt>
            <dd>${escapeHTML(data.model || 'N/A')}</dd>
          </div>
          <div class="metadata-item">
            <dt>Messages</dt>
            <dd>${data.messageCount}</dd>
          </div>
          <div class="metadata-item">
            <dt>Tool Calls</dt>
            <dd>${data.toolCallsCount}</dd>
          </div>
          <div class="metadata-item">
            <dt>Total Tokens</dt>
            <dd>${(data.totalTokensIn + data.totalTokensOut).toLocaleString()}</dd>
          </div>
          <div class="metadata-item">
            <dt>Total Cost</dt>
            <dd>$${data.totalCost.toFixed(4)}</dd>
          </div>
          <div class="metadata-item">
            <dt>Created</dt>
            <dd>${new Date(data.createdAt).toLocaleDateString()}</dd>
          </div>
          ${data.projectPath ? `
            <div class="metadata-item">
              <dt>Project</dt>
              <dd>${escapeHTML(data.projectPath)}</dd>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Grok CLI">
  <title>${escapeHTML(title)}</title>
  <style>${css}</style>
</head>
<body>
  <header>
    <h1>${escapeHTML(title)}</h1>
    <div class="subtitle">Session exported from Grok CLI</div>
  </header>

  ${metadataHTML}

  <main>
    ${messageHTML}
  </main>

  <footer>
    <p>Exported on ${new Date().toLocaleString()}</p>
    <p>Generated by <strong>Grok CLI</strong></p>
  </footer>
</body>
</html>`;
}
