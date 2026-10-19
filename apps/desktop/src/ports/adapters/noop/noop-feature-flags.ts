import type { FeatureFlagPort } from "../../FeatureFlagPort";

/** Every flag is off. */
export const noopFeatureFlags: FeatureFlagPort = {
  isEnabled(): Promise<boolean> {
    return Promise.resolve(false);
  },
  all(): Promise<Record<string, boolean>> {
    return Promise.resolve({});
  },
};
