import { z } from "zod";

import { commands, type AppError } from "@/shared/ipc/bindings";

const SecureValueSchema = z.string();
const SecureValueOrNullSchema = SecureValueSchema.nullable();

type CommandResult<T> =
  { status: "ok"; data: T } | { status: "error"; error: AppError };

export class SecureStorageError extends Error {
  readonly kind: AppError["kind"];

  constructor(error: AppError) {
    super(error.message);
    this.name = "SecureStorageError";
    this.kind = error.kind;
  }
}

async function unwrap<T>(result: Promise<CommandResult<T>>): Promise<T> {
  const settled = await result;
  if (settled.status === "error") {
    throw new SecureStorageError(settled.error);
  }
  return settled.data;
}

/** Store a secret for `key` in the OS keychain. The value is never logged. */
export async function setSecureValue(
  key: string,
  value: string,
): Promise<void> {
  await unwrap(commands.secureSet(key, value));
}

/** Read a secret for `key`, or `null` when it does not exist. */
export async function getSecureValue(key: string): Promise<string | null> {
  return SecureValueOrNullSchema.parse(await unwrap(commands.secureGet(key)));
}

/** Delete the secret for `key`. Missing entries are ignored. */
export async function deleteSecureValue(key: string): Promise<void> {
  await unwrap(commands.secureDelete(key));
}
