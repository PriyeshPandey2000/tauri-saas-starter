import { isTauri } from "@tauri-apps/api/core";

import type { AnalyticsPort } from "./AnalyticsPort";
import type { OpenerPort } from "./OpenerPort";
import type { AuthPort } from "./AuthPort";
import type { BillingPort } from "./BillingPort";
import type { ErrorReporterPort } from "./ErrorReporterPort";
import type { FeatureFlagPort } from "./FeatureFlagPort";
import type { LogContext, LoggerPort } from "./LoggerPort";
import type { StoragePort } from "./StoragePort";
import type { QueryCachePort } from "./QueryCachePort";
import {
  createDatabaseManager,
  type DatabaseManager,
} from "./adapters/sqlite/database-manager";
import { storeQueryCache } from "./adapters/query-cache/store-query-cache";
import { noopAnalytics } from "./adapters/noop/noop-analytics";
import { noopAuth } from "./adapters/noop/noop-auth";
import { noopBilling } from "./adapters/noop/noop-billing";
import { createBillingAdapter } from "./adapters/billing/billing-adapter";
import { noopErrorReporter } from "./adapters/noop/noop-error-reporter";
import { createPostHogAnalytics } from "./adapters/analytics/posthog-analytics";
import { tauriOpener } from "./adapters/opener/tauri-opener";
import { createSentryErrorReporter } from "./adapters/sentry/sentry-error-reporter";
import {
  createBetterAuthAdapter,
  setDefaultSecureStore,
} from "./adapters/better-auth/adapter";
import { noopFeatureFlags } from "./adapters/noop/noop-feature-flags";
import { createPluginFlagCache } from "./adapters/flags/flag-cache";
import {
  createLocalOverrideAdapter,
  createPluginFlagOverrideStore,
} from "./adapters/flags/local-override-adapter";
import { createPostHogFlagAdapter } from "@/ports/adapters/flags/posthog-flag-adapter";
import { createMemoryStorage } from "./adapters/noop/memory-storage";
import { consoleLogger } from "./adapters/console-logger";
import { fileLogger } from "./adapters/file-logger";
import { resolveLogTarget, getConfig } from "../shared/lib/config";
import {
  setAuthRefreshHandler,
  setAuthTokenProvider,
} from "../shared/lib/apiClient";
import {
  deleteSecureValue,
  getSecureValue,
  setSecureValue,
} from "../shared/lib/secureStorage";
import { AUTH_KEYS } from "./adapters/better-auth/adapter";

export type { AuthPort, AuthSession, AuthUser } from "./AuthPort";
export type { BillingPort } from "./BillingPort";
export type { FeatureFlagPort } from "./FeatureFlagPort";
export type { AnalyticsPort } from "./AnalyticsPort";
export type {
  ErrorReporterPort,
  ErrorReportContext,
} from "./ErrorReporterPort";
export type { StoragePort } from "./StoragePort";
export type { LogContext, LoggerPort } from "./LoggerPort";
export type { DatabasePort, ExecuteResult, SqlParam } from "./DatabasePort";
export type { QueryCachePort } from "./QueryCachePort";
export type { DatabaseManager } from "./adapters/sqlite/database-manager";
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
  database: DatabaseManager;
  queryCache: QueryCachePort;
  opener: OpenerPort;
}

/**
 * Composition root. Milestone 2 has no vendor adapters yet, so every port is
 * wired to its no-op/in-memory implementation.
 */
export function createPorts(): Ports {
  const target = resolveLogTarget(import.meta.env, import.meta.env.DEV);
  const logger = target === "file" && isTauri() ? fileLogger : consoleLogger;
  const auth = isTauri()
    ? createBetterAuthAdapter({ getApiUrl: () => getConfig().VITE_API_URL })
    : noopAuth;

  // Read the flag env directly: a bad config must still render the config
  // error screen instead of throwing during module evaluation.
  const rawEnv = import.meta.env as Record<string, unknown>;
  const flagsApiKey =
    typeof rawEnv.VITE_POSTHOG_KEY === "string" &&
    rawEnv.VITE_POSTHOG_KEY.length > 0
      ? rawEnv.VITE_POSTHOG_KEY
      : undefined;
  const flagsHost =
    typeof rawEnv.VITE_POSTHOG_HOST === "string"
      ? rawEnv.VITE_POSTHOG_HOST
      : undefined;
  const allowOverrides = rawEnv.VITE_APP_ENV !== "prod";
  if (!flagsApiKey) {
    logger.warn(
      "VITE_POSTHOG_KEY is not set; feature flags use registry defaults",
    );
  }
  const baseFeatureFlags = flagsApiKey
    ? createPostHogFlagAdapter({
        apiKey: flagsApiKey,
        host: flagsHost,
        cache: createPluginFlagCache(),
        requireConsent: rawEnv.VITE_FLAGS_REQUIRE_CONSENT !== "false",
        onWarning: (message, context) =>
          logger.warn(message, context as LogContext | undefined),
      })
    : noopFeatureFlags;
  const sentryDsn =
    typeof rawEnv.VITE_SENTRY_DSN === "string"
      ? rawEnv.VITE_SENTRY_DSN
      : undefined;
  const appVersion =
    typeof rawEnv.VITE_APP_VERSION === "string"
      ? rawEnv.VITE_APP_VERSION
      : "0.1.0";
  const errorReporter = sentryDsn
    ? createSentryErrorReporter({
        dsn: sentryDsn,
        environment:
          typeof rawEnv.VITE_APP_ENV === "string" ? rawEnv.VITE_APP_ENV : "dev",
        release: appVersion,
        onWarning: (message, context) =>
          logger.warn(message, context as LogContext | undefined),
      })
    : noopErrorReporter;
  const analytics = flagsApiKey
    ? createPostHogAnalytics({
        apiKey: flagsApiKey,
        host: flagsHost,
        onWarning: (message, context) =>
          logger.warn(message, context as LogContext | undefined),
      })
    : noopAnalytics;

  const featureFlags = createLocalOverrideAdapter(
    baseFeatureFlags,
    createPluginFlagOverrideStore(),
    {
      allowOverrides,
      onWarning: (message, context) =>
        logger.warn(message, context as LogContext | undefined),
    },
  );

  return {
    auth,
    billing: isTauri() ? createBillingAdapter() : noopBilling,
    featureFlags,
    analytics,
    errorReporter,
    storage: createMemoryStorage(),
    logger,
    database: createDatabaseManager(),
    queryCache: storeQueryCache,
    opener: tauriOpener,
  };
}

export const ports: Ports = createPorts();
export const logger: LoggerPort = ports.logger;

setDefaultSecureStore({
  get: getSecureValue,
  set: setSecureValue,
  remove: deleteSecureValue,
});
setAuthTokenProvider(() => getSecureValue(AUTH_KEYS.accessToken));
setAuthRefreshHandler(() => ports.auth.refresh());
