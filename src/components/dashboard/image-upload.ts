// Client-side upload helper: POSTs a File to /api/upload and normalizes the
// response into a discriminated result the UI can branch on. Pure fetch — no
// React, no "use server". Size/type must be validated by the caller first.
import type { UPLOAD_KINDS } from "@/lib/constants";

type UploadKind = (typeof UPLOAD_KINDS)[number];

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Upload one image. On success returns the hosted URL; on any failure returns
 *  a stable error code (server-provided when available, else a network code). */
export async function uploadImage(
  file: File,
  kind: UploadKind,
  profileId: string,
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  form.append("profileId", profileId);

  try {
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!res.ok || !data.url) {
      return { ok: false, error: data.error || "upload-failed" };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "network" };
  }
}

/** Turn a known upload/validation error code into human copy in LinkFlow voice. */
export function uploadErrorMessage(code: string): string {
  switch (code) {
    case "too-large":
      return "That image is over the size limit.";
    case "invalid-type":
      return "Use a PNG, JPG, WebP, or GIF.";
    case "network":
      return "Connection dropped mid-upload. Try again.";
    default:
      return "Upload failed. Give it another go.";
  }
}
