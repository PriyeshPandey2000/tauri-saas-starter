/** Analytics boundary. Calls must only happen after the user consents. */
export interface AnalyticsPort {
  /** Record a product event with optional properties. */
  track(event: string, properties?: Record<string, unknown>): Promise<void>;
  /** Attach a stable user id to later events. */
  identify(userId: string, traits?: Record<string, unknown>): Promise<void>;
}
