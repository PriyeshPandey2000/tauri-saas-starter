import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entitlement } from "@app/shared";

const getEntitlement = vi.hoisted(() => vi.fn());
const cache = vi.hoisted(() => ({
  parsePublicKeys: vi.fn(() => [{ kid: "k1", jwk: {} }]),
  loadCachedEntitlement: vi.fn(async () => null),
  saveEntitlement: vi.fn(async () => true),
  clearEntitlementCache: vi.fn(async () => undefined),
}));

vi.mock("@/ports", () => ({ ports: { billing: { getEntitlement } } }));
vi.mock("@/shared/lib/config", () => ({
  getConfig: () => ({ VITE_ENTITLEMENT_PUBLIC_KEYS: "[]" }),
}));
vi.mock("../entitlement-cache", () => cache);

const { useEntitlementStore } = await import("../entitlement-store");

function entitlement(plan: "free" | "pro", features: string[]): Entitlement {
  return {
    v: 1,
    kid: "k1",
    userId: "user-a",
    plan,
    status: plan === "pro" ? "active" : "none",
    currentPeriodEnd: null,
    features,
    issuedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86_400_000).toISOString(),
    signature: "sig",
  };
}

describe("entitlement store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEntitlementStore.setState({
      userId: "user-a",
      entitlement: entitlement("pro", ["export"]),
      loading: false,
      error: null,
      offline: false,
    });
  });

  it("keeps the last verified snapshot when billing returns 503", async () => {
    getEntitlement.mockResolvedValue(null);
    await useEntitlementStore.getState().refresh();
    const state = useEntitlementStore.getState();
    expect(state.entitlement?.features).toContain("export");
    expect(state.offline).toBe(true);
  });

  it("keeps the snapshot on a network error", async () => {
    getEntitlement.mockRejectedValue(new Error("offline"));
    await useEntitlementStore.getState().refresh();
    expect(useEntitlementStore.getState().entitlement?.features).toContain(
      "export",
    );
    expect(useEntitlementStore.getState().offline).toBe(true);
  });

  it("replaces the snapshot on a successful response", async () => {
    getEntitlement.mockResolvedValue(entitlement("free", []));
    await useEntitlementStore.getState().refresh();
    expect(useEntitlementStore.getState().entitlement?.features).toEqual([]);
    expect(useEntitlementStore.getState().offline).toBe(false);
  });
});
