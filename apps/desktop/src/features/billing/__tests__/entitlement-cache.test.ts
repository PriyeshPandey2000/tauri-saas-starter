import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  canonicalEntitlement,
  type Entitlement,
  type EntitlementPayload,
} from "@app/shared";

import {
  clearEntitlementCache,
  loadCachedEntitlement,
  saveEntitlement,
  verifyEntitlementSignature,
  type EntitlementPublicKey,
} from "../entitlement-cache";

let privateKey: CryptoKey;
let keys: EntitlementPublicKey[] = [];

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  privateKey = pair.privateKey;
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  keys = [{ kid: "k1", jwk: jwk as unknown as Record<string, unknown> }];
});

function makePayload(
  overrides: Partial<EntitlementPayload> = {},
): EntitlementPayload {
  const now = Date.now();
  return {
    v: 1,
    kid: "k1",
    userId: "user-a",
    plan: "pro",
    status: "active",
    currentPeriodEnd: new Date(now + 3_600_000).toISOString(),
    features: ["export"],
    issuedAt: new Date(now).toISOString(),
    validUntil: new Date(now + 86_400_000).toISOString(),
    ...overrides,
  };
}

async function signPayload(payload: EntitlementPayload): Promise<Entitlement> {
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(canonicalEntitlement(payload)),
  );
  return { ...payload, signature: toBase64(signature) };
}

describe("entitlement cache", () => {
  beforeEach(async () => {
    await clearEntitlementCache();
  });

  it("verifies and caches a signed snapshot", async () => {
    const entitlement = await signPayload(makePayload());
    expect(await verifyEntitlementSignature(entitlement, keys)).toBe(true);
    expect(await saveEntitlement("user-a", entitlement, keys)).toBe(true);
    expect(await loadCachedEntitlement("user-a", keys)).toEqual(entitlement);
  });

  it("rejects a tampered snapshot", async () => {
    const entitlement = await signPayload(makePayload());
    const tampered = {
      ...entitlement,
      features: [...entitlement.features, "admin"],
    };
    expect(await verifyEntitlementSignature(tampered, keys)).toBe(false);
    expect(await saveEntitlement("user-a", tampered, keys)).toBe(false);
    expect(await loadCachedEntitlement("user-a", keys)).toBeNull();
  });

  it("rejects an expired snapshot", async () => {
    const entitlement = await signPayload(
      makePayload({
        issuedAt: new Date(Date.now() - 172_800_000).toISOString(),
        validUntil: new Date(Date.now() - 86_400_000).toISOString(),
      }),
    );
    await saveEntitlement("user-a", entitlement, keys);
    expect(await loadCachedEntitlement("user-a", keys)).toBeNull();
  });

  it("rejects a snapshot after a clock rollback", async () => {
    const entitlement = await signPayload(makePayload());
    await saveEntitlement("user-a", entitlement, keys);
    const rolledBack = new Date(Date.now() - 3_600_000);
    expect(await loadCachedEntitlement("user-a", keys, rolledBack)).toBeNull();
  });

  it("never shows one user's snapshot to another", async () => {
    await saveEntitlement("user-a", await signPayload(makePayload()), keys);
    expect(await loadCachedEntitlement("user-b", keys)).toBeNull();
  });
});
