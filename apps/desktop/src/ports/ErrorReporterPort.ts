/** Extra, vendor-neutral data attached to a report. */
export interface ErrorReportContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/** Error-reporting boundary. Implemented by an adapter in later milestones. */
export interface ErrorReporterPort {
  /** Report a thrown value. */
  captureException(error: unknown, context?: ErrorReportContext): Promise<void>;
  /** Report a notable message without an exception. */
  captureMessage(message: string, context?: ErrorReportContext): Promise<void>;
}
