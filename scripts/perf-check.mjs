#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const budgets = JSON.parse(readFileSync("perf-budgets.json", "utf8"));
const baseline = JSON.parse(readFileSync("perf-baseline.json", "utf8"));
const dist = "apps/desktop/dist/assets";
const smokeLog = process.env.SMOKE_LOG ?? "perf-smoke.log";

function mainChunk() {
  const files = readdirSync(dist)
    .filter((file) => /^index-.*\.js$/.test(file))
    .map((file) => join(dist, file))
    .sort((a, b) => statSync(b).size - statSync(a).size);
  return files[0];
}

const chunk = mainChunk();
const mainJsGzipKb = chunk
  ? gzipSync(readFileSync(chunk)).length / 1024
  : 0;

let installerMb = 0;
for (const candidate of [
  "apps/desktop/src-tauri/target/release/bundle/macos",
  "apps/desktop/src-tauri/target/release/bundle/dmg",
]) {
  if (!existsSync(candidate)) continue;
  for (const entry of readdirSync(candidate)) {
    const path = join(candidate, entry);
    if (statSync(path).isFile()) {
      installerMb = Math.max(installerMb, statSync(path).size / 1024 / 1024);
    }
  }
}

let timeToWindowShownMs = 0;
let idleMemoryMb = 0;
if (existsSync(smokeLog)) {
  const log = readFileSync(smokeLog, "utf8");
  timeToWindowShownMs =
    Number(log.match(/\[smoke\] window shown after (\d+)ms/)?.[1] ?? 0);
  idleMemoryMb =
    Number(log.match(/\[smoke\] rss_kb=(\d+)/)?.[1] ?? 0) / 1024;
}

// Sizes are machine independent, so they are compared with the committed
// baseline. Startup time and memory depend on the hardware (a warm laptop vs a
// cold CI runner), so they are only held to the absolute budgets.
const rows = [
  ["main JS gzip", mainJsGzipKb, "kB", budgets.mainJsGzipKb, baseline.mainJsGzipKb],
  ["installer", installerMb, "MB", budgets.installerMb, baseline.installerMb],
  ["window shown", timeToWindowShownMs, "ms", budgets.timeToWindowShownMs, 0],
  ["idle memory", idleMemoryMb, "MB", budgets.idleMemoryMb, 0],
];
const allowedGrowth = 1 + (budgets.regressionPercent ?? 10) / 100;

let failed = false;
console.log("| Metric | Measured | Budget | Status |");
console.log("| --- | --- | --- | --- |");
for (const [name, measured, unit, budget, base] of rows) {
  let status = "ok";
  if (measured <= 0) {
    // Nothing to measure in this job (e.g. no installer is built for the smoke run).
    console.log(`| ${name} | not measured | ${budget} ${unit} | skipped |`);
    continue;
  }
  if (measured > budget) {
    status = "BUDGET BREACH";
    failed = true;
  } else if (base > 0 && measured > base * allowedGrowth) {
    status = `REGRESSION >${budgets.regressionPercent ?? 10}%`;
    failed = true;
  }
  console.log(
    `| ${name} | ${measured.toFixed(2)} ${unit} | ${budget} ${unit} | ${status} |`,
  );
}
if (failed) process.exit(1);
