import type { LogContext, LoggerPort } from "../LoggerPort";
import { redactContext } from "./redact";

function details(context?: LogContext): unknown[] {
  return context === undefined ? [] : [redactContext(context)];
}

/** Development adapter: writes to the browser/WebView console. */
export const consoleLogger: LoggerPort = {
  debug(message, context) {
    console.debug(message, ...details(context));
  },
  info(message, context) {
    console.info(message, ...details(context));
  },
  warn(message, context) {
    console.warn(message, ...details(context));
  },
  error(message, context) {
    console.error(message, ...details(context));
  },
};
