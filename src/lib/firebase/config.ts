// Pure Firebase web config — NO SDK import, so this is safe to read from server
// route handlers, Edge, and client alike. The web config values are public
// identifiers (not secrets); access is governed by Firestore Security Rules.
// The Admin service-account key is NOT here — it lives server-only in admin.ts.

export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** False until real Firebase credentials are configured — drives demo mode. */
export const isFirebaseConfigured =
  !!firebaseWebConfig.projectId &&
  !firebaseWebConfig.projectId.includes("your-project");
