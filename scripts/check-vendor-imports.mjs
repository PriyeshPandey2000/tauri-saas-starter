#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const VENDOR_PATTERNS = [
  /^@sentry\//,
  /^posthog-/,
  /^better-auth$/,
  /^@better-auth\//,
];

const WORKSPACE_ROOTS = ["apps", "packages"];
const ALLOWED_SEGMENT = `${sep}ports${sep}adapters${sep}`;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SPECIFIER_PATTERNS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
];

function isVendor(specifier) {
  return VENDOR_PATTERNS.some((pattern) => pattern.test(specifier));
}

function isAdapterPath(filePath) {
  return filePath.includes(ALLOWED_SEGMENT);
}

function walk(dir) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (SOURCE_EXTENSIONS.has(extname(full))) {
      files.push(full);
    }
  }
  return files;
}

function collectSourceDirs() {
  const dirs = [];
  for (const root of WORKSPACE_ROOTS) {
    let entries;
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const src = join(root, entry, "src");
      try {
        if (statSync(src).isDirectory()) dirs.push(src);
      } catch {
        // no src directory
      }
    }
  }
  return dirs;
}

function extractSpecifiers(content) {
  const specifiers = new Set();
  for (const pattern of SPECIFIER_PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      specifiers.add(match[1]);
    }
  }
  return specifiers;
}

const violations = [];
for (const dir of collectSourceDirs()) {
  for (const file of walk(dir)) {
    if (file.includes(ALLOWED_SEGMENT)) continue;
    const content = readFileSync(file, "utf8");
    for (const specifier of extractSpecifiers(content)) {
      if (VENDOR_PATTERNS.some((pattern) => pattern.test(specifier))) {
        violations.push({ file: relative(".", file), specifier });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Vendor SDK imported outside ports/adapters/:");
  for (const { file, specifier } of violations) {
    console.error(`  ${file}: ${specifier}`);
  }
  process.exit(1);
}

console.log("check-vendor-imports: OK (no vendor SDK imports outside ports/adapters)");
