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
