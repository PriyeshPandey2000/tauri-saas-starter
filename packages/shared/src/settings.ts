import { z } from "zod";

export const ThemeSchema = z.enum(["light", "dark", "system"]);
export type Theme = z.infer<typeof ThemeSchema>;

export const TelemetryConsentSchema = z.enum(["unset", "granted", "denied"]);
export type TelemetryConsent = z.infer<typeof TelemetryConsentSchema>;

export const AppSettingsSchema = z.object({
  theme: ThemeSchema.default("system"),
  language: z.string().min(1).default("en"),
  sidebarCollapsed: z.boolean().default(false),
  telemetryConsent: TelemetryConsentSchema.default("unset"),
  closeToTray: z.boolean().default(false),
  launchAtLogin: z.boolean().default(false),
  notificationsEnabled: z.boolean().default(false),
  globalShortcut: z.string().max(64).default("CommandOrControl+Shift+Space"),
  updateChannel: z.enum(["stable", "beta"]).default("stable"),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type AppSettingsInput = z.input<typeof AppSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = AppSettingsSchema.parse({});

export function parseSettings(raw: unknown): AppSettings {
  const result = AppSettingsSchema.safeParse(raw);
  return result.success ? result.data : { ...DEFAULT_SETTINGS };
}
