import { z } from "zod";

const BooleanStringSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

export const ApiEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().url(),
  DATABASE_URL_DIRECT: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  APP_DEEP_LINK_SCHEME: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*$/)
    .default("tauri-saas-starter"),
  AUTH_REQUIRE_EMAIL_VERIFICATION: BooleanStringSchema,
  CORS_ORIGINS: z.string().optional(),
  // Header set by the trusted proxy in front of the API (e.g. fly-client-ip).
  TRUSTED_PROXY_HEADER: z.string().min(1).optional(),

  // Payments. Test mode is the default; live mode must be explicitly allowed.
  DODO_PAYMENTS_ENVIRONMENT: z
    .enum(["test_mode", "live_mode"])
    .default("test_mode"),
  ALLOW_LIVE_PAYMENTS: z.string().optional(),
  DODO_PAYMENTS_API_KEY: z.string().min(1).optional(),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string().min(1).optional(),
  DODO_PAYMENTS_PRODUCT_PRO: z.string().min(1).optional(),
  ENTITLEMENT_SIGNING_KEY: z.string().min(1).optional(),
  ENTITLEMENT_SIGNING_KID: z.string().min(1).default("k1"),
  API_PUBLIC_URL: z.string().url().optional(),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export class ApiEnvError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Invalid API configuration");
    this.name = "ApiEnvError";
    this.issues = issues;
  }
}

/**
 * Payments fail closed: live mode is refused unless this is a production
 * process that explicitly opted in. Kept separate so tests can target it.
 */
export function assertPaymentsSafety(
  env: Pick<
    ApiEnv,
    "DODO_PAYMENTS_ENVIRONMENT" | "ALLOW_LIVE_PAYMENTS" | "NODE_ENV"
  >,
): void {
  if (env.DODO_PAYMENTS_ENVIRONMENT !== "live_mode") {
    return;
  }
  if (env.NODE_ENV !== "production") {
    throw new ApiEnvError([
      "DODO_PAYMENTS_ENVIRONMENT: live_mode requires NODE_ENV=production",
    ]);
  }
  if (env.ALLOW_LIVE_PAYMENTS !== "true") {
    throw new ApiEnvError([
      "ALLOW_LIVE_PAYMENTS: must be exactly true to allow live payments",
    ]);
  }
}

export function loadEnv(source: Record<string, unknown> = process.env): ApiEnv {
  const result = ApiEnvSchema.safeParse(source);
  if (!result.success) {
    throw new ApiEnvError(
      result.error.issues.map((issue) => {
        const path = issue.path.join(".") || "(root)";
        return `${path}: ${issue.message}`;
      }),
    );
  }
  assertPaymentsSafety(result.data);
  return result.data;
}

/** Dodo API base URL for the configured environment. */
export function dodoApiBaseUrl(
  env: Pick<ApiEnv, "DODO_PAYMENTS_ENVIRONMENT">,
): string {
  return env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}
