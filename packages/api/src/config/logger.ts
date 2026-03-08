import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.debugMode ? "debug" : "info",
  transport: env.isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  base: { service: "str-renovator-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
