// Firebase Admin SDK — SERVER ONLY. Never import from a Client Component.
//
// Secrets handling (risk #3):
//  - The service-account private key is read only from FIREBASE_PRIVATE_KEY, a
//    server-only env var. It is NEVER prefixed with NEXT_PUBLIC_ and never logged.
//  - On Vercel/hosting, FIREBASE_PRIVATE_KEY is stored as an encrypted env var
//    (the platform's secret store) and injected at runtime only — it is not in
//    the repo, the client bundle, or build output.
//  - Initialization is LAZY: the key is touched only when a server call actually
//    needs Admin, never at module import — so importing this file (e.g. during a
//    credential-less CI build) can't crash or read the key.
//
// jose override (package.json "overrides"): firebase-admin -> jwks-rsa@4.1.0
// does a plain `require('jose')`, but jose v5+ dropped its CommonJS build
// entirely (ESM-only). That plain require() crashes with ERR_REQUIRE_ESM on
// Vercel's Node runtime specifically — reproduces 100% on every deploy, but
// NOT in local `next dev` or `next build && next start` (same Node modules,
// different require/interop behavior). Pinned jose to 4.15.9, the last major
// version with a real CJS build (`exports.require` -> dist/node/cjs) and the
// same importJWK/exportSPKI API jwks-rsa actually calls — remove this
// override once jwks-rsa ships a fix upstream (tracked: it currently still
// requires jose ^6.1.3 in its own package.json, i.e. not yet fixed).
import "server-only";
import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { SESSION_COOKIE } from "@/lib/constants";
import { ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// Re-exported so existing importers keep the same API; defined once in constants (risk #9).
export { SESSION_COOKIE };

interface AdminCredential {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/** Read + validate the service-account credential from server-only env vars.
 *  Throws a clear error naming the missing var instead of a cryptic SDK failure. */
export function getAdminCredentialConfig(): AdminCredential {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel/dotenv store the PEM with literal "\n" — restore real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const missing = [
    !projectId && "FIREBASE_PROJECT_ID",
    !clientEmail && "FIREBASE_CLIENT_EMAIL",
    !privateKey && "FIREBASE_PRIVATE_KEY",
  ].filter(Boolean) as string[];

  if (missing.length) {
    throw new Error(
      `Firebase Admin is not configured — missing env: ${missing.join(", ")}`,
    );
  }
  return { projectId: projectId!, clientEmail: clientEmail!, privateKey: privateKey! };
}

let cachedApp: App | undefined;

function adminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert(getAdminCredentialConfig()),
        // Storage bucket for avatar/background uploads. The bucket id is a
        // public identifier (same value as NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        // access is governed by the Admin credential + our upload route's auth.
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
  return cachedApp;
}

/** Lazy accessors — the Admin app (and thus the private key) is only initialized
 *  on first use, never at import time. */
export function getAdminAuth(): Auth {
  return getAuth(adminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(adminApp());
}

/** Run an Admin-SDK accessor, converting an init/config failure (e.g. missing
 *  credentials) into a logged, typed ServiceUnavailableError instead of letting
 *  a raw, cryptic SDK exception propagate. Shared by all callers that touch
 *  Admin so error handling is consistent (risks #6–#11). */
export function guardAdmin<T>(accessor: () => T, event: string): T {
  try {
    return accessor();
  } catch (err) {
    logger.error(event, { message: err instanceof Error ? err.message : String(err) });
    throw new ServiceUnavailableError();
  }
}

/** Firestore accessor with the guard applied (risks #8–#11). */
export function getAdminDbOrThrow(): Firestore {
  return guardAdmin(getAdminDb, "admin_db_unavailable");
}

/** Default Storage bucket, guarded like getAdminDbOrThrow. Used by the image
 *  upload route to store avatars/backgrounds server-side (client never touches
 *  Storage directly — no Storage rules to get wrong). */
export function getAdminBucketOrThrow() {
  return guardAdmin(() => getStorage(adminApp()).bucket(), "admin_storage_unavailable");
}
