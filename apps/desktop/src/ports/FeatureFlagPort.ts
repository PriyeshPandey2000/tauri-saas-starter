/** Feature-flag boundary. Implemented by an adapter in later milestones. */
export interface FeatureFlagPort {
  /** Resolve one flag; unknown flags resolve to `false`. */
  isEnabled(flag: string): Promise<boolean>;
  /** Snapshot every known flag for the current user. */
  all(): Promise<Record<string, boolean>>;
}
