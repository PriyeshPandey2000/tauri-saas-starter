#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PACKAGE = "apps/desktop/package.json";
const CARGO = "apps/desktop/src-tauri/Cargo.toml";
const TAURI = "apps/desktop/src-tauri/tauri.conf.json";

function versions() {
  const pkg = JSON.parse(readFileSync(PACKAGE, "utf8")).version;
  const cargo = readFileSync(CARGO, "utf8").match(
    /\[package\][\s\S]*?version = "([^"]+)"/,
  )?.[1];
  const tauri = JSON.parse(readFileSync(TAURI, "utf8")).version;
  return { pkg, cargo, tauri };
}

function check() {
  const { pkg, cargo, tauri } = versions();
  if (!pkg || pkg !== cargo || pkg !== tauri) {
    console.error(`Version mismatch: package=${pkg} cargo=${cargo} tauri=${tauri}`);
    process.exit(1);
  }
  console.log(`Versions in sync: ${pkg}`);
}

function bump(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
    console.error("Usage: node scripts/version.mjs bump <major.minor.patch>");
    process.exit(1);
  }
  const pkg = JSON.parse(readFileSync(PACKAGE, "utf8"));
  pkg.version = version;
  writeFileSync(PACKAGE, JSON.stringify(pkg, null, 2) + "\n");
  writeFileSync(
    CARGO,
    readFileSync(CARGO, "utf8").replace(
      /(\[package\][\s\S]*?version = ")[^"]+(")/,
      `$1${version}$2`,
    ),
  );
  const tauri = JSON.parse(readFileSync(TAURI, "utf8"));
  tauri.version = version;
  writeFileSync(TAURI, JSON.stringify(tauri, null, 2) + "\n");
  check();
}

function suggest() {
  let range = "HEAD";
  try {
    const tag = execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      encoding: "utf8",
    }).trim();
    range = `${tag}..HEAD`;
  } catch {
    // no tags yet
  }
  const log = execFileSync("git", ["log", "--format=%s", range], {
    encoding: "utf8",
  });
  const current = versions().pkg.split(".").map(Number);
  const major = log.split("\n").some((line) => /^\w+(\(.+\))?!:/.test(line));
  const minor = /^feat(\(.+\))?:/m.test(log);
  const next = major
    ? [current[0] + 1, 0, 0]
    : minor
      ? [current[0], current[1] + 1, 0]
      : [current[0], current[1], current[2] + 1];
  console.log(next.join("."));
}

const [command, argument] = process.argv.slice(2);
if (command === "check") check();
else if (command === "bump") bump(argument);
else if (command === "suggest") suggest();
else {
  console.error("Usage: version.mjs check|suggest|bump <version>");
  process.exit(1);
}
