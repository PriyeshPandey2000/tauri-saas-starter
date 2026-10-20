#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root =
  process.argv[2] ??
  fileURLToPath(new URL("../apps/desktop/dist", import.meta.url));
const patterns = [/DODO/, /whsec_/, /\bphc_[A-Za-z0-9]{8,}\b/, /sk_live_/];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        console.error(`Secret-shaped value in built asset: ${path}`);
        process.exit(1);
      }
    }
  }
}

try {
  walk(root);
  console.log("No billing secrets in the desktop bundle");
} catch (error) {
  console.error(
    `Could not scan ${root}: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
