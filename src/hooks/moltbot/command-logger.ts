/**
 * Command Logger
 *
 * Logs all AI actions for security auditing.
 * Supports log rotation, secret redaction, and buffered writes.
 */

import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";
import { logger } from "../../utils/logger.js";

import type { CommandLogConfig, CommandLogEntry } from "./types.js";
import { DEFAULT_MOLTBOT_CONFIG } from "./config.js";

/**
 * Logs all AI actions for security auditing
 */
export class CommandLogger extends EventEmitter {
  private config: CommandLogConfig;
  private sessionId: string | null = null;
  private currentLogFile: string | null = null;
  private writeBuffer: CommandLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private compiledSecretPatterns: RegExp[] = [];

  constructor(config?: Partial<CommandLogConfig>) {
    super();
    this.config = { ...DEFAULT_MOLTBOT_CONFIG.commandLog, ...config };
    this.ensureLogDirectory();
    this.compileSecretPatterns();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logPath)) {
      fs.mkdirSync(this.config.logPath, { recursive: true });
    }
  }

  /**
   * Compile secret redaction patterns
   */
  private compileSecretPatterns(): void {
    this.compiledSecretPatterns = this.config.secretPatterns.map(
      pattern => new RegExp(pattern, "gi")
    );
  }

  /**
   * Get current log file path
   */
  private getLogFilePath(): string {
    if (this.config.rotateDaily) {
      const date = new Date().toISOString().split("T")[0];
      return path.join(this.config.logPath, `commands-${date}.log`);
    }
    return path.join(this.config.logPath, "commands.log");
  }

  /**
   * Redact secrets from a string
   */
  private redactSecrets(text: string): string {
    if (!this.config.redactSecrets) {
      return text;
    }

    let redacted = text;
    for (const pattern of this.compiledSecretPatterns) {
      redacted = redacted.replace(pattern, (match, _group1, _group2) => {
        // Keep the key name, redact the value
        const parts = match.split(/[:=]/);
        if (parts.length > 1) {
          return parts[0] + "=[REDACTED]";
        }
        return "[REDACTED]";
      });
    }

    return redacted;
  }

  /**
   * Redact secrets from an object
   */
  private redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    const sensitiveKeys = ["password", "secret", "token", "apikey", "api_key", "auth", "credential", "key"];

    // Check if this object has a "name" or "key" field that suggests the "value" is sensitive
    const nameField = obj["name"] || obj["key"];
    const hasSensitiveName = typeof nameField === "string" &&
      sensitiveKeys.some(sk => nameField.toLowerCase().includes(sk));

    for (const [key, value] of Object.entries(obj)) {
      // Check if key suggests sensitive data
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        redacted[key] = "[REDACTED]";
        continue;
      }

      // If the name/key field suggests sensitive data, redact the "value" field
      if (hasSensitiveName && key === "value") {
        redacted[key] = "[REDACTED]";
        continue;
      }

      if (typeof value === "string") {
        redacted[key] = this.redactSecrets(value);
      } else if (typeof value === "object" && value !== null) {
        redacted[key] = this.redactObject(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Set session ID for logging
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Log a command/action
   */
  log(entry: Omit<CommandLogEntry, "timestamp" | "sessionId">): void {
    if (!this.config.enabled) {
      return;
    }

    const fullEntry: CommandLogEntry = {
      ...entry,
      timestamp: this.config.includeTimestamps ? new Date().toISOString() : "",
      sessionId: this.config.includeSessionId ? this.sessionId || undefined : undefined,
      details: this.config.redactSecrets
        ? this.redactObject(entry.details)
        : entry.details,
    };

    this.writeBuffer.push(fullEntry);
    this.emit("logged", fullEntry);

    // Schedule flush
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 1000);
    }
  }

  /**
   * Log a tool call
   */
  logToolCall(
    toolName: string,
    args: Record<string, unknown>,
    result: { success: boolean; output?: string; error?: string },
    duration?: number
  ): void {
    this.log({
      type: "tool_call",
      action: toolName,
      details: {
        arguments: args,
        output: this.config.logLevel === "verbose" ? result.output : undefined,
        error: result.error,
      },
      duration,
      success: result.success,
      error: result.error,
    });
  }

  /**
   * Log a bash command
   */
  logBashCommand(
    command: string,
    result: { success: boolean; output?: string; error?: string; exitCode?: number },
    duration?: number
  ): void {
    this.log({
      type: "bash",
      action: this.redactSecrets(command),
      details: {
        exitCode: result.exitCode,
        output:
          this.config.logLevel === "verbose"
            ? this.redactSecrets(result.output || "")
            : undefined,
        error: result.error ? this.redactSecrets(result.error) : undefined,
      },
      duration,
      success: result.success,
      error: result.error,
    });
  }

  /**
   * Log a file edit
   */
  logFileEdit(
    filePath: string,
    operation: "edit" | "create" | "delete",
    success: boolean,
    error?: string
  ): void {
    this.log({
      type: operation === "create" ? "file_create" : "file_edit",
      action: `${operation}: ${filePath}`,
      details: {
        path: filePath,
        operation,
      },
      success,
      error,
    });
  }

  /**
   * Log user input (minimal, for audit trail)
   */
  logUserInput(inputLength: number): void {
    if (this.config.logLevel === "minimal") {
      return;
    }

    this.log({
      type: "user_input",
      action: "user_message",
      details: {
        length: inputLength,
      },
      success: true,
    });
  }

  /**
   * Log assistant response (minimal, for audit trail)
   */
  logAssistantResponse(responseLength: number, toolCallCount: number): void {
    if (this.config.logLevel === "minimal") {
      return;
    }

    this.log({
      type: "assistant_response",
      action: "assistant_message",
      details: {
        length: responseLength,
        toolCalls: toolCallCount,
      },
      success: true,
    });
  }

  /**
   * Flush write buffer to disk
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.writeBuffer.length === 0) {
      return;
    }

    const logFile = this.getLogFilePath();
    const entries = this.writeBuffer.splice(0, this.writeBuffer.length);

    try {
      // Check if rotation is needed
      await this.checkRotation(logFile);

      // Write entries
      const lines = entries.map(e => JSON.stringify(e)).join("\n") + "\n";
      fs.appendFileSync(logFile, lines);

      this.currentLogFile = logFile;
    } catch (error) {
      logger.error(`Failed to write command log: ${error instanceof Error ? error : undefined}`);
      // Put entries back in buffer
      this.writeBuffer.unshift(...entries);
    }
  }

  /**
   * Check if log rotation is needed
   */
  private async checkRotation(logFile: string): Promise<void> {
    if (!fs.existsSync(logFile)) {
      return;
    }

    const stats = fs.statSync(logFile);

    if (stats.size > this.config.maxLogSize) {
      // Rotate log
      const rotatedPath = logFile.replace(".log", `-${Date.now()}.log`);
      fs.renameSync(logFile, rotatedPath);

      // Clean up old logs
      await this.cleanupOldLogs();
    }
  }

  /**
   * Clean up old log files
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.logPath)
        .filter(f => f.startsWith("commands-") && f.endsWith(".log"))
        .map(f => ({
          name: f,
          path: path.join(this.config.logPath, f),
          mtime: fs.statSync(path.join(this.config.logPath, f)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Delete oldest files beyond maxLogFiles
      const toDelete = files.slice(this.config.maxLogFiles);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get log statistics
   */
  getStats(): { totalEntries: number; logSize: number; oldestLog: Date | null } {
    let totalEntries = 0;
    let logSize = 0;
    let oldestLog: Date | null = null;

    try {
      const files = fs.readdirSync(this.config.logPath)
        .filter(f => f.startsWith("commands") && f.endsWith(".log"));

      for (const file of files) {
        const filePath = path.join(this.config.logPath, file);
        const stats = fs.statSync(filePath);
        logSize += stats.size;

        if (!oldestLog || stats.mtime < oldestLog) {
          oldestLog = stats.mtime;
        }

        // Count entries (approximate - one per line)
        const content = fs.readFileSync(filePath, "utf-8");
        totalEntries += content.split("\n").filter(l => l.trim()).length;
      }
    } catch {
      // Ignore errors
    }

    return { totalEntries, logSize, oldestLog };
  }

  /**
   * Get configuration
   */
  getConfig(): CommandLogConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CommandLogConfig>): void {
    this.config = { ...this.config, ...config };
    this.ensureLogDirectory();
    if (config.secretPatterns) {
      this.compileSecretPatterns();
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    // Synchronous flush on dispose
    if (this.writeBuffer.length > 0) {
      const logFile = this.getLogFilePath();
      const lines = this.writeBuffer.map(e => JSON.stringify(e)).join("\n") + "\n";
      try {
        fs.appendFileSync(logFile, lines);
      } catch {
        // Ignore errors on dispose
      }
    }
  }
}
