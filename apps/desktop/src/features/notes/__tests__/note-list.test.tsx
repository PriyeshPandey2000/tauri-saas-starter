import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import "@/shared/i18n";

// jsdom cannot measure layout (clientHeight is always 0), so keep the real
// virtualizer maths and feed it a fixed viewport instead.
vi.mock("@tanstack/react-virtual", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-virtual")>();
  return {
    ...actual,
    useVirtualizer: (options: Parameters<typeof actual.useVirtualizer>[0]) =>
      actual.useVirtualizer({
        ...options,
        observeElementRect: (_instance, callback) => {
          callback({ width: 800, height: 720 });
          return () => undefined;
        },
        observeElementOffset: (_instance, callback) => {
          callback(0, false);
          return () => undefined;
        },
      }),
  };
});

const { NoteList } = await import("../components/note-list");

describe("NoteList virtualization", () => {
  it("renders far fewer DOM nodes than 10,000 notes", async () => {
    const notes = Array.from({ length: 10_000 }, (_, index) => ({
      id: `note-${index}`,
      title: `Note ${index}`,
      body: "body",
      createdAt: "2026-10-20T00:00:00.000Z",
      updatedAt: "2026-10-20T00:00:00.000Z",
    }));

    render(
      <NoteList
        notes={notes}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(document.querySelectorAll("li").length).toBeGreaterThan(0);
    });
    expect(document.querySelectorAll("li").length).toBeLessThan(100);
  });
});
