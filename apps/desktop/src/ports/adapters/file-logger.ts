import { debug, error, info, warn } from "@tauri-apps/plugin-log";

import type { LogContext, LoggerPort } from "../LoggerPort";
import { redactContext } from "./redact";

type Level = "debug" | "info" | "warn" | "error";

const pluginCalls = { debug, info, warn, error };

function format(message: string, context?: LogContext): string {
  if (context === undefined) {
    return message;
  }
  try {
    return `${message} ${JSON.stringify(redactContext(context))}`;
  } catch {
    return `${message} [unserializable context]`;
  }
}

function emit(level: Level, message: string, context?: LogContext): void {
  const line = format(message, context);
  void pluginCalls[level](line).catch((cause: unknown) => {
    // Never log this through the logger: a denied capability would loop
    // unhandledrejection -> log -> reject forever.
    console[level](`[log fallback] ${line}`, cause);
  });
}

/** Rotating file adapter backed by `tauri-plugin-log`. */
export const fileLogger: LoggerPort = {
  debug(message, context) {
    emit("debug", message, context);
  },
  info(message, context) {
    emit("info", message, context);
  },
  warn(message, context) {
    emit("warn", message, context);
  },
  error(message, context) {
    emit("error", message, context);
  },
};
