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

// ---- profile theme (risk #2). Keep in sync with the literal list in
// firestore.rules' `theme in [...]` check — Security Rules can't import JS. ----
export const THEMES = [
  "volt",
  "violet-hour",
  "ember",
  "rose",
  "reef",
  "cobalt",
] as const;

// ---- profile background ----
// How a published profile's full-page backdrop is rendered:
//  - "animated": a mouse-reactive gradient built from the theme accent (default, free)
//  - "image":    a user-uploaded cover photo (backgroundImageUrl)
//  - "solid":    a single flat color (backgroundColor)
//  - "spline":   a user's own Spline (spline.design) 3D scene, embedded live via
//                its public URL (backgroundSplineUrl) — Pro only, gated in
//                updateProfile; see assertSplineUrl for the host allow-list.
export const BACKGROUND_STYLES = ["animated", "image", "solid", "spline"] as const;
export const DEFAULT_BACKGROUND_STYLE = "animated";

/** Spline embeds are restricted to this domain (and its subdomains) — a public
 *  profile page must never render an arbitrary third-party iframe as its full-
 *  page backdrop (phishing/clickjacking risk). */
export const SPLINE_HOST_SUFFIX = "spline.design";

// ---- links ----
export const MAX_LINK_TITLE_LEN = 120;
export const MAX_LINK_META_LEN = 60;
export const MAX_URL_LEN = 2048;
/** URL schemes we allow a link/avatar/background to point at. Blocks
 *  javascript:, data:, file:, etc. (open-redirect / XSS defense). */
export const ALLOWED_URL_PROTOCOLS = ["http:", "https:"] as const;

// ---- plan limits ----
export const FREE_MAX_PROFILES = 1;
export const PRO_MAX_PROFILES = 10;
export const MAX_LINKS_PER_PROFILE = 100;

// ---- image uploads (avatar + background) ----
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export const UPLOAD_KINDS = ["avatar", "background"] as const;

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

// ---- billing (Pro plan) ----
export const PRO_PRICE_CENTS = 900; // €9/mo, matches product-onepager.md + landing copy
export const PRO_CURRENCY = "eur";
export const PRO_PRODUCT_NAME = "LinkFlow Pro";
export const CHECKOUT_LIMIT = 5;
export const CHECKOUT_WINDOW_MS = 60 * 1000;

// ---- rate limiting ----
export const RESERVE_HANDLE_LIMIT = 10;
export const RESERVE_HANDLE_WINDOW_MS = 10 * 60 * 1000;
// Analytics reads: cap how often stats can be pulled per profile (risk #5).
export const STATS_LIMIT = 60;
export const STATS_WINDOW_MS = 60 * 1000;
// getProfileStats result cache TTL (risk #4 — architecture): reuses a computed
// aggregate instead of re-scanning up to 2×MAX_EVENTS_SCAN docs on every call
// within the window. Matched to STATS_WINDOW_MS so a client polling at the
// rate-limit's own cadence gets a fresh compute roughly once per window.
export const STATS_CACHE_TTL_MS = STATS_WINDOW_MS;
