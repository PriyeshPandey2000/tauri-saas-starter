import { isTauri } from "@tauri-apps/api/core";

import { consoleLogger } from "./adapters/console-logger";
import { fileLogger } from "./adapters/file-logger";
import type { LoggerPort } from "./LoggerPort";

export type { LogContext, LoggerPort } from "./LoggerPort";

/** Dev and non-Tauri runs log to the console; packaged builds write the log file. */
export const logger: LoggerPort =
  import.meta.env.DEV || !isTauri() ? consoleLogger : fileLogger;
