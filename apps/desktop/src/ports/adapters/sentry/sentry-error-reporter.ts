import type {
  ErrorReportContext,
  ErrorReporterPort,
} from "../../ErrorReporterPort";
import { scrubSentryEvent, scrubText } from "../../../shared/lib/scrub";

export interface SentryErrorReporterOptions {
  dsn: string;
  environment: string;
  release: string;
  onWarning?: (message: string, context?: unknown) => void;
}

type SentrySdk = typeof import("@sentry/react");

const DEDUPE_WINDOW_MS = 60_000;
const PER_ERROR_LIMIT = 3;
const GLOBAL_LIMIT = 20;

export function createSentryErrorReporter(
  options: SentryErrorReporterOptions,
): ErrorReporterPort {
  const warn =
    options.onWarning ??
    ((message: string, context?: unknown) => console.warn(message, context));
  let consent = false;
  let sdk: SentrySdk | null = null;
  let initPromise: Promise<void> | null = null;
  let userId: string | null = null;
  let globalWindow = 0;
  let globalCount = 0;
  const counts = new Map<string, { window: number; count: number }>();
  let warnedMissing = false;

  function withinLimits(key: string): boolean {
    const now = Date.now();
    if (now - globalWindow > DEDUPE_WINDOW_MS) {
      globalWindow = now;
      globalCount = 0;
    }
    if (globalCount >= GLOBAL_LIMIT) {
      return false;
    }
    const entry = counts.get(key);
    if (!entry || now - entry.window > DEDUPE_WINDOW_MS) {
      counts.set(key, { window: now, count: 1 });
      globalCount += 1;
      return true;
    }
    if (entry.count >= PER_ERROR_LIMIT) {
      return false;
    }
    entry.count += 1;
    globalCount += 1;
    return true;
  }

  async function init(): Promise<void> {
    if (sdk || !consent) {
      return;
    }
    if (!options.dsn) {
      if (!warnedMissing) {
        warnedMissing = true;
        warn("VITE_SENTRY_DSN is not set; error reporting is disabled");
      }
      return;
    }
    initPromise ??= (async () => {
      // Loaded only after consent so users who decline ship no Sentry code.
      const Sentry = await import("@sentry/react");
      if (!consent) {
        return;
      }
      Sentry.init({
        dsn: options.dsn,
        environment: options.environment,
        release: options.release,
        integrations: [],
        tracesSampleRate: 0,
        dataCollection: { userInfo: false },
        beforeSend(event) {
          return scrubSentryEvent(
            event as unknown as Record<string, unknown>,
          ) as unknown as typeof event;
        },
        beforeBreadcrumb(breadcrumb) {
          return {
            ...breadcrumb,
            message:
              typeof breadcrumb.message === "string"
                ? scrubText(breadcrumb.message)
                : breadcrumb.message,
            data: breadcrumb.data
              ? (scrubSentryEvent({ extra: breadcrumb.data }).extra as Record<
                  string,
                  unknown
                >)
              : breadcrumb.data,
          };
        },
      });
      sdk = Sentry;
      if (userId) {
        Sentry.setUser({ id: userId });
      }
    })().finally(() => {
      initPromise = null;
    });
    await initPromise;
  }

  return {
    async captureException(error, context?: ErrorReportContext) {
      if (!consent) {
        return;
      }
      await init();
      if (!sdk) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (!withinLimits(message)) {
        return;
      }
      sdk.captureException(error, {
        tags: context?.tags,
        extra: context?.extra,
      });
    },

    async captureMessage(message, context?: ErrorReportContext) {
      if (!consent) {
        return;
      }
      await init();
      if (!sdk || !withinLimits(message)) {
        return;
      }
      sdk.captureMessage(message, {
        level: "error",
        tags: context?.tags,
        extra: context?.extra,
      });
    },

    addBreadcrumb(message, data) {
      if (!consent || !sdk) {
        return;
      }
      sdk.addBreadcrumb({ message: scrubText(message), data });
    },

    setUser(nextUserId) {
      userId = nextUserId;
      if (sdk) {
        sdk.setUser(nextUserId ? { id: nextUserId } : null);
      }
    },

    setConsent(granted) {
      consent = granted;
      if (granted) {
        void init();
        return;
      }
      if (sdk) {
        const closing = sdk;
        sdk = null;
        closing.setUser(null);
        void closing.close();
      }
    },
  };
}
