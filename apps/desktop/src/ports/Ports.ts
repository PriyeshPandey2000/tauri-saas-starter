/** Everything the UI may reach; adapters stay behind these interfaces. */
export type Ports = {
  auth: import("./AuthPort").AuthPort;
  billing: import("./BillingPort").BillingPort;
  featureFlags: import("./FeatureFlagPort").FeatureFlagPort;
  analytics: import("./AnalyticsPort").AnalyticsPort;
  errorReporter: import("./ErrorReporterPort").ErrorReporterPort;
  storage: import("./StoragePort").StoragePort;
  logger: import("./LoggerPort").LoggerPort;
  database: import("./DatabaseManagerPort").DatabaseManager;
  queryCache: import("./QueryCachePort").QueryCachePort;
  opener: import("./OpenerPort").OpenerPort;
};
