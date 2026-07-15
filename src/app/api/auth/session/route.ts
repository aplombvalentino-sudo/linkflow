// POST /api/auth/session — exchange a freshly-issued Firebase ID token for an
// httpOnly session cookie (risk #1 / #2). On first sign-in it upserts the
// users/{uid} doc; on signup with a handle it reserves the handle + first
// profile (rate-limited, uniqueness-checked via reserveHandle).
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDbOrThrow } from "@/lib/firebase/admin";
import { mintSessionCookie } from "@/lib/firebase/auth-server";
import { reserveHandle } from "@/lib/firebase/queries";
import { assertHandle, assertDisplayName, assertBio } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isFirebaseConfigured) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  let body: {
    idToken?: unknown;
    handle?: unknown;
    displayName?: unknown;
    bio?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const idToken = body.idToken;
  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ error: "missing-token" }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const db = getAdminDbOrThrow();

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      await userRef.set({
        email: decoded.email ?? null,
        plan: "free",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Signup-only: reserve the handle first (throws HandleTakenError → 409),
    // then create the first profile so a collision leaves no orphan profile.
    if (typeof body.handle === "string" && body.handle.length > 0) {
      const handle = assertHandle(body.handle);
      // Server-side validation of free-text profile fields (risk #3).
      const displayName = assertDisplayName(body.displayName);
      const bio = assertBio(body.bio);
      const profileRef = db.collection("profiles").doc();
      await reserveHandle(handle, profileRef.id, uid);
      await profileRef.set({
        userId: uid,
        handle,
        handleLower: handle,
        displayName,
        bio,
        theme: "volt",
        isPublished: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const sessionCookie = await mintSessionCookie(idToken);
    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    logger.error("session_mint_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "auth-failed" }, { status: 401 });
  }
}
