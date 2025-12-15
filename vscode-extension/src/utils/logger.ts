/**
 * Logger Utility
 * Centralized logging for the Code Buddy extension
 */

import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Code Buddy');
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} [${level}]${contextStr} ${message}`;
  }

  private log(level: LogLevel, levelStr: string, message: string, context?: string, error?: Error): void {
    if (level < this.logLevel) return;

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

  debug(message: string, context?: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: string): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: string): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  error(message: string, error?: Error, context?: string): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context, error);
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

// Singleton instance
export const logger = new Logger();
