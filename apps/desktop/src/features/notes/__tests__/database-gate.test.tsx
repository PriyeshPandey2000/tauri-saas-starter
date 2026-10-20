import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "@/shared/i18n";

vi.mock("@/ports", () => ({
  ports: {
    database: {
      open: vi.fn(() => Promise.resolve({})),
      close: vi.fn(() => Promise.resolve()),
    },
  },
}));

vi.mock("@/shared/lib/config", () => ({
  getConfig: () => ({ VITE_NOTES_SOURCE: "local" }),
}));

const { ports } = await import("@/ports");
const { useDatabaseStore } = await import("@/shared/lib/db-status");
const { DatabaseGate } = await import("../components/database-gate");

describe("DatabaseGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDatabaseStore.getState().reset();
  });

  afterEach(() => {
    useDatabaseStore.getState().reset();
  });

  it("shows the opening state", () => {
    useDatabaseStore.getState().setOpening("user-a");
    render(
      <DatabaseGate userId="user-a">
        <p>notes</p>
      </DatabaseGate>,
    );
    expect(screen.getByText(/Opening your notes/)).toBeTruthy();
  });

  it("shows the error state and retries the open", () => {
    useDatabaseStore.getState().setError("user-a", "migration failed");
    const signOut = vi.fn();
    render(
      <DatabaseGate userId="user-a" onSignOut={signOut}>
        <p>notes</p>
      </DatabaseGate>,
    );
    expect(screen.getByText("Local database unavailable")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("migration failed");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(ports.database.open).toHaveBeenCalledWith("user-a");

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalled();
  });

  it("renders children when the database is ready", () => {
    useDatabaseStore.getState().setReady("user-a");
    render(
      <DatabaseGate userId="user-a">
        <p>notes</p>
      </DatabaseGate>,
    );
    expect(screen.getByText("notes")).toBeTruthy();
  });
});
