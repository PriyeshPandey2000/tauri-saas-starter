import type { ErrorReporterPort } from "../../ErrorReporterPort";

/** Error reporter that drops reports. Global handlers still use the logger. */
export const noopErrorReporter: ErrorReporterPort = {
  captureException(): Promise<void> {
    return Promise.resolve();
  },
  captureMessage(): Promise<void> {
    return Promise.resolve();
  },
};
