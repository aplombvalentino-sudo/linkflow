# Firebase setup — linkflow

Step-by-step to wire linkflow to a Firebase project. Created 20260714 (replaces
the factory-default Supabase setup — see `.claude/memory/decisions.md`).

## 1. Create the project
1. Go to https://console.firebase.google.com → **Add project**.
2. Name it, (optionally) enable Analytics, and create.

## 2. Register a Web app + get the web config
1. Project Overview → **Add app → Web (`</>`)**.
2. Copy the `firebaseConfig` values into `.env.local` (from `.env.local.example`):
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`

   These are public identifiers, not secrets — access is governed by Security Rules.

## 3. Service account (Admin SDK — server only)
1. **Project settings → Service accounts → Generate new private key** (downloads JSON).
2. Into `.env.local` (NEVER `NEXT_PUBLIC_`, never committed):
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the literal `\n` escapes; wrap in quotes)

## 4. Enable Auth
**Authentication → Get started → Sign-in method**: enable **Email/Password** (and any
OAuth providers the spec needs). Add your dev + prod domains under **Settings →
Authorized domains**.

## 5. Firestore + rules (mandatory)
1. **Firestore Database → Create database** (production mode, region near your users).
2. Deploy the rules and indexes shipped in this repo:
   ```bash
   npm i -g firebase-tools && firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   Rules live in `firestore.rules`, indexes in `firestore.indexes.json`
   (config in `firebase.json`). They enforce: owner-only CRUD, public read on
   published profiles / active links, and **Admin-SDK-only** analytics events.

## 6. Verify
```bash
npm run dev
```
Sign up, confirm the session cookie persists across reloads, and confirm `/dashboard`
redirects to `/login` when logged out.

## Session model (why it's split)
Firebase's Admin SDK can't run on the Edge, so `src/middleware.ts` only checks that the
`__session` cookie exists. The **cryptographic** check (`adminAuth.verifySessionCookie`)
happens in the `/dashboard` server layout — a forged/expired cookie passes middleware but
is rejected there. Sign-in flow: client `signInWithEmailAndPassword` → get ID token →
POST to a route handler that calls `adminAuth.createSessionCookie` → set httpOnly
`__session`. RGPD delete revokes the user and wipes their Firestore docs via Admin.
