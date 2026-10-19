import { isTauri } from "@tauri-apps/api/core";

import type { AnalyticsPort } from "./AnalyticsPort";
import type { AuthPort } from "./AuthPort";
import type { BillingPort } from "./BillingPort";
import type { ErrorReporterPort } from "./ErrorReporterPort";
import type { FeatureFlagPort } from "./FeatureFlagPort";
import type { LoggerPort } from "./LoggerPort";
import type { StoragePort } from "./StoragePort";
import { noopAnalytics } from "./adapters/noop/noop-analytics";
import { noopAuth } from "./adapters/noop/noop-auth";
import { noopBilling } from "./adapters/noop/noop-billing";
import { noopErrorReporter } from "./adapters/noop/noop-error-reporter";
import { noopFeatureFlags } from "./adapters/noop/noop-feature-flags";
import { createMemoryStorage } from "./adapters/noop/memory-storage";
import { consoleLogger } from "./adapters/console-logger";
import { fileLogger } from "./adapters/file-logger";

export type { AuthPort, AuthSession, AuthUser } from "./AuthPort";
export type { BillingPort, BillingPlanId, Entitlements } from "./BillingPort";
export type { FeatureFlagPort } from "./FeatureFlagPort";
export type { AnalyticsPort } from "./AnalyticsPort";
export type {
  ErrorReporterPort,
  ErrorReportContext,
} from "./ErrorReporterPort";
export type { StoragePort } from "./StoragePort";
export type { LogContext, LoggerPort } from "./LoggerPort";
export { PortsProvider, usePorts } from "./ports-context";

/** Everything the UI may reach; adapters stay behind these interfaces. */
export interface Ports {
  auth: AuthPort;
  billing: BillingPort;
  featureFlags: FeatureFlagPort;
  analytics: AnalyticsPort;
  errorReporter: ErrorReporterPort;
  storage: StoragePort;
  logger: LoggerPort;
}

/**
 * Composition root. Milestone 2 has no vendor adapters yet, so every port is
 * wired to its no-op/in-memory implementation.
 */
export function createPorts(): Ports {
  const logger = import.meta.env.DEV || !isTauri() ? consoleLogger : fileLogger;
  return {
    auth: noopAuth,
    billing: noopBilling,
    featureFlags: noopFeatureFlags,
    analytics: noopAnalytics,
    errorReporter: noopErrorReporter,
    storage: createMemoryStorage(),
    logger,
  };
}

export const ports: Ports = createPorts();
export const logger: LoggerPort = ports.logger;
