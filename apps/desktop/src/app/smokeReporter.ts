import { commands } from "@/shared/ipc/bindings";

/** Collects webview errors only when the app was launched with --smoke-test. */
export function installSmokeReporter(): void {
  void commands
    .smokeRequested()
    .then((requested) => {
      if (!requested) return;
      const errors: string[] = [];
      window.addEventListener("error", (event) => {
        errors.push(String(event.message));
      });
      window.addEventListener("unhandledrejection", (event) => {
        errors.push(String(event.reason));
      });
      window.setTimeout(() => {
        void commands.smokeReport(
          errors.length,
          document.visibilityState === "visible",
          errors.slice(0, 5),
        );
      }, 2_500);
    })
    .catch(() => undefined);
}
