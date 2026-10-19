import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  completeOAuthCallback: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
  onAuthStateChange: vi.fn(() => () => undefined),
}));

vi.mock("@/ports", () => ({ ports: { auth } }));

import { useAuthStore } from "../store";
import { onSignOut } from "../sign-out-registry";

const session = {
  user: {
    id: "u1",
    email: "ada@example.com",
    name: "Ada",
    emailVerified: true,
  },
  expiresAt: "2026-11-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    status: "unauthenticated",
    session: null,
    error: null,
    initialized: true,
  });
});

describe("auth store", () => {
  it("moves to authenticated after sign-in", async () => {
    auth.signIn.mockResolvedValue(session);
    await useAuthStore
      .getState()
      .signIn({ email: "ada@example.com", password: "secret12345" });
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session).toEqual(session);
  });

  it("records an error and stays signed out when sign-in fails", async () => {
    auth.signIn.mockRejectedValue(new Error("Invalid credentials"));
    await expect(
      useAuthStore
        .getState()
        .signIn({ email: "ada@example.com", password: "nope" }),
    ).rejects.toThrow("Invalid credentials");
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().error).toBe("Invalid credentials");
  });

  it("returns verification_required from sign-up", async () => {
    auth.signUp.mockResolvedValue({ status: "verification_required" });
    await expect(
      useAuthStore.getState().signUp({
        name: "Ada",
        email: "ada@example.com",
        password: "secret12345",
      }),
    ).resolves.toBe("verification_required");
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });

  it("runs sign-out cleanup hooks and clears the session", async () => {
    auth.signOut.mockResolvedValue(undefined);
    const cleanup = vi.fn();
    const unsubscribe = onSignOut(cleanup);
    useAuthStore.setState({ status: "authenticated", session });

    await useAuthStore.getState().signOut();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
    unsubscribe();
  });
});
