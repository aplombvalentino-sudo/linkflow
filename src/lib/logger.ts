// Minimal structured logger. Emits one JSON line per event so server logs are
// greppable/queryable. Every string value is sanitized (control chars stripped +
// length-capped) so user-controlled input can't forge log lines or bloat them
// (risk #4). JSON.stringify already escapes quotes/structure; stripping control
// chars additionally prevents newline/line-break injection in line-based viewers.
import { stripControlChars, clampText } from "./sanitize";
import { MAX_LOG_STRING_LEN } from "./constants";

type Ctx = Record<string, unknown>;

function sanitizeValue(value: unknown): unknown {
  return typeof value === "string"
    ? clampText(stripControlChars(value), MAX_LOG_STRING_LEN)
    : value;
}

function emit(level: "info" | "warn" | "error", event: string, ctx?: Ctx) {
  const line = JSON.stringify(
    { level, event, ...ctx, ts: new Date().toISOString() },
    (_key, value) => sanitizeValue(value),
  );
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, ctx?: Ctx) => emit("info", event, ctx),
  warn: (event: string, ctx?: Ctx) => emit("warn", event, ctx),
  error: (event: string, ctx?: Ctx) => emit("error", event, ctx),
};
