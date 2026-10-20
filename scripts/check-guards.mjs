#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const errors = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (path.includes("__tests__") || path.endsWith("bindings.ts")) continue;
    const source = readFileSync(path, "utf8");
    if (/\binvoke\s*\(/.test(source)) errors.push(`${path}: raw invoke()`);
    if (/\beval\s*\(/.test(source)) errors.push(`${path}: eval()`);
    if (
      /features\/(auth|billing)/.test(path) &&
      /localStorage/.test(source)
    ) {
      errors.push(`${path}: localStorage in auth/billing`);
    }
  }
}
walk("apps/desktop/src");
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Guard grep ok (invoke, eval, auth/billing localStorage)");
