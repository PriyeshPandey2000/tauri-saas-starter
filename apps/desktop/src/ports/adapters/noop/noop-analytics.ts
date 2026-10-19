import type { AnalyticsPort } from "../../AnalyticsPort";

/** Analytics adapter that records nothing. */
export const noopAnalytics: AnalyticsPort = {
  track(): Promise<void> {
    return Promise.resolve();
  },
  identify(): Promise<void> {
    return Promise.resolve();
  },
};
