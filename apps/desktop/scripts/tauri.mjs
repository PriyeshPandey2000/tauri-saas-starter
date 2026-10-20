import { spawn } from "node:child_process";
import { loadEnv } from "vite";

import { buildCsp } from "./csp.mjs";

const command = process.argv[2] ?? "dev";
const mode = command === "dev" ? "development" : "production";
const env = loadEnv(mode, process.cwd(), "");

const apiUrl = env.VITE_API_URL;
if (!apiUrl) {
  console.error("VITE_API_URL is required to generate the CSP");
  process.exit(1);
}

let csp;
try {
  csp = buildCsp({
    apiUrl,
    posthogKey: env.VITE_POSTHOG_KEY,
    posthogHost: env.VITE_POSTHOG_HOST,
    isDev: command === "dev",
  });
} catch {
  console.error(`VITE_API_URL is not a valid URL: ${apiUrl}`);
  process.exit(1);
}

const config = JSON.stringify({ app: { security: { csp } } });
const child = spawn(
  "tauri",
  [command, ...process.argv.slice(3), "--config", config],
  { stdio: "inherit", shell: process.platform === "win32" },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
