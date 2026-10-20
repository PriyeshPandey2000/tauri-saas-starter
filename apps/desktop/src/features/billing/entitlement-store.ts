import { create } from "zustand";
import type { Entitlement } from "@app/shared";

import { ports } from "@/ports";
import { getConfig } from "@/shared/lib/config";
import {
  clearEntitlementCache,
  loadCachedEntitlement,
  parsePublicKeys,
  saveEntitlement,
} from "./entitlement-cache";

const POLL_INTERVAL_MS = 3_000;
const POLL_DEADLINE_MS = 2 * 60_000;

interface EntitlementState {
  userId: string | null;
  entitlement: Entitlement | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  init(userId?: string): Promise<void>;
  refresh(): Promise<void>;
  reset(): Promise<void>;
  startPolling(): void;
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollDeadline = 0;

function keys() {
  return parsePublicKeys(getConfig().VITE_ENTITLEMENT_PUBLIC_KEYS);
}

function stopPolling(): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  userId: null,
  entitlement: null,
  loading: false,
  error: null,
  offline: false,

  async init(userId) {
    stopPolling();
    set({
      userId: userId ?? null,
      entitlement: null,
      error: null,
      offline: false,
    });
    if (!userId) {
      return;
    }
    const cached = await loadCachedEntitlement(userId, keys());
    if (cached) {
      set({ entitlement: cached, offline: true });
    }
    await get().refresh();
  },

  async refresh() {
    const userId = get().userId;
    if (!userId) {
      return;
    }
    set({ loading: true });
    try {
      const entitlement = await ports.billing.getEntitlement();
      if (!entitlement) {
        set({ entitlement: null, loading: false, error: null, offline: false });
        return;
      }
      if (entitlement.userId !== userId) {
        set({ loading: false, error: "Entitlement belongs to another user" });
        return;
      }
      set({ entitlement, loading: false, error: null, offline: false });
      await saveEntitlement(userId, entitlement, keys());
    } catch (error) {
      set({
        loading: false,
        offline: true,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async reset() {
    stopPolling();
    const userId = get().userId ?? undefined;
    set({
      userId: null,
      entitlement: null,
      loading: false,
      error: null,
      offline: false,
    });
    await clearEntitlementCache(userId);
  },

  startPolling() {
    stopPolling();
    pollDeadline = Date.now() + POLL_DEADLINE_MS;
    const tick = async () => {
      if (!get().userId) {
        return;
      }
      await get().refresh();
      const status = get().entitlement?.status;
      if (
        status === "active" ||
        status === "trialing" ||
        Date.now() >= pollDeadline
      ) {
        stopPolling();
        return;
      }
      pollTimer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };
    pollTimer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
  },
}));
