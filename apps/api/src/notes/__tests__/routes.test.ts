import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { registerNotesRoutes } from "../routes";
import type { Database } from "../../db/client";
import type { AuthVariables } from "../../auth/require-auth";

describe("notes routes", () => {
  it("returns 401 when the verified claims carry no subject", async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use("*", async (c, next) => {
      c.set("claims", {});
      await next();
    });
    // The database must never be reached without a subject.
    registerNotesRoutes(app, {} as unknown as Database);

    const response = await app.request("/notes");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
  });
});
