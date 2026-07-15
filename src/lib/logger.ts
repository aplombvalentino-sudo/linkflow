// Minimal structured logger. Emits one JSON line per event so server logs are
// greppable/queryable. Callers must keep `context` free of secrets — never pass
// tokens, private keys, or raw credentials through here.

type Ctx = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: string, ctx?: Ctx) {
  const line = JSON.stringify({ level, event, ...ctx, ts: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, ctx?: Ctx) => emit("info", event, ctx),
  warn: (event: string, ctx?: Ctx) => emit("warn", event, ctx),
  error: (event: string, ctx?: Ctx) => emit("error", event, ctx),
};
