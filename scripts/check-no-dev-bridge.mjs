#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "apps/desktop/dist";
const forbidden = ["__webview-log", "webview-console-bridge"];
const hits = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const needle of forbidden) {
      if (text.includes(needle)) hits.push(`${path}: ${needle}`);
    }
  }
}
try {
  walk(root);
} catch (error) {
  console.error(`Could not scan ${root}: ${error.message}`);
  process.exit(1);
}
if (hits.length > 0) {
  console.error("Dev-only console bridge found in built assets:");
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}
console.log("No dev-only console bridge in built assets");
