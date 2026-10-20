const PLACEHOLDERS =
  /^(?:password|pass|app|user|example|changeme|change-me|xxx+|dummy|placeholder)$/i;

export const secretPatterns = [
  { name: "posthog key", regex: /\bphc_[A-Za-z0-9]{20,}\b/ },
  { name: "dodo key", regex: /\b(?:dodo|sk_live|sk_test)_[A-Za-z0-9]{16,}\b/ },
  { name: "webhook secret", regex: /\bwhsec_[A-Za-z0-9+/=]{16,}\b/ },
  {
    name: "private key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "entitlement signing key",
    regex: /ENTITLEMENT_SIGNING_KEY=[A-Za-z0-9+/]{32,}={0,2}/,
  },
  {
    name: "better auth secret",
    regex: /BETTER_AUTH_SECRET=[A-Za-z0-9+/]{24,}={0,2}/,
  },
  {
    name: "sentry auth token",
    regex: /\bsntry[a-z]?_[A-Za-z0-9]{16,}\b/,
  },
  {
    name: "sentry dsn",
    regex: /SENTRY_DSN=https:\/\/[^\s"']*@[^\s"']*ingest[^\s"']*/,
  },
];

/** Database URLs with a real embedded password (placeholders excluded). */
export function findDatabaseUrlSecrets(line) {
  const match = line.match(/DATABASE_URL(?:_DIRECT)?=[^\s"']+/);
  if (!match) {
    return false;
  }
  const url = line.split("=")[1] ?? "";
  const credentials = url.match(/:\/\/([^:/@\s]+):([^@\s]+)@/);
  if (!credentials) {
    return false;
  }
  const password = decodeURIComponent(credentials[2] ?? "");
  return password.length >= 8 && !PLACEHOLDERS.test(password);
}

/** Return one line per detected key-shaped value. */
export function findSecretHits(lines) {
  const hits = [];
  for (const line of lines) {
    for (const { name, regex } of secretPatterns) {
      if (regex.test(line)) {
        hits.push(`${name}: ${line.trim().slice(0, 120)}`);
      }
    }
    if (findDatabaseUrlSecrets(line)) {
      hits.push(`database password: ${line.trim().slice(0, 120)}`);
    }
  }
  return hits;
}
