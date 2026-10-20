#!/usr/bin/env node
import { readFileSync } from "node:fs";

const allow = JSON.parse(
  readFileSync(".github/prerelease-allowlist.json", "utf8"),
);
const allowed = new Set(allow.map((entry) => `${entry.name}@${entry.version}`));
const hits = [];

const pnpm = readFileSync("pnpm-lock.yaml", "utf8");
for (const match of pnpm.matchAll(/^  '?(@?[^\s':]+)@([^':]+)'?:$/gm)) {
  const name = match[1];
  const version = match[2];
  if (version.includes("-") && /-(alpha|beta|rc|next|canary)/i.test(version)) {
    if (!allowed.has(`${name}@${version}`)) {
      hits.push(`${name}@${version}`);
    }
  }
}

const cargo = readFileSync("apps/desktop/src-tauri/Cargo.lock", "utf8");
const blocks = cargo.split("[[package]]");
for (const block of blocks) {
  const name = block.match(/name = "([^"]+)"/)?.[1];
  const version = block.match(/version = "([^"]+)"/)?.[1];
  if (
    name &&
    version &&
    /-(alpha|beta|rc|next|canary)/i.test(version) &&
    !allowed.has(`${name}@${version}`)
  ) {
    hits.push(`${name}@${version}`);
  }
}

if (hits.length > 0) {
  console.error("Unapproved pre-release dependencies:");
  for (const hit of new Set(hits)) console.error(`  ${hit}`);
  process.exit(1);
}
console.log("Pre-release scan ok (only documented exceptions allowed)");
