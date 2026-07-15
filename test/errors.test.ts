// Risk #5 — typed errors with stable codes/status instead of generic Error.
import { describe, it, expect } from "vitest";
import {
  AppError,
  HandleTakenError,
  ValidationError,
  RateLimitError,
} from "@/lib/errors";

describe("typed errors (risk #5)", () => {
  it("HandleTakenError carries code 'handle-taken', 409, and the handle", () => {
    const err = new HandleTakenError("sam");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("handle-taken");
    expect(err.status).toBe(409);
    expect(err.handle).toBe("sam");
    expect(err.message).toContain("sam");
  });

  it("ValidationError is invalid-input / 400", () => {
    const err = new ValidationError("nope");
    expect(err.code).toBe("invalid-input");
    expect(err.status).toBe(400);
  });

  it("RateLimitError is rate-limited / 429", () => {
    const err = new RateLimitError();
    expect(err.code).toBe("rate-limited");
    expect(err.status).toBe(429);
  });
});
