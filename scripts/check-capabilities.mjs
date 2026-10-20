#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "apps/desktop/src";
const CAPABILITY = "apps/desktop/src-tauri/capabilities/default.toml";

function sources(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "__tests__") continue;
      files.push(...sources(path));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

const text = sources(SRC)
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

const capabilityText = readFileSync(CAPABILITY, "utf8");
const granted = new Set(
  [...capabilityText.matchAll(/"([^"]+)"/g)].map((match) => match[1]),
);

const required = [];
const need = (permission) => required.push(permission);
const needAny = (permissions) => {
  if (!permissions.some((permission) => granted.has(permission))) {
    required.push(permissions.join(" or "));
  }
};

if (text.includes("@tauri-apps/plugin-global-shortcut")) {
  need("global-shortcut:allow-register");
  need("global-shortcut:allow-unregister");
  need("global-shortcut:allow-unregister-all");
  need("global-shortcut:allow-is-registered");
}
if (text.includes("@tauri-apps/plugin-notification")) need("notification:default");
if (text.includes("@tauri-apps/plugin-autostart")) need("autostart:default");
if (text.includes("@tauri-apps/plugin-store")) need("store:default");
if (text.includes("@tauri-apps/plugin-sql")) {
  for (const permission of [
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close",
  ]) {
    need(permission);
  }
}
if (text.includes("@tauri-apps/plugin-log")) need("log:allow-log");
if (text.includes("@tauri-apps/plugin-opener")) need("opener:default");
if (text.includes("@tauri-apps/plugin-process") && text.includes("relaunch(")) {
  need("process:allow-restart");
}
if (text.includes("@tauri-apps/plugin-deep-link")) need("deep-link:default");
if (text.includes("@tauri-apps/api/event")) needAny(["core:default", "core:event:default"]);

if (text.includes("getCurrentWindow")) {
  const windowPermissions = {
    "core:window:allow-show": /\.show\(/,
    "core:window:allow-hide": /\.hide\(/,
    "core:window:allow-is-visible": /\.isVisible\(/,
    "core:window:allow-set-focus": /\.setFocus\(/,
    "core:window:allow-set-theme": /\.setTheme\(/,
  };
  for (const [permission, pattern] of Object.entries(windowPermissions)) {
    if (pattern.test(text)) need(permission);
  }
}

const missing = [...new Set(required)].filter(
  (permission) => !granted.has(permission),
);
if (missing.length > 0) {
  console.error("Missing Tauri capabilities for frontend calls:");
  for (const permission of missing) {
    console.error(`  ${permission}`);
  }
  process.exit(1);
}
console.log(`Capability audit ok (${required.length} frontend permissions checked)`);
