import { z } from "zod";

import { getConfig } from "./config";

export const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiErrorCode = "http" | "network" | "timeout" | "invalid_response";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly details: unknown;

  constructor(
    message: string,
    options: {
      code: ApiErrorCode;
      status?: number | null;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status ?? null;
    this.details = options.details;
  }
}

export type TokenProvider = () => Promise<string | null> | string | null;

export interface ApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  tokenProvider?: TokenProvider;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions<T> {
  schema: z.ZodType<T>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ApiClient {
  request<T>(path: string, options: RequestOptions<T>): Promise<T>;
  setTokenProvider(provider: TokenProvider | null): void;
  setRefreshHandler(handler: (() => Promise<void>) | null): void;
}

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function readErrorDetails(body: unknown): unknown {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    return typeof message === "string" ? message : body;
  }
  return body;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let tokenProvider = options.tokenProvider ?? null;
  let refreshHandler: (() => Promise<void>) | null = null;

  return {
    setTokenProvider(provider) {
      tokenProvider = provider;
    },
    setRefreshHandler(handler) {
      refreshHandler = handler;
    },

    async request<T>(path: string, request: RequestOptions<T>): Promise<T> {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs ?? timeoutMs);
      const onCallerAbort = () => controller.abort();
      request.signal?.addEventListener("abort", onCallerAbort, { once: true });

      try {
        const send = async (): Promise<Response> => {
          const headers: Record<string, string> = { ...request.headers };
          if (request.body !== undefined) {
            headers["content-type"] = "application/json";
          }
          if (tokenProvider) {
            const token = await tokenProvider();
            if (token) {
              headers.authorization = `Bearer ${token}`;
            }
          }
          return fetchImpl(joinUrl(options.baseUrl, path), {
            method: request.method ?? "GET",
            headers,
            body:
              request.body === undefined
                ? undefined
                : JSON.stringify(request.body),
            signal: controller.signal,
          });
        };

        let response = await send();
        if (response.status === 401 && refreshHandler) {
          try {
            await refreshHandler();
          } catch (error) {
            throw new ApiError("Session expired", {
              code: "http",
              status: 401,
              cause: error,
            });
          }
          response = await send();
        }

        if (!response.ok) {
          const details = await response
            .json()
            .then(readErrorDetails)
            .catch(() => null);
          const message =
            typeof details === "string"
              ? details
              : `Request failed with status ${response.status}`;
          throw new ApiError(message, {
            code: "http",
            status: response.status,
            details,
          });
        }

        let body: unknown;
        try {
          body = await response.json();
        } catch (error) {
          throw new ApiError("Response body was not valid JSON", {
            code: "invalid_response",
            status: response.status,
            details: error instanceof Error ? error.message : String(error),
          });
        }
        const parsed = request.schema.safeParse(body);
        if (!parsed.success) {
          throw new ApiError("Response did not match the expected schema", {
            code: "invalid_response",
            status: response.status,
            details: parsed.error.issues,
          });
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (timedOut) {
          throw new ApiError("Request timed out", {
            code: "timeout",
            details: { timeoutMs: request.timeoutMs ?? timeoutMs },
            cause: error,
          });
        }
        throw new ApiError("Network request failed", {
          code: "network",
          cause: error,
        });
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener("abort", onCallerAbort);
      }
    },
  };
}

let client: ApiClient | null = null;
let authTokenProvider: TokenProvider | null = null;
let authRefreshHandler: (() => Promise<void>) | null = null;

/** Lazily built client for the configured API base URL. */
export function getApiClient(): ApiClient {
  if (!client) {
    client = createApiClient({
      baseUrl: getConfig().VITE_API_URL,
      tokenProvider: authTokenProvider ?? undefined,
    });
    client.setRefreshHandler(authRefreshHandler);
  }
  return client;
}

/** Installed by the auth composition root. Safe before config is validated. */
export function setAuthTokenProvider(provider: TokenProvider | null): void {
  authTokenProvider = provider;
  client?.setTokenProvider(provider);
}

/** Called once on a 401 before retrying; the adapter dedupes refreshes. */
export function setAuthRefreshHandler(
  handler: (() => Promise<void>) | null,
): void {
  authRefreshHandler = handler;
  client?.setRefreshHandler(handler);
}
