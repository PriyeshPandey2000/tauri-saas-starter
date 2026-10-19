import { debug, error, info, warn } from "@tauri-apps/plugin-log";

import type { LogContext, LoggerPort } from "../LoggerPort";
import { redactContext } from "./redact";

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

/** Rotating file adapter backed by `tauri-plugin-log`. */
export const fileLogger: LoggerPort = {
  debug(message, context) {
    void debug(format(message, context));
  },
  info(message, context) {
    void info(format(message, context));
  },
  warn(message, context) {
    void warn(format(message, context));
  },
  error(message, context) {
    void error(format(message, context));
  },
};
