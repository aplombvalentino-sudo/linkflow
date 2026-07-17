// Typed application errors with stable `code` + HTTP `status`, so callers and
// API routes can branch on failure kind instead of matching message strings
// (risk #5).

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("invalid-input", message, 400);
  }
}

/** Preserves the legacy `handle-taken` identifier as `.code`. */
export class HandleTakenError extends AppError {
  readonly handle: string;
  constructor(handle: string) {
    super("handle-taken", `Handle "@${handle}" is already taken`, 409);
    this.handle = handle;
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests — slow down.") {
    super("rate-limited", message, 429);
  }
}

/** Raised when a backend dependency (e.g. the Firebase Admin SDK) is
 *  unavailable/misconfigured, so callers return a clean 503 instead of leaking
 *  a raw SDK stack trace (risks #6–#11). */
export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable. Try again.") {
    super("service-unavailable", message, 503);
  }
}

/** No valid session — the caller must sign in. */
export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in and try again.") {
    super("unauthorized", message, 401);
  }
}

/** Authenticated, but not the owner of the target resource. */
export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to that.") {
    super("forbidden", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super("not-found", message, 404);
  }
}

/** A plan limit was hit (e.g. Free = 1 profile). Nudges toward upgrade. */
export class PlanLimitError extends AppError {
  constructor(message: string) {
    super("plan-limit", message, 403);
  }
}
