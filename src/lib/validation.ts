// Pure input validators/normalizers. No Firebase or Node deps, so they run the
// same on Edge, server, and in tests. Server callers use these to reject
// malformed or oversized data even though Firestore rules already block direct
// client writes (defense in depth — risk #7).
import {
  DEVICES,
  MAX_ID_LEN,
  MAX_REFERRER_LEN,
  MAX_VISITOR_HASH_LEN,
  MIN_HANDLE_LEN,
  MAX_HANDLE_LEN,
  RESERVED_HANDLES,
  MIN_STATS_DAYS,
  MAX_STATS_DAYS,
  MAX_DISPLAY_NAME_LEN,
  MAX_BIO_LEN,
  THEMES,
  BACKGROUND_STYLES,
  MAX_LINK_TITLE_LEN,
  MAX_LINK_META_LEN,
  MAX_URL_LEN,
  ALLOWED_URL_PROTOCOLS,
  SPLINE_HOST_SUFFIX,
} from "./constants";
import { ValidationError } from "./errors";
import { stripControlChars } from "./sanitize";

export type Device = (typeof DEVICES)[number];

export function assertId(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_ID_LEN) {
    throw new ValidationError(`Invalid ${field}`);
  }
  return value;
}

export function assertDevice(value: unknown): Device {
  if (typeof value !== "string" || !(DEVICES as readonly string[]).includes(value)) {
    throw new ValidationError("Invalid device");
  }
  return value as Device;
}

export function normalizeReferrer(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new ValidationError("Invalid referrer");
  const trimmed = value.slice(0, MAX_REFERRER_LEN);
  return trimmed.length ? trimmed : null;
}

export function assertVisitorHash(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_VISITOR_HASH_LEN
  ) {
    throw new ValidationError("Invalid visitorHash");
  }
  return value;
}

export interface EventInput {
  profileId: string;
  referrer: string | null;
  device: Device;
  visitorHash: string;
}

/** Validate + normalize a view/click event payload. Throws ValidationError on
 *  any malformed field. */
export function validateEventInput(
  profileId: unknown,
  referrer: unknown,
  device: unknown,
  visitorHash: unknown,
): EventInput {
  return {
    profileId: assertId(profileId, "profileId"),
    referrer: normalizeReferrer(referrer),
    device: assertDevice(device),
    visitorHash: assertVisitorHash(visitorHash),
  };
}

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isReservedHandle(raw: string): boolean {
  return RESERVED_HANDLES.has(normalizeHandle(raw));
}

/** Normalize + validate a handle. Throws ValidationError if malformed/reserved. */
export function assertHandle(raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError("Invalid handle");
  const handle = normalizeHandle(raw);
  if (
    handle.length < MIN_HANDLE_LEN ||
    handle.length > MAX_HANDLE_LEN ||
    !HANDLE_RE.test(handle)
  ) {
    throw new ValidationError(
      `Handle must be ${MIN_HANDLE_LEN}–${MAX_HANDLE_LEN} chars: letters, numbers, . _ -`,
    );
  }
  if (RESERVED_HANDLES.has(handle)) {
    throw new ValidationError("That handle is reserved");
  }
  return handle;
}

/** Clamp an analytics window to a sane [MIN, MAX] day range (risk #6). */
export function clampStatsDays(days: number): number {
  if (!Number.isFinite(days)) return MIN_STATS_DAYS;
  return Math.min(MAX_STATS_DAYS, Math.max(MIN_STATS_DAYS, Math.floor(days)));
}

/** Validate + sanitize a free-text profile field (risk #3): coerce missing to
 *  "", strip control chars, and reject over-length input. */
function assertProfileText(value: unknown, field: string, maxLen: number): string {
  if (value == null) return "";
  if (typeof value !== "string") throw new ValidationError(`Invalid ${field}`);
  const clean = stripControlChars(value).trim();
  if (clean.length > maxLen) {
    throw new ValidationError(`${field} must be at most ${maxLen} characters`);
  }
  return clean;
}

export function assertDisplayName(value: unknown): string {
  return assertProfileText(value, "display name", MAX_DISPLAY_NAME_LEN);
}

export function assertBio(value: unknown): string {
  return assertProfileText(value, "bio", MAX_BIO_LEN);
}

export type Theme = (typeof THEMES)[number];

/** Validate a profile theme (risk #2): must be one of the known values.
 *  `fallback` is returned for missing input (undefined/null) so existing
 *  callers that don't send a theme keep today's default behavior. */
export function assertTheme(value: unknown, fallback: Theme): Theme {
  if (value == null) return fallback;
  if (typeof value !== "string" || !(THEMES as readonly string[]).includes(value)) {
    throw new ValidationError(`theme must be one of: ${THEMES.join(", ")}`);
  }
  return value as Theme;
}

/** Validate the isPublished flag (risk #2): must be a real boolean.
 *  `fallback` is returned for missing input so existing callers keep today's
 *  default behavior. */
export function assertIsPublished(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  if (typeof value !== "boolean") {
    throw new ValidationError("isPublished must be a boolean");
  }
  return value;
}

/** Client-safe (and server-safe) handle check that reuses assertHandle's exact
 *  rules — no duplicated regex/length logic to drift out of sync (risk #5).
 *  Returns null when valid, or a user-facing message when not. */
export function handleValidationError(raw: string): string | null {
  if (raw.length === 0) return null; // don't nag on an empty/untouched field
  try {
    assertHandle(raw);
    return null;
  } catch (err) {
    return err instanceof ValidationError ? err.message : "Invalid handle";
  }
}

// ---- link + profile-media validators (product build) ----

