/** Structured log context. Values are redacted before they leave the app. */
export type LogContext = Record<string, unknown>;

/**
 * Application logging boundary. Feature code depends on this interface, never on
 * a vendor SDK.
 */
export interface LoggerPort {
  /** Diagnostic detail, development only in practice. */
  debug(message: string, context?: LogContext): void;
  /** Normal lifecycle events. */
  info(message: string, context?: LogContext): void;
  /** Recoverable problems worth surfacing in logs. */
  warn(message: string, context?: LogContext): void;
  /** Failures that need attention. */
  error(message: string, context?: LogContext): void;
}
