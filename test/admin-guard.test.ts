// Risks #6–#11 (shared mechanism) — guardAdmin converts an Admin-SDK init/config
// failure into a logged, typed ServiceUnavailableError instead of a raw throw.
import { describe, it, expect, vi } from "vitest";
import { guardAdmin } from "@/lib/firebase/admin";
import { ServiceUnavailableError } from "@/lib/errors";

describe("guardAdmin (risks #6–#11)", () => {
  it("returns the accessor value on success", () => {
    expect(guardAdmin(() => 42, "evt")).toBe(42);
  });

  it("logs the cause and throws a typed ServiceUnavailableError on failure", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      guardAdmin(() => {
        throw new Error("cert boom");
      }, "admin_db_unavailable"),
    ).toThrow(ServiceUnavailableError);

    expect(spy).toHaveBeenCalled();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.event).toBe("admin_db_unavailable");
    expect(logged.message).toContain("cert boom");
    spy.mockRestore();
  });
});
