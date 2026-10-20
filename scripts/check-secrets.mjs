#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const patterns = [
  { name: "posthog key", regex: /\bphc_[A-Za-z0-9]{20,}\b/ },
  { name: "dodo key", regex: /\b(?:dodo|sk_live|sk_test)_[A-Za-z0-9]{16,}\b/ },
  { name: "webhook secret", regex: /\bwhsec_[A-Za-z0-9+/=]{16,}\b/ },
  { name: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "assigned secret", regex: /(?:API_KEY|WEBHOOK_KEY|CLIENT_SECRET)=[A-Za-z0-9]{16,}/ },
];

const diff = execFileSync(
  "git",
  ["diff", "--cached", "--unified=0", "--", ".", ":!pnpm-lock.yaml"],
  { encoding: "utf8" },
);

const added = diff
  .split("\n")
  .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
  .map((line) => line.slice(1));

const hits = [];
for (const line of added) {
  for (const { name, regex } of patterns) {
    if (regex.test(line)) {
      hits.push(`${name}: ${line.trim().slice(0, 120)}`);
    }
  }
}

if (hits.length > 0) {
  console.error("Refusing to commit key-shaped values:");
  for (const hit of hits) {
    console.error(`  ${hit}`);
  }
  process.exit(1);
}
