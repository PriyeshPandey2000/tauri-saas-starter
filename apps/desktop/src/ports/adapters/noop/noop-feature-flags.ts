import { DEFAULT_FLAGS, type FlagKey } from "@app/shared";

import type { FeatureFlagPort } from "../../FeatureFlagPort";

/** Registry defaults only; no remote, no overrides. */
export const noopFeatureFlags: FeatureFlagPort = {
  init: () => Promise.resolve(),
  get: <K extends FlagKey>(key: K) => DEFAULT_FLAGS[key],
  getAll: () => ({ ...DEFAULT_FLAGS }),
  getSource: () => "default",
  refresh: () => Promise.resolve(),
  subscribe: () => () => undefined,
  reset: () => Promise.resolve(),
  setConsent: () => undefined,
  canOverride: () => false,
  setOverride: () => Promise.resolve(),
  clearOverride: () => Promise.resolve(),
  clearOverrides: () => Promise.resolve(),
};
