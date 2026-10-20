const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BEARER = /bearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const ASSIGNMENT =
  /(password|passwd|secret|token|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;&]+/gi;
const QUERY = /\?[^\s"']*/g;
const MAC_HOME = /\/Users\/[^/\s]+/g;
const LINUX_HOME = /\/home\/[^/\s]+/g;
const WINDOWS_HOME = /C:\\Users\\[^\\\s]+/gi;

const SENSITIVE_KEYS =
  /password|passwd|secret|token|authorization|cookie|api[_-]?key|apikey|email|install_?id/i;

/** Scrub free text: emails, credentials, query strings and home paths. */
export function scrubText(input: string): string {
  return input
    .replace(EMAIL, "[email]")
    .replace(BEARER, "Bearer [Filtered]")
    .replace(ASSIGNMENT, "$1=[Filtered]")
    .replace(QUERY, "?[Filtered]")
    .replace(MAC_HOME, "/Users/[user]")
    .replace(LINUX_HOME, "/home/[user]")
    .replace(WINDOWS_HOME, "C:\\Users\\[user]");
}

/** Recursively scrub arbitrary JSON-like values. */
export function scrubValue(value: unknown, keyHint = ""): unknown {
  if (SENSITIVE_KEYS.test(keyHint)) {
    return "[Filtered]";
  }
  if (typeof value === "string") {
    return scrubText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }
  if (value && typeof value === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      clean[key] = scrubValue(child, key);
    }
    return clean;
  }
  return value;
}

type ScrubbableEvent = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Sentry `beforeSend` scrubber. Keeps only an opaque user id. */
export function scrubSentryEvent(event: ScrubbableEvent): ScrubbableEvent {
  delete event.server_name;

  const user = asRecord(event.user);
  if (user) {
    event.user = typeof user.id === "string" ? { id: user.id } : null;
  }

  const request = asRecord(event.request);
  if (request) {
    event.request = {
      method: request.method,
      url: typeof request.url === "string" ? scrubText(request.url) : undefined,
    };
  }

  if (typeof event.message === "string") {
    event.message = scrubText(event.message);
  }
  if (typeof event.transaction === "string") {
    event.transaction = scrubText(event.transaction);
  }
  if (typeof event.culprit === "string") {
    event.culprit = scrubText(event.culprit);
  }
  if (event.extra) {
    event.extra = scrubValue(event.extra);
  }
  if (event.contexts) {
    event.contexts = scrubValue(event.contexts);
  }
  if (event.tags) {
    event.tags = scrubValue(event.tags);
  }
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      const record = asRecord(breadcrumb);
      if (!record) {
        return breadcrumb;
      }
      return {
        ...record,
        message:
          typeof record.message === "string"
            ? scrubText(record.message)
            : record.message,
        data: record.data ? scrubValue(record.data) : record.data,
      };
    });
  }

  const exception = asRecord(event.exception);
  if (exception && Array.isArray(exception.values)) {
    exception.values = exception.values.map((value) => {
      const record = asRecord(value);
      return record && typeof record.value === "string"
        ? { ...record, value: scrubText(record.value) }
        : value;
    });
  }

  return event;
}
