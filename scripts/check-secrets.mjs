#!/usr/bin/env node
import { execFileSync } from "node:child_process";

import { findSecretHits } from "./secret-patterns.mjs";

const diff = execFileSync(
  "git",
  ["diff", "--cached", "--unified=0", "--", ".", ":!pnpm-lock.yaml"],
  { encoding: "utf8" },
);

const added = diff
  .split("\n")
  .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
  .map((line) => line.slice(1));

const hits = findSecretHits(added);

if (hits.length > 0) {
  console.error("Refusing to commit key-shaped values:");
  for (const hit of hits) {
    console.error(`  ${hit}`);
  }
  process.exit(1);
}
