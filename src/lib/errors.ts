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
