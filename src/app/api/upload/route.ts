// POST /api/upload — avatar/background image upload. Auth-gated via the session
// cookie, ownership-checked against the target profile, type/size validated,
// then stored in Firebase Storage via the Admin SDK (the client never touches
// Storage directly). Returns { url } for the editor to persist via updateProfile.
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { verifySession } from "@/lib/firebase/auth-server";
import { getAdminDbOrThrow, getAdminBucketOrThrow } from "@/lib/firebase/admin";
import { loadOwnedProfile } from "@/lib/actions/guards";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_BYTES,
  MAX_BACKGROUND_BYTES,
  UPLOAD_KINDS,
} from "@/lib/constants";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const uid = session.uid;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    const profileId = String(form.get("profileId") ?? "");

    if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) {
      return NextResponse.json({ error: "invalid-kind" }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "missing-file" }, { status: 400 });
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "invalid-type" }, { status: 400 });
    }

    // Ownership: the uploader must own the profile the image is for.
    const db = getAdminDbOrThrow();
    await loadOwnedProfile(db, profileId, uid);

    const maxBytes = kind === "avatar" ? MAX_AVATAR_BYTES : MAX_BACKGROUND_BYTES;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "empty-file" }, { status: 400 });
    }
    if (buffer.byteLength > maxBytes) {
      return NextResponse.json({ error: "too-large" }, { status: 413 });
    }

    const ext = EXT[file.type] ?? "png";
    const objectPath = `uploads/${uid}/${profileId}/${kind}-${randomUUID()}.${ext}`;
    const bucket = getAdminBucketOrThrow();
    const token = randomUUID();
    await bucket.file(objectPath).save(buffer, {
      resumable: false,
      contentType: file.type,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        // Firebase-style download token → a getDownloadURL-equivalent public URL
        // that works even with uniform bucket-level access (no per-object ACLs).
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const url =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
      `${encodeURIComponent(objectPath)}?alt=media&token=${token}`;

    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    logger.error("upload_failed", {
      uid,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  }
}
