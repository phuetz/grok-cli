"use strict";
/**
 * Webview Security Utilities
 * Provides CSP and security helpers for webviews
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNonce = getNonce;
exports.getWebviewCSP = getWebviewCSP;
exports.createSecureWebviewHtml = createSecureWebviewHtml;
exports.escapeHtml = escapeHtml;
exports.sanitizeForWebview = sanitizeForWebview;
exports.getWebviewUri = getWebviewUri;
const vscode = __importStar(require("vscode"));
/**
 * Generate a cryptographically secure nonce
 */
function getNonce() {
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
function getWebviewCSP(webview, nonce, options) {
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
function createSecureWebviewHtml(options) {
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
function escapeHtml(text) {
    const map = {
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
function sanitizeForWebview(text) {
    return escapeHtml(text)
        .replace(/\n/g, '<br>')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}
/**
 * Create a URI for webview resources
 */
function getWebviewUri(webview, extensionUri, pathList) {
    return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}
//# sourceMappingURL=webview-security.js.map