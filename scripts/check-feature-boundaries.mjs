#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = "apps/desktop/src";
const featuresDir = join(root, "features");
const errors = [];

for (const feature of readdirSync(featuresDir)) {
  const dir = join(featuresDir, feature);
  if (!statSync(dir).isDirectory()) continue;
  try {
    statSync(join(dir, "index.ts"));
  } catch {
    errors.push(`features/${feature} has no index.ts`);
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || path.includes("__tests__")) continue;
    const source = readFileSync(path, "utf8");
    const relative = path.slice(root.length + 1);
    const outsideApp =
      !relative.startsWith("app/") && !relative.startsWith("routes/");
    for (const match of source.matchAll(/from\s+"@\/features\/([^"]+)"/g)) {
      const target = match[1];
      if (outsideApp && target.split("/").length > 1) {
        errors.push(`${relative} deep-imports features/${target}`);
      }
    }
    if (relative.startsWith("features/")) {
      const current = relative.split("/")[1];
      for (const match of source.matchAll(/from\s+"@\/features\/([^"/]+)/g)) {
        if (match[1] !== current) {
          errors.push(`${relative} imports another feature (${match[1]})`);
        }
      }
    }
  }
}
walk(root);

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Feature boundary check ok");
