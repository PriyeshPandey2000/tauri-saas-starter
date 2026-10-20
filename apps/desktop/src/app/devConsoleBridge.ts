import { isTauri } from "@tauri-apps/api/core";

type Level = "info" | "warn" | "error";

function send(level: Level, message: string): void {
  void fetch("/__webview-log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ level, message }),
  }).catch(() => undefined);
}

/**
 * Dev only: forwards the webview console to the Vite terminal so `tauri dev`
 * startup proofs can show permission errors and unhandled rejections.
 */
export function installDevConsoleBridge(): void {
  if (!import.meta.env.DEV || !isTauri()) {
    return;
  }
  for (const level of ["info", "warn", "error"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      send(
        level,
        args
          .map((value) => {
            if (value instanceof Error) return value.message;
            return typeof value === "string" ? value : JSON.stringify(value);
          })
          .join(" "),
      );
    };
  }
  window.addEventListener("error", (event) => {
    send("error", `window.onerror ${event.message}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    send(
      "error",
      `unhandledrejection ${String(event.reason instanceof Error ? event.reason.message : event.reason)}`,
    );
  });
}
