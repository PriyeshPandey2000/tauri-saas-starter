#!/usr/bin/env node
/** Scan every git-tracked file for key-shaped values (CI secret scan). */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { findSecretHits } from "./secret-patterns.mjs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((file) => file && file !== "pnpm-lock.yaml");

const suspiciousNames = files.filter((file) =>
  /(\.env|\.pem|\.key|secret)/i.test(file),
);
if (suspiciousNames.length > 0) {
  console.warn("Tracked files with secret-like names (review manually):");
  for (const file of suspiciousNames) {
    console.warn(`  ${file}`);
  }
}

const hits = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const hit of findSecretHits(text.split("\n"))) {
    hits.push(`${file}: ${hit}`);
  }
}

if (hits.length > 0) {
  console.error("Secret-shaped values in tracked files:");
  for (const hit of hits) {
    console.error(`  ${hit}`);
  }
  process.exit(1);
}
console.log(`Secret scan clean (${files.length} tracked files).`);
