import type { DatabasePort } from "./DatabasePort";

/** Owns the one open per-user database. */
export interface DatabaseManager {
  current(): DatabasePort | null;
  open(userId: string): Promise<DatabasePort>;
  close(): Promise<void>;
}
