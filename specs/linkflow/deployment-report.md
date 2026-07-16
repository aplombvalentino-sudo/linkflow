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
- [ ] `/legal/*` reachable (terms/privacy/cookies/RGPD) — **KNOWN GAP: not built yet**
- [ ] Auth flow works against production Firebase — **NOT VERIFIED**: this
      sandbox's clock skew blocks live Firebase Admin SDK calls (see
      `.claude/memory/blockers.md` B-004), so signup/login could not be
      exercised end-to-end from here. Code path is unit-tested; needs a real
      human click-through.
- [ ] Stripe checkout works (not enabled in v1)

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
