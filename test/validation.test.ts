// Risks #6 (days clamp) + #7 (event input validation).
import { describe, it, expect } from "vitest";
import {
  validateEventInput,
  assertDevice,
  assertId,
  assertVisitorHash,
  normalizeReferrer,
  assertHandle,
  clampStatsDays,
  assertDisplayName,
  assertBio,
  assertTheme,
  assertIsPublished,
  handleValidationError,
} from "@/lib/validation";
import { ValidationError } from "@/lib/errors";
import {
  MAX_STATS_DAYS,
  MIN_STATS_DAYS,
  MAX_DISPLAY_NAME_LEN,
  MAX_BIO_LEN,
  THEMES,
} from "@/lib/constants";

describe("event input validation (risk #7)", () => {
  it("accepts and normalizes a valid event", () => {
    const out = validateEventInput("p1", "https://x.com", "mobile", "abc");
    expect(out).toEqual({
      profileId: "p1",
      referrer: "https://x.com",
      device: "mobile",
      visitorHash: "abc",
    });
  });

  it("rejects an unknown device", () => {
    expect(() => assertDevice("watch")).toThrow(ValidationError);
    expect(() => validateEventInput("p1", null, "watch", "abc")).toThrow(ValidationError);
  });

  it("rejects empty and oversized ids", () => {
    expect(() => assertId("", "profileId")).toThrow(ValidationError);
    expect(() => assertId("x".repeat(200), "profileId")).toThrow(ValidationError);
  });

  it("rejects empty/oversized visitorHash", () => {
    expect(() => assertVisitorHash("")).toThrow(ValidationError);
    expect(() => assertVisitorHash("x".repeat(1000))).toThrow(ValidationError);
  });

  it("normalizes referrer: null passthrough + length cap", () => {
    expect(normalizeReferrer(null)).toBeNull();
    expect(normalizeReferrer("")).toBeNull();
    expect(normalizeReferrer("x".repeat(1000))!.length).toBe(512);
  });
});

describe("handle validation", () => {
  it("lowercases valid handles", () => {
    expect(assertHandle("Maera.Fit")).toBe("maera.fit");
  });
  it("rejects reserved handles", () => {
    expect(() => assertHandle("admin")).toThrow(ValidationError);
    expect(() => assertHandle("dashboard")).toThrow(ValidationError);
  });
  it("rejects malformed handles", () => {
    expect(() => assertHandle("a")).toThrow(ValidationError); // too short
    expect(() => assertHandle("bad handle")).toThrow(ValidationError); // space
    expect(() => assertHandle("-lead")).toThrow(ValidationError); // leading punct
  });
});

describe("clampStatsDays (risk #6)", () => {
  it("passes normal windows through", () => {
    expect(clampStatsDays(7)).toBe(7);
    expect(clampStatsDays(30)).toBe(30);
  });
  it("clamps out-of-range and non-finite values", () => {
    expect(clampStatsDays(9999)).toBe(MAX_STATS_DAYS);
    expect(clampStatsDays(0)).toBe(MIN_STATS_DAYS);
    expect(clampStatsDays(-5)).toBe(MIN_STATS_DAYS);
    expect(clampStatsDays(NaN)).toBe(MIN_STATS_DAYS);
    expect(clampStatsDays(3.9)).toBe(3);
  });
});

describe("profile text validation (risk #3)", () => {
  const NL = String.fromCharCode(10);

  it("coerces missing values to empty string", () => {
    expect(assertDisplayName(undefined)).toBe("");
    expect(assertBio(null)).toBe("");
  });

  it("strips control chars and trims", () => {
    expect(assertDisplayName("  Maera" + NL + "Kade  ")).toBe("MaeraKade");
  });

  it("rejects non-string input", () => {
    expect(() => assertDisplayName(42)).toThrow(ValidationError);
    expect(() => assertBio({})).toThrow(ValidationError);
  });

  it("rejects over-length display name and bio", () => {
    expect(() => assertDisplayName("x".repeat(MAX_DISPLAY_NAME_LEN + 1))).toThrow(
      ValidationError,
    );
    expect(() => assertBio("x".repeat(MAX_BIO_LEN + 1))).toThrow(ValidationError);
  });

  it("accepts values at the limit", () => {
    expect(assertDisplayName("x".repeat(MAX_DISPLAY_NAME_LEN)).length).toBe(
      MAX_DISPLAY_NAME_LEN,
    );
    expect(assertBio("x".repeat(MAX_BIO_LEN)).length).toBe(MAX_BIO_LEN);
  });
});

describe("assertTheme / assertIsPublished (risk #2)", () => {
  it("falls back to the given default when omitted, preserving today's behavior", () => {
    expect(assertTheme(undefined, "volt")).toBe("volt");
    expect(assertTheme(null, "volt")).toBe("volt");
    expect(assertIsPublished(undefined, true)).toBe(true);
    expect(assertIsPublished(null, true)).toBe(true);
  });

  it("accepts any known theme", () => {
    for (const t of THEMES) expect(assertTheme(t, "volt")).toBe(t);
  });

  it("rejects an unknown or non-string theme", () => {
    expect(() => assertTheme("neon-nonexistent", "volt")).toThrow(ValidationError);
    expect(() => assertTheme(42, "volt")).toThrow(ValidationError);
  });

  it("accepts real booleans for isPublished", () => {
    expect(assertIsPublished(true, false)).toBe(true);
    expect(assertIsPublished(false, true)).toBe(false);
  });

  it("rejects a non-boolean isPublished (e.g. a truthy string)", () => {
    expect(() => assertIsPublished("true", false)).toThrow(ValidationError);
    expect(() => assertIsPublished(1, false)).toThrow(ValidationError);
  });
});

describe("handleValidationError (risk #5 — client-safe handle check)", () => {
  it("returns null for an empty (untouched) field", () => {
    expect(handleValidationError("")).toBeNull();
  });

  it("returns null for a valid handle", () => {
    expect(handleValidationError("maera.fit")).toBeNull();
  });

  it("returns the exact assertHandle message for an invalid handle", () => {
    expect(handleValidationError("a")).toBe(
      (() => {
        try {
          assertHandle("a");
        } catch (e) {
          return (e as ValidationError).message;
        }
      })(),
    );
  });

  it("flags reserved handles", () => {
    expect(handleValidationError("dashboard")).toMatch(/reserved/i);
  });
});
