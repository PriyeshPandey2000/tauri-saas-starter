/** Extra, vendor-neutral data attached to a report. */
export interface ErrorReportContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/** Error-reporting boundary. Every call is consent-gated in the adapter. */
export interface ErrorReporterPort {
  captureException(error: unknown, context?: ErrorReportContext): Promise<void>;
  captureMessage(message: string, context?: ErrorReportContext): Promise<void>;
  addBreadcrumb(message: string, data?: Record<string, unknown>): void;
  /** Opaque auth user id, or `null` after sign-out. */
  setUser(userId: string | null): void;
  /** Grant/revoke sending immediately. */
  setConsent(granted: boolean): void;
}
