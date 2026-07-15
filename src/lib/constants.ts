// Shared constants — pure, no `server-only`/Node deps. Safe to import from Edge
// middleware, client components, and server code alike. Single source of truth
// for values that were previously duplicated (risk #9).

/** Firebase session cookie name. `__session` is the only cookie Firebase
 *  Hosting forwards to SSR, so it is the safe cross-platform default. */
export const SESSION_COOKIE = "__session";

/** Session cookie lifetime. Firebase caps `createSessionCookie` at 14 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

// ---- input-validation limits (risk #7) ----
export const MAX_ID_LEN = 128;
export const MAX_REFERRER_LEN = 512;
export const MAX_VISITOR_HASH_LEN = 128;
export const DEVICES = ["mobile", "tablet", "desktop"] as const;

// ---- profile text fields (risk #3) ----
export const MAX_DISPLAY_NAME_LEN = 80;
export const MAX_BIO_LEN = 300;

// ---- logging (risk #4) ----
export const MAX_LOG_STRING_LEN = 2000;

// ---- handles ----
export const MIN_HANDLE_LEN = 2;
export const MAX_HANDLE_LEN = 30;
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin", "api", "dashboard", "login", "signup", "legal", "r", "auth",
  "_next", "settings", "about", "pricing", "help", "support", "terms",
  "privacy", "cookies",
]);

// ---- analytics read guards (risk #6) ----
export const MIN_STATS_DAYS = 1;
export const MAX_STATS_DAYS = 90;
/** Hard cap on events scanned per analytics query so a hot profile can't run up
 *  an unbounded Firestore read. Far above any realistic window; pre-aggregation
 *  (Cloud Functions / BigQuery) is the path beyond this. */
export const MAX_EVENTS_SCAN = 50_000;

// ---- rate limiting ----
export const RESERVE_HANDLE_LIMIT = 10;
export const RESERVE_HANDLE_WINDOW_MS = 10 * 60 * 1000;
// Analytics reads: cap how often stats can be pulled per profile (risk #5).
export const STATS_LIMIT = 60;
export const STATS_WINDOW_MS = 60 * 1000;
