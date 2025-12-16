"use strict";
/**
 * Logger Utility
 * Centralized logging for the Code Buddy extension
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
exports.logger = exports.LogLevel = void 0;
const vscode = __importStar(require("vscode"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.logLevel = LogLevel.INFO;
        this.outputChannel = vscode.window.createOutputChannel('Code Buddy');
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    formatMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        const contextStr = context ? `[${context}]` : '';
        return `${timestamp} [${level}]${contextStr} ${message}`;
    }
    log(level, levelStr, message, context, error) {
        if (level < this.logLevel)
            return;
        const formattedMessage = this.formatMessage(levelStr, message, context);
        this.outputChannel.appendLine(formattedMessage);
        if (error) {
            this.outputChannel.appendLine(`  Stack: ${error.stack || 'No stack trace'}`);
        }
        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(formattedMessage);
                    break;
                case LogLevel.INFO:
                    console.info(formattedMessage);
                    break;
                case LogLevel.WARN:
                    console.warn(formattedMessage);
                    break;
                case LogLevel.ERROR:
                    console.error(formattedMessage, error);
                    break;
            }
        }
    }
    debug(message, context) {
        this.log(LogLevel.DEBUG, 'DEBUG', message, context);
    }
    info(message, context) {
        this.log(LogLevel.INFO, 'INFO', message, context);
    }
    warn(message, context) {
        this.log(LogLevel.WARN, 'WARN', message, context);
    }
    error(message, error, context) {
        this.log(LogLevel.ERROR, 'ERROR', message, context, error);
    }
    show() {
        this.outputChannel.show();
    }
    dispose() {
        this.outputChannel.dispose();
    }
}
// Singleton instance
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map