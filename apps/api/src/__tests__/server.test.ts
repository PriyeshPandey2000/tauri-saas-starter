import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";

let close: (() => void) | null = null;

afterEach(() => {
  close?.();
  close = null;
});

describe("node server", () => {
  it("preserves multiple Set-Cookie headers", async () => {
    const app = new Hono();
    app.get("/", (c) => {
      c.header("set-cookie", "first=1; Path=/", { append: true });
      c.header("set-cookie", "second=2; Path=/", { append: true });
      return c.text("ok");
    });

    const server = serve({ fetch: app.fetch, port: 0 });
    close = () => server.close();
    await once(server, "listening");
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/`);

    expect(response.headers.getSetCookie()).toEqual([
      "first=1; Path=/",
      "second=2; Path=/",
    ]);
  });
});
