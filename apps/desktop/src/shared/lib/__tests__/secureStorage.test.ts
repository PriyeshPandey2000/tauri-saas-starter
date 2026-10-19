import { beforeEach, describe, expect, it, vi } from "vitest";

const bindings = vi.hoisted(() => ({
  commands: {
    secureSet: vi.fn(),
    secureGet: vi.fn(),
    secureDelete: vi.fn(),
  },
}));

vi.mock("@/shared/ipc/bindings", () => bindings);

import {
  SecureStorageError,
  deleteSecureValue,
  getSecureValue,
  setSecureValue,
} from "../secureStorage";

beforeEach(() => {
  for (const call of Object.values(bindings.commands)) {
    call.mockReset();
  }
});

describe("secureStorage", () => {
  it("writes a value through the bindings", async () => {
    bindings.commands.secureSet.mockResolvedValue({
      status: "ok",
      data: null,
    });

    await setSecureValue("api-token", "value");

    expect(bindings.commands.secureSet).toHaveBeenCalledWith(
      "api-token",
      "value",
    );
  });

  it("reads a value", async () => {
    bindings.commands.secureGet.mockResolvedValue({
      status: "ok",
      data: "value",
    });

    await expect(getSecureValue("api-token")).resolves.toBe("value");
  });

  it("returns null for a missing entry", async () => {
    bindings.commands.secureGet.mockResolvedValue({
      status: "ok",
      data: null,
    });

    await expect(getSecureValue("missing")).resolves.toBeNull();
  });

  it("turns an AppError into SecureStorageError with the kind preserved", async () => {
    bindings.commands.secureGet.mockResolvedValue({
      status: "error",
      error: { kind: "Keychain", message: "keychain locked" },
    });

    const error = await getSecureValue("api-token").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(SecureStorageError);
    expect(error).toMatchObject({
      name: "SecureStorageError",
      kind: "Keychain",
      message: "keychain locked",
    });
  });

  it("deletes a value", async () => {
    bindings.commands.secureDelete.mockResolvedValue({
      status: "ok",
      data: null,
    });

    await deleteSecureValue("api-token");

    expect(bindings.commands.secureDelete).toHaveBeenCalledWith("api-token");
  });
});
