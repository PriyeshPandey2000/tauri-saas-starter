const SECRET_KEY_FRAGMENTS = ["token", "password", "authorization", "secret"];
const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

/**
 * Replace the value of any key named like a credential, recursively, before the
 * context is logged. Object graphs with cycles are cut at the repeated node.
 */
export function redactContext(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return CIRCULAR;
  }
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactContext(item, seen));
  }
  if (value instanceof Map) {
    const entries: Record<string, unknown> = {};
    for (const [key, entry] of value) {
      const name = String(key);
      entries[name] = isSecretKey(name) ? REDACTED : redactContext(entry, seen);
    }
    return entries;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = isSecretKey(key) ? REDACTED : redactContext(entry, seen);
  }
  return result;
}
