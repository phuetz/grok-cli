/**
 * Webview Security Utilities
 * Provides CSP and security helpers for webviews
 */

import * as vscode from 'vscode';

/**
 * Generate a cryptographically secure nonce
 */
export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Get the Content Security Policy for webviews
 */
export function getWebviewCSP(
  webview: vscode.Webview,
  nonce: string,
  options?: {
    allowImages?: boolean;
    allowFonts?: boolean;
    allowConnectSources?: string[];
  }
): string {
  const cspSources = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
  ];

  if (options?.allowImages !== false) {
    cspSources.push(`img-src ${webview.cspSource} https: data:`);
  }

  if (options?.allowFonts !== false) {
    cspSources.push(`font-src ${webview.cspSource}`);
  }

  if (options?.allowConnectSources) {
    cspSources.push(`connect-src ${options.allowConnectSources.join(' ')}`);
  }

  return cspSources.join('; ');
}

/**
 * Create secure webview HTML with proper CSP
 */
export function createSecureWebviewHtml(options: {
  webview: vscode.Webview;
  title: string;
  styles: string;
  body: string;
  scripts: string;
  extensionUri: vscode.Uri;
}): string {
  const nonce = getNonce();
  const csp = getWebviewCSP(options.webview, nonce);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>${escapeHtml(options.title)}</title>
  <style>
    ${options.styles}
  </style>
</head>
<body>
  ${options.body}
  <script nonce="${nonce}">
    ${options.scripts}
  </script>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitize user input before displaying in webview
 */
export function sanitizeForWebview(text: string): string {
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

/**
 * Create a URI for webview resources
 */
export function getWebviewUri(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  pathList: string[]
): vscode.Uri {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}
