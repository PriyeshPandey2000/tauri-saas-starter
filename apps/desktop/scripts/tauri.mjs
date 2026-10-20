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
    sentryDsn: env.VITE_SENTRY_DSN,
    updaterEndpoint: env.VITE_UPDATER_ENDPOINT,
    updaterBetaEndpoint: env.VITE_UPDATER_ENDPOINT_BETA,
    isDev: command === "dev",
  });
} catch {
  console.error(`VITE_API_URL is not a valid URL: ${apiUrl}`);
  process.exit(1);
}

const merged = { app: { security: { csp } } };
const updaterEndpoint = env.VITE_UPDATER_ENDPOINT;
const updaterPublicKey = env.TAURI_UPDATER_PUBLIC_KEY;
if (updaterEndpoint && updaterPublicKey) {
  const endpoints = [updaterEndpoint];
  if (env.VITE_UPDATER_ENDPOINT_BETA) {
    endpoints.push(env.VITE_UPDATER_ENDPOINT_BETA);
  }
  merged.plugins = {
    updater: { endpoints, pubkey: updaterPublicKey },
  };
  console.log(
    `Updater config injected (${endpoints.length} feed${endpoints.length > 1 ? "s" : ""}, public key present)`,
  );
}
const config = JSON.stringify(merged);
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
