/**
 * Webview Security Utilities
 * Provides CSP and security helpers for webviews
 */
import * as vscode from 'vscode';
/**
 * Generate a cryptographically secure nonce
 */
export declare function getNonce(): string;
/**
 * Get the Content Security Policy for webviews
 */
export declare function getWebviewCSP(webview: vscode.Webview, nonce: string, options?: {
    allowImages?: boolean;
    allowFonts?: boolean;
    allowConnectSources?: string[];
}): string;
/**
 * Create secure webview HTML with proper CSP
 */
export declare function createSecureWebviewHtml(options: {
    webview: vscode.Webview;
    title: string;
    styles: string;
    body: string;
    scripts: string;
    extensionUri: vscode.Uri;
}): string;
/**
 * Escape HTML to prevent XSS
 */
export declare function escapeHtml(text: string): string;
/**
 * Sanitize user input before displaying in webview
 */
export declare function sanitizeForWebview(text: string): string;
/**
 * Create a URI for webview resources
 */
export declare function getWebviewUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]): vscode.Uri;
//# sourceMappingURL=webview-security.d.ts.map