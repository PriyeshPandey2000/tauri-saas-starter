import type { ErrorReporterPort } from "../../ErrorReporterPort";

/** Error reporter that drops reports. Global handlers still use the logger. */
export const noopErrorReporter: ErrorReporterPort = {
  captureException: () => Promise.resolve(),
  captureMessage: () => Promise.resolve(),
  addBreadcrumb: () => undefined,
  setUser: () => undefined,
  setConsent: () => undefined,
};
