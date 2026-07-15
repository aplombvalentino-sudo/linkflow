// Risk #4 — logger sanitizes user-controlled input: strips control chars, caps
// length, and always emits a single parseable JSON line (no log forgery).
import { describe, it, expect, vi } from "vitest";
import { logger } from "@/lib/logger";
import { MAX_LOG_STRING_LEN } from "@/lib/constants";

const NL = String.fromCharCode(10);
const TAB = String.fromCharCode(9);
const BELL = String.fromCharCode(7);

describe("logger sanitization (risk #4)", () => {
  it("strips control chars and stays a single parseable JSON line", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("evt", { message: "a" + NL + "b" + TAB + "c" + BELL + "d" });
    const out = spy.mock.calls[0][0] as string;

    // one physical line — no injected line breaks
    expect(out.split(NL)).toHaveLength(1);
    const parsed = JSON.parse(out);
    expect(parsed.message).toBe("abcd");
    expect(parsed.event).toBe("evt");
    spy.mockRestore();
  });

  it("prevents forged log structure via newline + fake JSON", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("evt", { message: NL + '{"level":"admin","event":"forged"}' });
    const out = spy.mock.calls[0][0] as string;
    expect(out.split(NL)).toHaveLength(1);
    const parsed = JSON.parse(out);
    // the whole thing stayed inside the string value; level/event are untampered
    expect(parsed.level).toBe("warn");
    expect(parsed.event).toBe("evt");
    expect(parsed.message).toContain("forged"); // preserved as data, not structure
    spy.mockRestore();
  });

  it("caps oversized string values", () => {
    // logger.info writes via console.log
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("evt", { big: "x".repeat(MAX_LOG_STRING_LEN + 500) });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.big.length).toBe(MAX_LOG_STRING_LEN);
    spy.mockRestore();
  });
});

describe("logger sanitizes the `event` parameter itself (risk #3)", () => {
  it("strips control chars from a forged event string and stays one JSON line", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // simulates an event string built (however indirectly) from attacker input
    const forgedEvent = "real_event" + NL + '{"level":"admin","injected":true}';
    logger.error(forgedEvent, {});
    const out = spy.mock.calls[0][0] as string;

    expect(out.split(NL)).toHaveLength(1);
    const parsed = JSON.parse(out);
    expect(parsed.event).not.toContain(NL);
    expect(parsed.injected).toBeUndefined(); // never escaped into a sibling key
    expect(parsed.level).toBe("error"); // untampered by the injected event text
    spy.mockRestore();
  });

  it("caps an oversized event string", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("x".repeat(MAX_LOG_STRING_LEN + 500));
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.event.length).toBe(MAX_LOG_STRING_LEN);
    spy.mockRestore();
  });
});
