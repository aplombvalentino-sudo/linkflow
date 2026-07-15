// Firebase browser SDK (Client Components).
// Uses the public web config only (apiKey here is NOT a secret — access is
// governed by Firestore Security Rules + Firebase Auth, never by hiding this).
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseWebConfig, isFirebaseConfigured } from "./config";

export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseWebConfig);

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

// Re-exported so existing importers (`@/lib/firebase/client`) keep working; the
// single source of truth is config.ts, shared with server code (risk #8).
export { isFirebaseConfigured };
