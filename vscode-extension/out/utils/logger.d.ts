/**
 * Logger Utility
 * Centralized logging for the Code Buddy extension
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
declare class Logger {
    private outputChannel;
    private logLevel;
    constructor();
    setLogLevel(level: LogLevel): void;
    private formatMessage;
    private log;
    debug(message: string, context?: string): void;
    info(message: string, context?: string): void;
    warn(message: string, context?: string): void;
    error(message: string, error?: Error, context?: string): void;
    show(): void;
    dispose(): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map