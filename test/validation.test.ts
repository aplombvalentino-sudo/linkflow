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
} from "@/lib/validation";
import { ValidationError } from "@/lib/errors";
import { MAX_STATS_DAYS, MIN_STATS_DAYS } from "@/lib/constants";

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
