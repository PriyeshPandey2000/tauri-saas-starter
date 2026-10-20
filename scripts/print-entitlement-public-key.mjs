#!/usr/bin/env node
import { createPrivateKey, createPublicKey } from "node:crypto";

const encoded = process.argv[2] ?? process.env.ENTITLEMENT_SIGNING_KEY;
const kid = process.argv[3] ?? process.env.ENTITLEMENT_SIGNING_KID ?? "k1";

if (!encoded) {
  console.error(
    "Usage: node scripts/print-entitlement-public-key.mjs <base64-pkcs8-key> [kid]",
  );
  process.exit(1);
}

try {
  const privateKey = createPrivateKey({
    key: Buffer.from(encoded, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const jwk = createPublicKey(privateKey).export({ format: "jwk" });
  console.log(JSON.stringify([{ kid, jwk }], null, 2));
} catch (error) {
  console.error(
    `Could not read the key: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
