import { QueryClient, dehydrate } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { noteKeys } from "@/features/notes/keys";

vi.mock("@/ports", () => ({
  ports: {
    queryCache: {
      load: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    },
  },
}));

const { ports } = await import("@/ports");
const {
  clearQueryCacheOnUserChange,
  isPersistableQueryKey,
  restoreQueryCache,
} = await import("../query-persistence");

const note = {
  id: "note-1",
  title: "Private",
  body: "A's data",
  createdAt: "2026-10-20T00:00:00.000Z",
  updatedAt: "2026-10-20T00:00:00.000Z",
};

describe("query cache isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never persists user-data queries", () => {
    expect(isPersistableQueryKey(noteKeys.list("user-a"))).toBe(false);
    expect(isPersistableQueryKey(["notes", "user-a", "detail", "n"])).toBe(
      false,
    );
    expect(isPersistableQueryKey(["flags", "public"])).toBe(true);
  });

  it("drops notes written by an older build when restoring", async () => {
    const source = new QueryClient();
    source.setQueryData(noteKeys.list("user-a"), {
      notes: [note],
      nextCursor: null,
    });
    source.setQueryData(["flags", "public"], { enabled: true });
    vi.mocked(ports.queryCache.load).mockResolvedValue(
      JSON.stringify(dehydrate(source)),
    );

    const target = new QueryClient();
    await restoreQueryCache(target);

    expect(target.getQueryData(noteKeys.list("user-a"))).toBeUndefined();
    expect(target.getQueryData(["flags", "public"])).toEqual({
      enabled: true,
    });
  });

  it("clears A's cache on sign-out so B starts empty", () => {
    const client = new QueryClient();
    let notify: (userId: string | null) => void = () => undefined;
    clearQueryCacheOnUserChange(client, (listener) => {
      notify = listener;
      listener("user-a");
    });

    client.setQueryData(noteKeys.list("user-a"), {
      notes: [note],
      nextCursor: null,
    });

    notify(null);
    expect(client.getQueryData(noteKeys.list("user-a"))).toBeUndefined();

    notify("user-b");
    expect(client.getQueryData(noteKeys.list("user-b"))).toBeUndefined();
    expect(noteKeys.list("user-a")).not.toEqual(noteKeys.list("user-b"));
  });
});
