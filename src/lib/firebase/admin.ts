// Firebase Admin SDK — SERVER ONLY. Never import from a Client Component.
// The service-account private key lives in FIREBASE_PRIVATE_KEY (server env,
// never NEXT_PUBLIC_). Admin bypasses Security Rules, so all privileged
// reads/writes (analytics events, handle reservation, RGPD wipe) go here.
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

function adminApp(): App {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel/dotenv store the PEM with literal "\n" — restore real newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth: Auth = getAuth(adminApp());
export const adminDb: Firestore = getFirestore(adminApp());

/** Firebase session cookie name. `__session` is the only cookie Firebase
 *  Hosting forwards to SSR, so it is the safe cross-platform default. */
export const SESSION_COOKIE = "__session";
