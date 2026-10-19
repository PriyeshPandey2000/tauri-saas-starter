import { z } from "zod";

export const AppEnvSchema = z.enum(["dev", "staging", "prod"]);

export const ConfigSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_APP_ENV: AppEnvSchema,
  VITE_POSTHOG_KEY: z.string().min(1).optional(),
  VITE_POSTHOG_HOST: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type AppEnv = z.infer<typeof AppEnvSchema>;

export class ConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Invalid application configuration");
    this.name = "ConfigError";
    this.issues = issues;
  }
}

export function parseConfig(env: Record<string, unknown>): AppConfig {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => {
        const path = issue.path.join(".") || "(root)";
        return `${path}: ${issue.message}`;
      }),
    );
  }
  return result.data;
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) {
    cached = parseConfig(import.meta.env);
  }
  return cached;
}
