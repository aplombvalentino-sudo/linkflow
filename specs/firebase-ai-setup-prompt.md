# Prompt for the Firebase AI — infrastructure setup ONLY

> Run this before the feature-build prompt (`firebase-ai-build-prompt.md`). Scoped to
> project `linkflow-b4137`. Writes zero application code — Firebase project
> configuration only.

---

You are setting up Firebase backend infrastructure for an existing project
(`linkflow-b4137`) — you are NOT writing any application code, Next.js files, or React
components in this step. Complete these in order and report a checklist at the end.

1. **Create the Firestore database** if it doesn't already exist: **Native mode**,
   **production mode** (locked/deny-all default rules — NOT test mode), region closest
   to where the app's users will be. Confirm it now exists and report which region was
   chosen.

2. **Deploy Firestore Security Rules and indexes** from the files already in the repo
   root — `firestore.rules` and `firestore.indexes.json`. Use these exact files, do not
   write new ones:
   ```
   firebase login
   firebase use linkflow-b4137
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   Confirm the deploy succeeded and report any errors (e.g. rules syntax issues).

3. **Enable Email/Password sign-in**: Console → Authentication → Sign-in method →
   enable "Email/Password" (password-based only — no email link, no OAuth providers
   yet).

4. **Verify Authorized domains** under Authentication → Settings → Authorized domains
   includes `localhost`. Report the current list.

5. **Confirm the existing web app registration** matches — do NOT register a new web
   app, one is already wired into the codebase's `.env.local`:
   - `authDomain: linkflow-b4137.firebaseapp.com`
   - `projectId: linkflow-b4137`

6. **Do not upgrade the billing plan** (Spark → Blaze) or enable any paid service on
   your own. If anything in steps 1–5 requires it, STOP and report back instead of
   proceeding — that's a decision for the project owner.

Report back a short checklist confirming each of items 1–5 (done / blocked / needs
input), and explicitly confirm nothing in step 6 was triggered.
