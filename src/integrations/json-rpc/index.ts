/**
 * JSON-RPC Integration Module
 *
 * Provides a standard JSON-RPC 2.0 interface for external applications
 * to interact with code-buddy.
 */

export * from './protocol.js';
export { JsonRpcServer, JsonRpcServerOptions, createJsonRpcServer } from './server.js';
