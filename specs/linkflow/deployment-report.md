# Deployment Report — LinkFlow

- **Project name:** webapp-linkflow-20260716
- **Vercel project id:** prj_1Phkimo1uOwxUdl5Y9Si77Ae6cfN
- **Live URL:** https://webapp-linkflow-20260716.vercel.app
- **Deployed at:** 2026-07-16T05:20:31.688Z (redeployed same day after fixing the sensitive-env-var target bug below)
- **Account type:** personal (no teamId)
- **Framework:** nextjs
- **Legal check:** NOT RUN — /legal/* pages do not exist yet. Known gap, disclosed to the user before deploy.
- **Stable build:** tsc + vitest (75 tests) + playwright (8 E2E) + next build all passed prior to deploy

## Environment variables (names only — values live in .env.local / Vercel, NEVER here)

| Key | Type | Targets |
| --- | --- | --- |
| NEXT_PUBLIC_FIREBASE_API_KEY | encrypted | production, preview, development |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | encrypted | production, preview, development |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | encrypted | production, preview, development |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | encrypted | production, preview, development |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | encrypted | production, preview, development |
| NEXT_PUBLIC_FIREBASE_APP_ID | encrypted | production, preview, development |
| NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID | encrypted | production, preview, development |
| NEXT_PUBLIC_COMPANY_NAME | encrypted | production, preview, development |
| NEXT_PUBLIC_CONTACT_EMAIL | encrypted | production, preview, development |
| NEXT_PUBLIC_APP_URL | encrypted | production, preview, development |
| FIREBASE_PROJECT_ID | encrypted | production, preview, development |
| FIREBASE_CLIENT_EMAIL | sensitive | production, preview, development |
| FIREBASE_PRIVATE_KEY | sensitive | production, preview, development |

## Post-deploy checks

- [x] Landing `/` loads (200, correct `<title>`, verified via curl)
- [x] `/dashboard/*` redirects unauthenticated users — verified: raw 307 to
      `/login?redirectedFrom=%2Fdashboard` (middleware gate confirmed live,
      demo mode confirmed OFF)
- [x] `/api/auth/session` reaches real logic — verified: `POST {}` returns
      `400 {"error":"missing-token"}` (was 500, see B-005 below)
- [x] `/api/stripe/checkout` reaches real logic — verified: unauthenticated
      `POST` returns `401 {"error":"unauthorized"}` (was 500)
- [x] `/api/stripe/webhook` signature verification genuinely executes —
      verified: a request with a deliberately-bad `stripe-signature` header
      returns `400 {"error":"invalid-signature"}`, proving
      `stripe.webhooks.constructEvent` actually runs against the real
      `STRIPE_WEBHOOK_SECRET` (was 500)
- [ ] `/legal/*` reachable (terms/privacy/cookies/RGPD) — **KNOWN GAP: not built yet**
- [ ] Full signup→checkout→webhook→plan-upgrade happy path with a real
      browser — **NOT VERIFIED**: this sandbox's clock skew blocks live
      Firebase Admin SDK calls from *this* environment (see
      `.claude/memory/blockers.md` B-004), so the flow could only be verified
      up to "the server logic genuinely executes" via curl, not a full
      authenticated click-through. Needs a human test.

## Notes

- Deployed at the user's explicit request before the legal-compliance-agent
  gate normally required by this factory's pipeline. The user was informed of
  this gap before deploying.
- **Bug found + fixed during this deploy:** Vercel rejects `sensitive`-type env
  vars targeting `development` (400 `BAD_REQUEST`, "You cannot set a Sensitive
  Environment Variable's target to development"). `FIREBASE_CLIENT_EMAIL` and
  `FIREBASE_PRIVATE_KEY` were set to `target: [production, preview]` only
  (dropping `development`); everything else stayed on all three targets. The
  first deploy went out *without* these two vars set — a second `vercel --prod`
  was run immediately after fixing this so the live build actually has them.
- **Action needed from the user:** add `webapp-linkflow-20260716.vercel.app` to
  Firebase Console → Authentication → Settings → Authorized domains, or
  signup/login will fail client-side even though the backend is wired
  correctly. Not verified from this sandbox (same clock-skew limitation).
- The Vercel CLI auto-added `.vercel` and `.env*` to `.gitignore` on `vercel link`.
- **B-005 (major, resolved) — every route touching firebase-admin/auth
  returned a generic 500 in production, before any route code ran.**
  Root cause (found via Vercel dashboard Runtime Logs, which is the only place
  this surfaced — build logs, `vercel logs` CLI, and the REST events API all
  came up empty): `firebase-admin@14.1.0` → `jwks-rsa@4.1.0` does a plain
  `require('jose')`, but `jose` v5+ dropped its CommonJS build entirely
  (ESM-only). `require()` of a pure-ESM package throws `ERR_REQUIRE_ESM` on
  Vercel's Node runtime — but did NOT reproduce in local `next dev` or a local
  `next build && next start` with the identical `node_modules`, which is what
  made this so hard to pin down (see the long dead-end chase in commit
  `32ba543`: serverExternalPackages, cache-busting, Turbopack→webpack, none of
  it touched the real cause). Fixed by pinning `jose` to `4.15.9` — the last
  major version with a real CJS build — via npm `overrides` in `package.json`;
  `jwks-rsa` only calls `importJWK`/`exportSPKI`, both stable since jose v4.
  Verified live: all three previously-500ing routes now return their correct
  designed status codes, including a webhook signature-verification rejection
  (proves the fix reaches real Stripe/Firebase logic, not just "no crash").
  Remove the override once `jwks-rsa` ships a fix upstream (still declares
  `jose: "^6.1.3"` as of this writing).
