import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { noteKeys } from "../keys";
import {
  applyOptimisticRemove,
  applyOptimisticUpdate,
  rollback,
} from "../optimistic";

const note = {
  id: "note-1",
  title: "Original",
  body: "body",
  createdAt: "2026-10-20T00:00:00.000Z",
  updatedAt: "2026-10-20T00:00:00.000Z",
};

function client(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(noteKeys.list("user-a"), {
    notes: [note],
    nextCursor: null,
  });
  return queryClient;
}

describe("optimistic notes updates", () => {
  it("rolls an update back after a failure", async () => {
    const queryClient = client();
    const context = await applyOptimisticUpdate(
      queryClient,
      "user-a",
      note.id,
      {
        title: "Optimistic",
      },
    );
    expect(
      queryClient.getQueryData<{ notes: (typeof note)[] }>(
        noteKeys.list("user-a"),
      )?.notes[0]?.title,
    ).toBe("Optimistic");

    rollback(queryClient, "user-a", context);
    expect(
      queryClient.getQueryData<{ notes: (typeof note)[] }>(
        noteKeys.list("user-a"),
      )?.notes[0]?.title,
    ).toBe("Original");
  });

  it("rolls a remove back after a failure", async () => {
    const queryClient = client();
    const context = await applyOptimisticRemove(queryClient, "user-a", note.id);
    expect(
      queryClient.getQueryData<{ notes: (typeof note)[] }>(
        noteKeys.list("user-a"),
      )?.notes,
    ).toHaveLength(0);

    rollback(queryClient, "user-a", context);
    expect(
      queryClient.getQueryData<{ notes: (typeof note)[] }>(
        noteKeys.list("user-a"),
      )?.notes,
    ).toHaveLength(1);
  });
});
