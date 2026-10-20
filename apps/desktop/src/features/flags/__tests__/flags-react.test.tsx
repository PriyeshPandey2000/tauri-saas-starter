import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isFlagKey, type FlagKey } from "@app/shared";

vi.mock("@/ports", () => {
  const values = new Map<string, unknown>([
    ["newDashboard", false],
    ["betaExport", true],
    ["checkoutVariant", "a"],
    ["killSwitchSync", false],
  ]);
  const listeners = new Set<() => void>();
  return {
    ports: {
      analytics: { track: async () => undefined },
      featureFlags: {
        get: (key: string) => values.get(key),
        getAll: () => Object.fromEntries(values),
        getSource: () => "remote",
        subscribe: (callback: () => void) => {
          listeners.add(callback);
          return () => listeners.delete(callback);
        },
        __set: (key: string, value: unknown) => {
          values.set(key, value);
          for (const listener of listeners) {
            listener();
          }
        },
      },
    },
  };
});

const { ports } = await import("@/ports");
const { useFlag } = await import("../hooks");
const { Flag, FlagVariant } = await import("../components/flag");

function setFlag(key: string, value: unknown): void {
  (
    ports.featureFlags as unknown as {
      __set: (key: string, value: unknown) => void;
    }
  ).__set(key, value);
}

beforeEach(() => {
  act(() => {
    setFlag("newDashboard", false);
    setFlag("betaExport", true);
    setFlag("checkoutVariant", "a");
    setFlag("killSwitchSync", false);
  });
});

describe("useFlag", () => {
  it("re-renders only subscribers of the flag that changed", () => {
    let dashboardRenders = 0;
    let exportRenders = 0;

    function Dashboard() {
      dashboardRenders += 1;
      return <span>dashboard:{String(useFlag("newDashboard"))}</span>;
    }
    function Export() {
      exportRenders += 1;
      return <span>export:{String(useFlag("betaExport"))}</span>;
    }

    render(
      <>
        <Dashboard />
        <Export />
      </>,
    );
    const dashboardBefore = dashboardRenders;
    const exportBefore = exportRenders;

    act(() => setFlag("betaExport", false));

    expect(exportRenders).toBeGreaterThan(exportBefore);
    expect(dashboardRenders).toBe(dashboardBefore);
  });
});

describe("flag components", () => {
  it("renders boolean children and the fallback", () => {
    render(
      <>
        <Flag name="betaExport">
          <span>beta-on</span>
        </Flag>
        <Flag name="newDashboard" fallback={<span>dashboard-off</span>}>
          <span>dashboard-on</span>
        </Flag>
      </>,
    );
    expect(screen.getByText("beta-on")).toBeTruthy();
    expect(screen.getByText("dashboard-off")).toBeTruthy();
  });

  it("renders the matching variant", () => {
    const { rerender } = render(
      <FlagVariant
        name="checkoutVariant"
        cases={{ a: <span>variant-a</span>, b: <span>variant-b</span> }}
      />,
    );
    expect(screen.getByText("variant-a")).toBeTruthy();

    act(() => setFlag("checkoutVariant", "b"));
    rerender(
      <FlagVariant
        name="checkoutVariant"
        cases={{ a: <span>variant-a</span>, b: <span>variant-b</span> }}
      />,
    );
    expect(screen.getByText("variant-b")).toBeTruthy();
  });
});

describe("registry coverage", () => {
  it("every useFlag literal exists in the registry", () => {
    const files = import.meta.glob("../../../**/*.{ts,tsx}", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const pattern = /useFlag\(\s*["']([^"']+)["']/g;
    const unknown: string[] = [];

    for (const [path, source] of Object.entries(files)) {
      for (const match of source.matchAll(pattern)) {
        const key = match[1];
        if (key && !isFlagKey(key)) {
          unknown.push(`${path}: ${key}`);
        }
      }
    }

    expect(unknown).toEqual([]);
    // Type-only guard so a removed registry key fails compilation too.
    const keys: FlagKey[] = [
      "newDashboard",
      "betaExport",
      "checkoutVariant",
      "killSwitchSync",
    ];
    expect(keys.every(isFlagKey)).toBe(true);
  });
});
