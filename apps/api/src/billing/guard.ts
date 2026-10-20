import type { Database } from "../db/client";
import { loadCurrentSubscription } from "./entitlement";

/** Account deletion is blocked while a subscription may still bill. */
export async function assertAccountDeletable(
  db: Database,
  userId: string,
): Promise<void> {
  const row = await loadCurrentSubscription(db, userId);
  if (!row) {
    return;
  }
  if (
    row.status === "active" ||
    row.status === "trialing" ||
    row.status === "past_due"
  ) {
    throw new Error("Cancel your subscription before deleting the account");
  }
}
