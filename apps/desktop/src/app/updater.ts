import { listen } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

import { useSettingsStore } from "@/features/settings";
import { ports } from "@/ports";
import i18n from "@/shared/i18n";
import { commands, type UpdateInfo } from "@/shared/ipc/bindings";

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
  isConfigured?: () => Promise<boolean>;
  checkUpdate?: (channel: string) => Promise<UpdateInfo | null>;
  onError?: (error: unknown) => void;
  onInfo?: (info: UpdateInfo) => void;
}

export async function checkForUpdates(
  deps: UpdateCheckDeps = {},
): Promise<void> {
  const isConfigured = deps.isConfigured ?? commands.updaterConfigured;
  // "Not configured" is a quiet no-op: no schedule, no report. A missing
  // Tauri host (web/E2E) is treated the same way.
  try {
    if (!(await isConfigured())) {
      return;
    }
  } catch {
    return;
  }
  const channel = resolveUpdateChannel(
    ports.featureFlags.get("betaUpdates"),
    useSettingsStore.getState().updateChannel,
  );
  const checkUpdate =
    deps.checkUpdate ??
    (async (selected: string) => {
      const result = await commands.checkUpdate(selected);
      if (result.status === "error") {
        throw new Error(result.error.message);
      }
      return result.data;
    });
  try {
    const info = await checkUpdate(channel);
    if (!info) {
      return;
    }
    (deps.onInfo ?? showUpdateToast)(info);
  } catch (error) {
    (deps.onError ?? reportUpdaterError)(error);
  }
}

function reportUpdaterError(error: unknown): void {
  ports.errorReporter.captureException(error, { tags: { source: "updater" } });
}

function showUpdateToast(info: UpdateInfo): void {
  toast(i18n.t("native.updateAvailable", { version: info.version }), {
    description: info.body ?? undefined,
    duration: 15_000,
    action: {
      label: i18n.t("native.download"),
      onClick: () => void installUpdate(),
    },
  });
}

let progressListener: Promise<unknown> | null = null;

function ensureProgressListener(): void {
  progressListener ??= listen<{
    event: "started" | "progress" | "finished";
    data?: { contentLength?: number; chunkLength?: number };
  }>("native://update-progress", (event) => {
    const payload = event.payload;
    if (payload.event === "progress" && activeToastId !== null) {
      downloaded += payload.data?.chunkLength ?? 0;
      const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
      toast.loading(i18n.t("native.downloadingProgress", { percent }), {
        id: activeToastId,
      });
    }
    if (payload.event === "started") {
      total = payload.data?.contentLength ?? 0;
    }
  });
}

let activeToastId: string | number | null = null;
let downloaded = 0;
let total = 0;

async function installUpdate(): Promise<void> {
  ensureProgressListener();
  downloaded = 0;
  total = 0;
  activeToastId = toast.loading(i18n.t("native.downloading"));
  const result = await commands.installUpdate();
  if (result.status === "error") {
    toast.error(i18n.t("native.updateFailed"), { id: activeToastId });
    activeToastId = null;
    reportUpdaterError(new Error(result.error.message));
    return;
  }
  toast.success(i18n.t("native.updateInstalled"), {
    id: activeToastId,
    duration: Infinity,
    action: {
      label: i18n.t("native.restart"),
      onClick: () => void relaunch(),
    },
  });
  activeToastId = null;
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