/** Pragmatic (not full RFC 5322) email shape check — same bar as the rest of
 *  this file's validators (e.g. HANDLE_RE). Shared by assertUrl's mailto:
 *  detection and the client-safe emailAddressError below, so client and
 *  server can never disagree on what counts as a valid address. */
const EMAIL_ADDRESS_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate + normalize a link URL. Accepts a bare host ("maera.fit") by
 *  defaulting to https://, or a bare/mailto:-prefixed email address by
 *  turning it into a mailto: link. Otherwise only http(s) is allowed —
 *  javascript:/data:/file: etc. are rejected to prevent open-redirect + XSS
 *  through the /r/ redirect. mailto: is the one exception: it can't XSS,
 *  open-redirect, or smuggle another protocol — worst case it opens the
 *  visitor's own mail client, no riskier than the address appearing in bio
 *  text. */
export function assertUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError("A link URL is required");
  }
  let raw = stripControlChars(value).trim();
  if (raw.length > MAX_URL_LEN) {
    throw new ValidationError(`URL must be at most ${MAX_URL_LEN} characters`);
  }

  const isExplicitMailto = raw.toLowerCase().startsWith("mailto:");
  const isBareEmail = !isExplicitMailto && !raw.includes("://") && raw.includes("@");
  if (isExplicitMailto || isBareEmail) {
    const body = isExplicitMailto ? raw.slice("mailto:".length) : raw;
    const [addressPart, ...queryParts] = body.split("?");
    const address = addressPart.trim();
    if (!EMAIL_ADDRESS_RE.test(address)) {
      throw new ValidationError("That doesn't look like a valid email address");
    }
    const query = queryParts.length > 0 ? `?${queryParts.join("?")}` : "";
    return `mailto:${address}${query}`;
  }

  // add a scheme if the user typed a bare domain
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    raw = `https://${raw}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ValidationError("That doesn't look like a valid URL");
  }
  if (!(ALLOWED_URL_PROTOCOLS as readonly string[]).includes(parsed.protocol)) {
    throw new ValidationError("Links must start with http:// or https://");
  }
  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    throw new ValidationError("That doesn't look like a valid URL");
  }
  return parsed.toString();
}

/** Client-safe (and server-safe) email check for the "Add email" quick-add
 *  flow — reuses assertUrl's exact rule (EMAIL_ADDRESS_RE) so the two can't
 *  drift, same pattern as handleValidationError for handles. Returns null
 *  when valid or empty, a user-facing message otherwise. */
export function emailAddressError(raw: string): string | null {
  if (raw.trim().length === 0) return null; // don't nag on an untouched field
  return EMAIL_ADDRESS_RE.test(raw.trim())
    ? null
    : "That doesn't look like a valid email address";
}

/** Validate a link title (required, trimmed, length-capped, control-stripped). */
export function assertLinkTitle(value: unknown): string {
  if (typeof value !== "string") throw new ValidationError("Invalid title");
  const clean = stripControlChars(value).trim();
  if (clean.length === 0) throw new ValidationError("A link title is required");
  if (clean.length > MAX_LINK_TITLE_LEN) {
    throw new ValidationError(`Title must be at most ${MAX_LINK_TITLE_LEN} characters`);
  }
  return clean;
}

/** Validate an optional link subtitle ("Most popular", "3 spots left", …). */
export function assertLinkMeta(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "string") throw new ValidationError("Invalid link note");
  const clean = stripControlChars(value).trim();
  if (clean.length > MAX_LINK_META_LEN) {
    throw new ValidationError(`Note must be at most ${MAX_LINK_META_LEN} characters`);
  }
  return clean;
}

export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];

export function assertBackgroundStyle(value: unknown, fallback: BackgroundStyle): BackgroundStyle {
  if (value == null) return fallback;
  if (typeof value !== "string" || !(BACKGROUND_STYLES as readonly string[]).includes(value)) {
    throw new ValidationError(`background must be one of: ${BACKGROUND_STYLES.join(", ")}`);
  }
  return value as BackgroundStyle;
}

/** Validate a hex color like #d4ff3f. Returns null for empty/missing. */
export function assertColor(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    throw new ValidationError("Color must be a 6-digit hex like #07070b");
  }
  return value.trim().toLowerCase();
}

/** Validate an image URL that we produced (avatar/background). Returns null to
 *  clear the field. Only http(s) — same protocol allow-list as links. */
export function assertImageUrl(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError("Invalid image URL");
  const clean = value.trim();
  if (clean.length > MAX_URL_LEN) throw new ValidationError("Image URL too long");
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    throw new ValidationError("Invalid image URL");
  }
  if (!(ALLOWED_URL_PROTOCOLS as readonly string[]).includes(parsed.protocol)) {
    throw new ValidationError("Invalid image URL");
  }
  return parsed.toString();
}

/** Validate a Spline (spline.design) scene URL for use as a public profile's
 *  full-page background. Returns null to clear the field. Restricted to
 *  spline.design and its subdomains — a public page must never embed an
 *  arbitrary third-party iframe as its backdrop (phishing/clickjacking risk),
 *  so unlike assertImageUrl this is NOT a general-purpose URL validator. */
export function assertSplineUrl(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError("Invalid Spline URL");
  const clean = stripControlChars(value).trim();
  if (clean.length > MAX_URL_LEN) throw new ValidationError("Spline URL too long");
  let raw = clean;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) raw = `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ValidationError("That doesn't look like a valid Spline URL");
  }
  if (parsed.protocol !== "https:") {
    throw new ValidationError("Spline URLs must start with https://");
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== SPLINE_HOST_SUFFIX && !host.endsWith(`.${SPLINE_HOST_SUFFIX}`)) {
    throw new ValidationError(`Only ${SPLINE_HOST_SUFFIX} scene links are supported`);
  }
  return parsed.toString();
}
