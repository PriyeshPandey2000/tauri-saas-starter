import { describe, expect, it } from "vitest";

import { createDatabaseManager, databaseName } from "../database-manager";
import { createMemorySqliteClient } from "@/shared/testing/sqlite-test-client";

describe("databaseName", () => {
  it("hashes the user id so distinct ids never share a file", async () => {
    const dotted = await databaseName("a.b");
    const underscore = await databaseName("a_b");
    expect(dotted).toMatch(/^app-[0-9a-f]{64}\.db$/);
    expect(dotted).not.toBe(underscore);
    expect(await databaseName("a.b")).toBe(dotted);
  });
});

describe("createDatabaseManager", () => {
  it("serializes two quick opens for different users", async () => {
    const events: string[] = [];
    const manager = createDatabaseManager({
      createClient: async (userId) => {
        events.push(`open:${userId}`);
        const client = createMemorySqliteClient();
        return {
          select: client.select,
          execute: client.execute,
          close: async () => {
            events.push(`close:${userId}`);
            return client.close();
          },
        };
      },
    });

    const first = manager.open("user-a");
    const second = manager.open("user-b");
    await Promise.all([first, second]);

    expect(events).toEqual(["open:user-a", "close:user-a", "open:user-b"]);
    expect(manager.current()).not.toBeNull();
  });

  it("returns the pending open when the same user is requested twice", async () => {
    let creates = 0;
    const manager = createDatabaseManager({
      createClient: async () => {
        creates += 1;
        return createMemorySqliteClient();
      },
    });

    const [first, second] = await Promise.all([
      manager.open("user-a"),
      manager.open("user-a"),
    ]);
    expect(creates).toBe(1);
    expect(first).toBe(second);
  });
});
