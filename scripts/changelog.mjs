#!/usr/bin/env node
import { execFileSync } from "node:child_process";

let range = "HEAD";
try {
  const tag = execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
    encoding: "utf8",
  }).trim();
  range = `${tag}..HEAD`;
} catch {
  // first release
}
const lines = execFileSync(
  "git",
  ["log", "--format=%s", range],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

const groups = { feat: [], fix: [], perf: [], refactor: [], docs: [], other: [] };
for (const line of lines) {
  const match = line.match(/^(\w+)(?:\([^)]*\))?(!)?:\s*(.*)$/);
  if (!match) {
    groups.other.push(line);
    continue;
  }
  const [, type, , subject] = match;
  (groups[type] ?? groups.other).push(subject);
}

const titles = {
  feat: "Features",
  fix: "Bug fixes",
  perf: "Performance",
  refactor: "Refactors",
  docs: "Documentation",
  other: "Other",
};
const out = ["# Changelog", ""];
for (const [type, title] of Object.entries(titles)) {
  if (groups[type].length === 0) continue;
  out.push(`## ${title}`, "", ...groups[type].map((item) => `- ${item}`), "");
}
process.stdout.write(out.join("\n"));
