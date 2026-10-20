import { create } from "zustand";

export type DatabasePhase = "idle" | "opening" | "ready" | "error";

interface DatabaseState {
  phase: DatabasePhase;
  /** Signed-in user whose database is open; `null` when signed out. */
  userId: string | null;
  /** Human-readable reason when `phase` is `error`. */
  error: string | null;
  setOpening: (userId: string) => void;
  setReady: (userId: string) => void;
  setError: (userId: string, error: string) => void;
  reset: () => void;
}

/** Startup state of the per-user local database; drives the error screen. */
export const useDatabaseStore = create<DatabaseState>((set) => ({
  phase: "idle",
  userId: null,
  error: null,
  setOpening: (userId) => set({ phase: "opening", userId, error: null }),
  setReady: (userId) => set({ phase: "ready", userId, error: null }),
  setError: (userId, error) => set({ phase: "error", userId, error }),
  reset: () => set({ phase: "idle", userId: null, error: null }),
}));
