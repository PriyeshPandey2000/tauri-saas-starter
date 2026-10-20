import { useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";

import {
  FLAG_KEYS,
  FLAG_REGISTRY,
  type FlagKey,
  type FlagSource,
  type FlagValue,
} from "@app/shared";

import { ports } from "@/ports";

const SOURCE_LABEL: Record<FlagSource, string> = {
  override: "flags.sourceOverride",
  remote: "flags.sourceRemote",
  default: "flags.sourceDefault",
};

/** Dev/staging panel: every flag, its value, source, and override controls. */
export function FlagsPage() {
  const { t } = useTranslation();
  const [, force] = useReducer((version: number) => version + 1, 0);

  useEffect(() => ports.featureFlags.subscribe(() => force()), []);

  if (!ports.featureFlags.canOverride()) {
    return (
      <section className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold">{t("flags.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("flags.prodDisabled")}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("flags.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("flags.description")}
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {FLAG_KEYS.map((key) => (
          <FlagRow key={key} flagKey={key} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => void ports.featureFlags.clearOverrides()}
        className="h-9 w-fit rounded-md border border-input px-4 text-sm"
      >
        {t("flags.clearAll")}
      </button>
    </section>
  );
}

function FlagRow({ flagKey }: { flagKey: FlagKey }) {
  const { t } = useTranslation();
  const definition = FLAG_REGISTRY[flagKey];
  const value = ports.featureFlags.get(flagKey);
  const source = ports.featureFlags.getSource(flagKey);
  const isBoolean = typeof value === "boolean";

  return (
    <li className="flex flex-col gap-2 rounded-md border border-input p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <code className="text-sm font-medium">{flagKey}</code>
          <span className="text-xs text-muted-foreground">
            {definition.description}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-muted px-2 py-0.5">{String(value)}</span>
          <span className="rounded bg-accent px-2 py-0.5">
            {t(SOURCE_LABEL[source])}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isBoolean ? (
          <button
            type="button"
            onClick={() => {
              void ports.featureFlags
                .setOverride(flagKey, !value as FlagValue<typeof flagKey>)
                .catch(() => undefined);
            }}
            className="h-8 rounded-md border border-input px-3 text-xs"
          >
            {t("flags.toggle")}
          </button>
        ) : (
          <select
            value={String(value)}
            onChange={(event) => {
              void ports.featureFlags
                .setOverride(
                  flagKey,
                  event.target.value as FlagValue<typeof flagKey>,
                )
                .catch(() => undefined);
            }}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
          >
            <option value="a">a</option>
            <option value="b">b</option>
          </select>
        )}

        {source === "override" && (
          <button
            type="button"
            onClick={() => void ports.featureFlags.clearOverride(flagKey)}
            className="h-8 rounded-md border border-input px-3 text-xs"
          >
            {t("flags.clear")}
          </button>
        )}
      </div>
    </li>
  );
}
