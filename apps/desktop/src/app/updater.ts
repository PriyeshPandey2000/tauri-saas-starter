import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { toast } from "sonner";

import { useSettingsStore } from "@/features/settings";
import i18n from "@/shared/i18n";
import { ports } from "@/ports";

const FIRST_DELAY_MS = 10_000;
const INTERVAL_MS = 6 * 60 * 60 * 1_000;

/** Beta only when the `betaUpdates` flag is on and the setting asks for it. */
export function resolveUpdateChannel(
  betaFlag: boolean,
  setting: "stable" | "beta",
): "stable" | "beta" {
  return betaFlag && setting === "beta" ? "beta" : "stable";
}

export interface UpdateCheckDeps {
  check?: typeof check;
  onError?: (error: unknown) => void;
}

export async function checkForUpdates(
  deps: UpdateCheckDeps = {},
): Promise<void> {
  const runCheck = deps.check ?? check;
  const channel = resolveUpdateChannel(
    ports.featureFlags.get("betaUpdates"),
    useSettingsStore.getState().updateChannel,
  );
  try {
    const update = await runCheck({
      headers: { "x-update-channel": channel },
    });
    if (!update) {
      return;
    }
    toast(i18n.t("native.updateAvailable", { version: update.version }), {
      description: update.body ?? undefined,
      duration: 15_000,
      action: {
        label: i18n.t("native.download"),
        onClick: () => void download(update),
      },
    });
  } catch (error) {
    (
      deps.onError ??
      ((cause) => {
        ports.errorReporter.captureException(cause, {
          tags: { source: "updater" },
        });
      })
    )(error);
  }
}

async function download(
  update: NonNullable<Awaited<ReturnType<typeof check>>>,
): Promise<void> {
  const toastId = toast.loading(i18n.t("native.downloading"));
  let downloaded = 0;
  let total = 0;
  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
        toast.loading(i18n.t("native.downloadingProgress", { percent }), {
          id: toastId,
        });
      }
    });
    toast.success(i18n.t("native.updateInstalled"), {
      id: toastId,
      duration: Infinity,
      action: {
        label: i18n.t("native.restart"),
        onClick: () => void relaunch(),
      },
    });
  } catch (error) {
    toast.error(i18n.t("native.updateFailed"), { id: toastId });
    ports.errorReporter.captureException(error, {
      tags: { source: "updater-download" },
    });
  }
}

export interface UpdateSchedulerDeps {
  checkNow?: () => Promise<void>;
  setTimeoutImpl?: typeof setTimeout;
  setIntervalImpl?: typeof setInterval;
}

/** Checks ~10 s after first paint, then every 6 h. Never blocks startup. */
export function startUpdateChecks(deps: UpdateSchedulerDeps = {}): () => void {
  const checkNow = deps.checkNow ?? (() => checkForUpdates());
  const setTimeoutImpl = deps.setTimeoutImpl ?? setTimeout;
  const setIntervalImpl = deps.setIntervalImpl ?? setInterval;
  const first = setTimeoutImpl(() => void checkNow(), FIRST_DELAY_MS);
  const interval = setIntervalImpl(() => void checkNow(), INTERVAL_MS);
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
