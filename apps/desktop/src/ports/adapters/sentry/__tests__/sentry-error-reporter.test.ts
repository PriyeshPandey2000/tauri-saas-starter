import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  close: vi.fn(async () => true),
}));

vi.mock("@sentry/react", () => sentry);

const { createSentryErrorReporter } = await import("../sentry-error-reporter");

function setup() {
  return createSentryErrorReporter({
    dsn: "https://key@o1.ingest.sentry.io/1",
    environment: "dev",
    release: "1.0.0",
    onWarning: () => undefined,
  });
}

describe("Sentry error reporter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not initialize or send before consent", async () => {
    const reporter = setup();
    await reporter.captureException(new Error("boom"));
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("initializes after consent with environment and release", async () => {
    const reporter = setup();
    reporter.setConsent(true);
    await reporter.captureException(new Error("boom"));
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "dev",
        release: "1.0.0",
        tracesSampleRate: 0,
      }),
    );
    expect(sentry.captureException).toHaveBeenCalled();
  });

  it("stops sending and clears the user on revoke", async () => {
    const reporter = setup();
    reporter.setConsent(true);
    await reporter.captureException(new Error("first"));
    reporter.setUser("user-a");
    expect(sentry.setUser).toHaveBeenCalledWith({ id: "user-a" });

    sentry.captureException.mockClear();
    reporter.setConsent(false);
    expect(sentry.setUser).toHaveBeenCalledWith(null);
    expect(sentry.close).toHaveBeenCalled();
    await reporter.captureException(new Error("after revoke"));
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("dedupes a render loop", async () => {
    const reporter = setup();
    reporter.setConsent(true);
    for (let index = 0; index < 10; index += 1) {
      await reporter.captureException(new Error("render loop"));
    }
    expect(sentry.captureException).toHaveBeenCalledTimes(3);
  });
});
