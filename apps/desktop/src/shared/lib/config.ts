import { z } from "zod";

export const AppEnvSchema = z.enum(["dev", "staging", "prod"]);
export const LogTargetSchema = z.enum(["console", "file"]);
export const NotesSourceSchema = z.enum(["local", "remote"]);

export const ConfigSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_APP_ENV: AppEnvSchema,
  VITE_LOG_TARGET: LogTargetSchema.optional(),
  VITE_POSTHOG_KEY: z.string().min(1).optional(),
  VITE_POSTHOG_HOST: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  /** Where notes are read/written. Local SQLite is the default. */
  VITE_NOTES_SOURCE: NotesSourceSchema.optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type AppEnv = z.infer<typeof AppEnvSchema>;
export type LogTarget = z.infer<typeof LogTargetSchema>;
export type NotesSource = z.infer<typeof NotesSourceSchema>;

/**
 * Explicit target wins; otherwise console in dev and the log file elsewhere.
 * Invalid raw values are ignored here and caught by `parseConfig` at boot.
 */
export function resolveLogTarget(
  env: Record<string, unknown>,
  isDev: boolean,
): LogTarget {
  const parsed = LogTargetSchema.safeParse(env.VITE_LOG_TARGET);
  if (parsed.success) {
    return parsed.data;
  }
  return isDev ? "console" : "file";
}

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
