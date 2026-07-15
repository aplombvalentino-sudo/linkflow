// Risk #9 — SESSION_COOKIE is defined once and re-exported, not hardcoded twice.
import { describe, it, expect } from "vitest";
import { SESSION_COOKIE } from "@/lib/constants";
import { SESSION_COOKIE as ADMIN_SESSION_COOKIE } from "@/lib/firebase/admin";

describe("SESSION_COOKIE centralization (risk #9)", () => {
  it("has the canonical value", () => {
    expect(SESSION_COOKIE).toBe("__session");
  });

  it("is the same reference re-exported by admin.ts (single source of truth)", () => {
    expect(ADMIN_SESSION_COOKIE).toBe(SESSION_COOKIE);
  });
});
