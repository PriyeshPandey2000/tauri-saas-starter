import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError, createApiClient } from "../apiClient";

const ItemSchema = z.object({ id: z.string(), name: z.string() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("api client", () => {
  it("parses a validated JSON response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "1", name: "Ada" }));
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.request("/users/1", { schema: ItemSchema }),
    ).resolves.toEqual({ id: "1", name: "Ada" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/users/1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("maps a non-2xx response to an ApiError with the server message", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl: (async () =>
        jsonResponse({ message: "Nope" }, 403)) as unknown as typeof fetch,
    });

    await expect(
      client.request("/users/1", { schema: ItemSchema }),
    ).rejects.toMatchObject({ code: "http", status: 403, message: "Nope" });
  });

  it("maps a rejected fetch to a network error", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl: (async () => {
        throw new TypeError("offline");
      }) as unknown as typeof fetch,
    });

    await expect(
      client.request("/users/1", { schema: ItemSchema }),
    ).rejects.toMatchObject({ code: "network", status: null });
  });

  it("rejects a response that fails the schema", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl: (async () =>
        jsonResponse({ id: 1 })) as unknown as typeof fetch,
    });

    const error = await client
      .request("/users/1", { schema: ItemSchema })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "invalid_response", status: 200 });
  });

  it("aborts after the timeout and reports a timeout error", async () => {
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      timeoutMs: 5,
      fetchImpl,
    });

    await expect(
      client.request("/slow", { schema: ItemSchema }),
    ).rejects.toMatchObject({ code: "timeout", status: null });
  });

  it("injects the bearer token from the provider", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "1", name: "Ada" }));
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    client.setTokenProvider(() => "token-123");

    await client.request("/me", { schema: ItemSchema });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.headers).toMatchObject({ authorization: "Bearer token-123" });
  });
});

describe("api client non-JSON success body", () => {
  it("maps a 2xx body that is not JSON to invalid_response", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl: (async () =>
        new Response("<html>ok</html>", {
          status: 200,
        })) as unknown as typeof fetch,
    });

    await expect(
      client.request("/users/1", { schema: ItemSchema }),
    ).rejects.toMatchObject({
      code: "invalid_response",
      status: 200,
      message: "Response body was not valid JSON",
    });
  });
});
