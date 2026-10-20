import type { AnalyticsEvent, AnalyticsProperties } from "@app/shared";

/** Analytics boundary. Every call is consent-gated in the adapter. */
export interface AnalyticsPort {
  track<E extends AnalyticsEvent>(
    event: E,
    properties: AnalyticsProperties<E>,
  ): Promise<void>;
  page(path: string): Promise<void>;
  identify(userId: string): Promise<void>;
  reset(): Promise<void>;
  setConsent(granted: boolean): void;
}
