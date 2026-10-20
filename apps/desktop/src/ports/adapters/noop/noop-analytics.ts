import type { AnalyticsPort } from "../../AnalyticsPort";

/** Analytics adapter that records nothing. */
export const noopAnalytics: AnalyticsPort = {
  track: () => Promise.resolve(),
  page: () => Promise.resolve(),
  identify: () => Promise.resolve(),
  reset: () => Promise.resolve(),
  setConsent: () => undefined,
};
