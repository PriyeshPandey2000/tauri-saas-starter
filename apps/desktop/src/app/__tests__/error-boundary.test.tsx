import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/ports", () => ({
  ports: {
    errorReporter: { captureException },
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  },
}));

const { ErrorBoundary } = await import("../ErrorBoundary");

function Boom(): never {
  throw new Error("exploded");
}

describe("ErrorBoundary", () => {
  it("reports the component stack through the error port", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { source: "ErrorBoundary" },
        extra: expect.objectContaining({ componentStack: expect.any(String) }),
      }),
    );
    consoleError.mockRestore();
  });
});
