import { z } from "zod";

/**
 * Every flag is declared here once. Key naming: camelCase and positive
 * (`betaExport`, never `disableExport`). Each flag carries an owner and a
 * removal date so the registry cannot grow forever.
 */
export const FLAG_REGISTRY = {
  newDashboard: {
    schema: z.boolean(),
    default: false,
    description: "Show the redesigned dashboard shell.",
    owner: "desktop",
    removeBy: "2026-12-31",
  },
  betaExport: {
    schema: z.boolean(),
    default: false,
    description: "Enable the beta export screen and route.",
    owner: "desktop",
    removeBy: "2026-12-31",
  },
  checkoutVariant: {
    schema: z.union([z.literal("a"), z.literal("b")]),
    default: "a",
    description: "Checkout copy variant (a = current, b = experiment).",
    owner: "billing",
    removeBy: "2027-03-31",
  },
  killSwitchSync: {
    schema: z.boolean(),
    default: false,
    description: "Stop all remote note sync while the backend is degraded.",
    owner: "platform",
    removeBy: "2027-03-31",
  },
} as const;

export type FlagKey = keyof typeof FLAG_REGISTRY;

export const FLAG_KEYS = Object.keys(FLAG_REGISTRY) as FlagKey[];

/** The value type of one flag, derived from its Zod schema. */
export type FlagValue<K extends FlagKey> = z.infer<
  (typeof FLAG_REGISTRY)[K]["schema"]
>;

/** The value of every flag. */
export type FlagValues = { [K in FlagKey]: FlagValue<K> };

/** Flags whose value is a boolean (usable with `<Flag>`). */
export type BooleanFlagKey = {
  [K in FlagKey]: FlagValue<K> extends boolean ? K : never;
}[FlagKey];

/** Flags whose value is a string variant (usable with `<FlagVariant>`). */
export type VariantFlagKey = {
  [K in FlagKey]: FlagValue<K> extends string ? K : never;
}[FlagKey];

/** Where a resolved value came from, in resolution order. */
export const FlagSourceSchema = z.enum(["override", "remote", "default"]);
export type FlagSource = z.infer<typeof FlagSourceSchema>;

/** Registry defaults as a plain value object. */
export const DEFAULT_FLAGS: FlagValues = {
  newDashboard: false,
  betaExport: false,
  checkoutVariant: "a",
  killSwitchSync: false,
};

export const FlagValueSchema = z.union([
  z.boolean(),
  z.string().min(1).max(64),
]);

/** Parse one raw value against its registry schema; `null` when it does not match. */
export function parseFlagValue<K extends FlagKey>(
  key: K,
  raw: unknown,
): FlagValue<K> | null {
  const parsed = FLAG_REGISTRY[key].schema.safeParse(raw);
  return parsed.success ? (parsed.data as FlagValue<K>) : null;
}

/** Resolve a key from untrusted input (cache, overrides, dev panel). */
export function isFlagKey(value: string): value is FlagKey {
  return Object.hasOwn(FLAG_REGISTRY, value);
}
