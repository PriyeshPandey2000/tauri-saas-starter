import { z } from "zod";

const BooleanStringSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

export const ApiEnvSchema = z.object({
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
  return result.data;
}
