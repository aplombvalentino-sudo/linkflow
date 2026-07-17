// assertUrl was previously untested. Locks in both the pre-existing http(s)
// behavior and the new mailto: support (bare email address, explicit
// mailto:, and the /r/[linkId] redirect protocol allow-list it feeds).
import { describe, it, expect } from "vitest";
import { assertUrl, emailAddressError } from "@/lib/validation";
import { ValidationError } from "@/lib/errors";
import { MAX_URL_LEN } from "@/lib/constants";

describe("assertUrl — http(s) behavior (unchanged)", () => {
  it("adds https:// to a bare domain", () => {
    expect(assertUrl("maera.fit")).toBe("https://maera.fit/");
  });

  it("passes through a well-formed https URL", () => {
    expect(assertUrl("https://twitch.tv/nova")).toBe("https://twitch.tv/nova");
  });

  it("rejects dangerous schemes", () => {
    expect(() => assertUrl("javascript:alert(1)")).toThrow(ValidationError);
    expect(() => assertUrl("data:text/html,hi")).toThrow(ValidationError);
    expect(() => assertUrl("file:///etc/passwd")).toThrow(ValidationError);
  });

  it("rejects empty input and oversized URLs", () => {
    expect(() => assertUrl("")).toThrow(ValidationError);
    expect(() => assertUrl("https://x.com/" + "a".repeat(MAX_URL_LEN))).toThrow(
      ValidationError,
    );
  });

  it("rejects a hostname with no dot", () => {
    expect(() => assertUrl("https://localhost")).toThrow(ValidationError);
  });
});

describe("assertUrl — mailto: support", () => {
  it("converts a bare email address into a mailto: link", () => {
    expect(assertUrl("maera@example.com")).toBe("mailto:maera@example.com");
  });

  it("accepts an explicit mailto: prefix", () => {
    expect(assertUrl("mailto:maera@example.com")).toBe("mailto:maera@example.com");
  });

  it("is case-insensitive on the mailto: prefix", () => {
    expect(assertUrl("MAILTO:maera@example.com")).toBe("mailto:maera@example.com");
  });

  it("trims whitespace around the address", () => {
    expect(assertUrl("  maera@example.com  ")).toBe("mailto:maera@example.com");
  });

  it("preserves a mailto: query string (subject/body)", () => {
    expect(assertUrl("mailto:maera@example.com?subject=Hi")).toBe(
      "mailto:maera@example.com?subject=Hi",
    );
  });

  it("rejects a malformed email address", () => {
    // no @ at all — falls through to the bare-domain path, which then fails
    // the existing "hostname must include a dot" check, not the mailto one
    expect(() => assertUrl("not-an-email")).toThrow(ValidationError);
    expect(() => assertUrl("mailto:not-an-email")).toThrow(ValidationError);
    expect(() => assertUrl("mailto:@example.com")).toThrow(ValidationError);
  });

  it("does not misfire on a URL containing an @ with a scheme already present", () => {
    // e.g. basic-auth-style URLs stay on the normal http(s) path, not mailto
    expect(assertUrl("https://user@example.com/path")).toBe(
      "https://user@example.com/path",
    );
  });
});

describe("emailAddressError — client-safe pre-check", () => {
  it("returns null for an empty (untouched) field", () => {
    expect(emailAddressError("")).toBeNull();
  });

  it("returns null for a valid address", () => {
    expect(emailAddressError("maera@example.com")).toBeNull();
  });

  it("returns a message for an invalid address", () => {
    expect(emailAddressError("not-an-email")).toMatch(/valid email/i);
  });

  it("agrees with assertUrl's mailto: acceptance criteria", () => {
    const address = "maera@example.com";
    expect(emailAddressError(address)).toBeNull();
    expect(assertUrl(address)).toBe(`mailto:${address}`);
  });
});
