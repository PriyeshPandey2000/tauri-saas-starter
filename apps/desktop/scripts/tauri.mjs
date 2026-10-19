import { spawn } from "node:child_process";
import { loadEnv } from "vite";

const command = process.argv[2] ?? "dev";
const mode = command === "dev" ? "development" : "production";
const env = loadEnv(mode, process.cwd(), "");

const apiUrl = env.VITE_API_URL;
if (!apiUrl) {
  console.error("VITE_API_URL is required to generate the CSP");
  process.exit(1);
}

let apiOrigin;
try {
  apiOrigin = new URL(apiUrl).origin;
} catch {
  console.error(`VITE_API_URL is not a valid URL: ${apiUrl}`);
  process.exit(1);
}

const connectSrc = ["'self'", apiOrigin];
if (command === "dev") {
  connectSrc.push("http://localhost:1420", "ws://localhost:1420");
}

const csp = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  `connect-src ${connectSrc.join(" ")}`,
].join("; ");

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
