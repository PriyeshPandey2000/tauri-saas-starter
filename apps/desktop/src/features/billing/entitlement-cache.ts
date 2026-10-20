import { isTauri } from "@tauri-apps/api/core";
import { z } from "zod";
import {
  canonicalEntitlement,
  EntitlementSchema,
  type Entitlement,
  type EntitlementPayload,
} from "@app/shared";

const CACHE_FILE = "billing.json";
const CACHE_KEY = "billing";
const CLOCK_SKEW_MS = 60_000;

const PublicKeySchema = z.object({
  kid: z.string().min(1),
  jwk: z.record(z.string(), z.unknown()),
});
export type EntitlementPublicKey = z.infer<typeof PublicKeySchema>;

const CacheEntrySchema = z.object({
  entitlement: EntitlementSchema,
  highestIssuedAt: z.string().min(1),
});
const CacheFileSchema = z.object({
  entries: z.record(z.string(), CacheEntrySchema),
});
type CacheFile = z.infer<typeof CacheFileSchema>;

const memory = new Map<string, unknown>();

export function parsePublicKeys(
  raw: string | undefined,
): EntitlementPublicKey[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = z.array(PublicKeySchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function payloadOf(entitlement: Entitlement): EntitlementPayload {
  return {
    v: entitlement.v,
    kid: entitlement.kid,
    userId: entitlement.userId,
    plan: entitlement.plan,
    status: entitlement.status,
    currentPeriodEnd: entitlement.currentPeriodEnd,
    features: entitlement.features,
    issuedAt: entitlement.issuedAt,
    validUntil: entitlement.validUntil,
  };
}

/** Verify ECDSA P-256 (IEEE P1363) with the embedded public key. */
export async function verifyEntitlementSignature(
  entitlement: Entitlement,
  keys: EntitlementPublicKey[],
): Promise<boolean> {
  const key = keys.find((candidate) => candidate.kid === entitlement.kid);
  if (!key) {
    return false;
  }
  try {
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      key.jwk as JsonWebKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      decodeBase64(entitlement.signature),
      new TextEncoder().encode(canonicalEntitlement(payloadOf(entitlement))),
    );
  } catch {
    return false;
  }
}

async function loadFile(): Promise<CacheFile> {
  if (!isTauri()) {
    const parsed = CacheFileSchema.safeParse(memory.get(CACHE_KEY));
    return parsed.success ? parsed.data : { entries: {} };
  }
  const { load } = await import("@tauri-apps/plugin-store");
  const store = await load(CACHE_FILE, { autoSave: true }).catch(() => null);
  if (!store) {
    const parsed = CacheFileSchema.safeParse(memory.get(CACHE_KEY));
    return parsed.success ? parsed.data : { entries: {} };
  }
  const parsed = CacheFileSchema.safeParse(await store.get(CACHE_KEY));
  return parsed.success ? parsed.data : { entries: {} };
}

async function saveFile(value: CacheFile): Promise<void> {
  if (!isTauri()) {
    memory.set(CACHE_KEY, value);
    return;
  }
  const { load } = await import("@tauri-apps/plugin-store");
  const store = await load(CACHE_FILE, { autoSave: true }).catch(() => null);
  if (store) {
    await store.set(CACHE_KEY, value);
  } else {
    memory.set(CACHE_KEY, value);
  }
}

/** Load and verify the cached snapshot; `null` when forged, expired or rolled back. */
export async function loadCachedEntitlement(
  userId: string,
  keys: EntitlementPublicKey[],
  now = new Date(),
): Promise<Entitlement | null> {
  const entry = (await loadFile()).entries[userId];
  if (!entry) {
    return null;
  }
  const highest = new Date(entry.highestIssuedAt);
  if (Number.isNaN(highest.getTime())) {
    return null;
  }
  if (now.getTime() + CLOCK_SKEW_MS < highest.getTime()) {
    return null;
  }
  if (new Date(entry.entitlement.validUntil).getTime() <= now.getTime()) {
    return null;
  }
  if (
    entry.entitlement.userId !== userId ||
    !(await verifyEntitlementSignature(entry.entitlement, keys))
  ) {
    return null;
  }
  return entry.entitlement;
}

/** Verify before caching; refuses snapshots older than the stored server time. */
export async function saveEntitlement(
  userId: string,
  entitlement: Entitlement,
  keys: EntitlementPublicKey[],
): Promise<boolean> {
  if (
    entitlement.userId !== userId ||
    !(await verifyEntitlementSignature(entitlement, keys))
  ) {
    return false;
  }
  const file = await loadFile();
  const previous = file.entries[userId]?.highestIssuedAt;
  if (previous) {
    const highest = new Date(previous);
    if (
      !Number.isNaN(highest.getTime()) &&
      new Date(entitlement.issuedAt).getTime() < highest.getTime()
    ) {
      return false;
    }
  }
  file.entries[userId] = { entitlement, highestIssuedAt: entitlement.issuedAt };
  await saveFile(file);
  return true;
}

export async function clearEntitlementCache(userId?: string): Promise<void> {
  const file = await loadFile();
  if (!userId) {
    await saveFile({ entries: {} });
    return;
  }
  delete file.entries[userId];
  await saveFile(file);
}
