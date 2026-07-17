# Blockers Register â€” linkflow

> Frictions, root causes, solutions. Read the SUMMARY first, jump by line number, update the SUMMARY after adding an entry.

## SUMMARY

| ID | Line | Blocker | Root cause | Status |
|----|------|---------|------------|--------|
| B-001 | 15 | Turbopack file-watching blind on OneDrive path | OneDrive sync defeats FS events; .next cache serves stale CSS/JS | documented (restart dev + rm .next; move repo off OneDrive) |
| B-002 | 20 | Raw backdrop-filter stripped from plain CSS rules by Tailwind v4/Lightning CSS pipeline | custom properties outside @utility get pruned | solved (define custom classes with @utility) |
| B-003 | 25 | Browser-pane screenshots + rAF suspended (visibilityState=hidden) | preview surface not visible to user; frame production paused | worked around (DOM/JS verification; visual check pending user opening preview) |
| B-004 | 30 | Firebase server-side auth (Admin SDK / Firestore) returns UNAUTHENTICATED in this sandbox | sandbox clock is future-dated (2026-07-14); Google OAuth rejects the JWT iat/exp timeframe | env-only: credentials are valid, works on a real-clock machine |
| B-005 | 32 | Every route importing firebase-admin's auth module 500'd on Vercel (not locally) | jwks-rsa@4.1.0 (a firebase-admin transitive dep) does `require('jose')`; jose v5+ dropped its CJS build (ESM-only) → ERR_REQUIRE_ESM on Vercel's Node runtime | solved (pin `jose` to `4.15.9` via npm `overrides`) |

<!-- Add entries as B-001, B-002, ... Log any obstacle that costs > 30 min. -->

### B-001 — OneDrive vs Turbopack watching
Edits to src/ were never recompiled (no Fast Refresh events); .next persisted stale output across restarts. Fix: `rm -rf .next` + restart after edits, or relocate project to a non-OneDrive path.

### B-002 — backdrop-filter stripped
`.glass { backdrop-filter: blur(16px) }` in plain CSS reached the browser without the declaration. Moving the class to Tailwind v4 `@utility glass { ... }` preserved it. Rule: in Tailwind v4 projects, define custom utility classes via @utility, not bare selectors.

### B-003 — hidden preview surface
All framer-motion animation is rAF-driven; with the pane hidden, rAF never ticks -> entrance animations pending, useScroll static, screenshots time out. Not a code bug: verified fonts/tokens/glass/DOM structure via JS; animations follow standard patterns and run when the page is actually viewed.

### B-004 — Firebase server auth can't complete in-sandbox (clock skew)
Real project `linkflow-b4137` wired into `.env.local` (verified: key length 1704, all 10 vars present, gitignored). Admin SDK inits fine and google-auth SIGNS the JWT with the key without error, but Google's token endpoint returns `invalid_grant: Token must be a short-lived token (60 minutes) and in a reasonable timeframe. Check your iat and exp values` → Firestore call = `16 UNAUTHENTICATED`. Root cause: the sandbox wall clock reads 2026-07-14, outside Google's acceptable JWT-timestamp window vs real server time. The credentials themselves are valid (a bad key gives "Invalid JWT Signature", a different message). This is an execution-environment limit, NOT a config bug — the same `.env.local` authenticates on a correctly-clocked machine. Consequence: any server-side Firebase call (session-cookie mint/verify, Firestore reads/writes, RGPD delete) can't be end-to-end tested here; verify those on the user's machine. Demo mode is OFF and confirmed: `/dashboard` → `/login?redirectedFrom=/dashboard`, no console errors.

### B-005 — firebase-admin routes 500 on Vercel only (jose ESM/CJS mismatch)
After deploying Stripe billing, `/api/stripe/checkout`, `/api/stripe/webhook`, and even the pre-existing `/api/auth/session` all returned a generic Next.js 500 (`FUNCTION_INVOCATION_FAILED`) in production — before any route code executed (confirmed via a temporary debug wrapper that never got invoked). Did NOT reproduce in `next dev` or a local `next build && next start` with the identical `node_modules` — same code, same env, worked perfectly locally every time. Chased several wrong leads first (serverExternalPackages, forced cache-free rebuilds, Turbopack→webpack) with no effect — none of those were the cause, though switching to `--webpack` incidentally caught a real, separate bug (Next.js route files may only export HTTP method handlers; two helper functions had been exported from `route.ts` directly for testability, which Turbopack silently allowed).

Root cause only surfaced via the **Vercel dashboard's Runtime Logs** (Project → Logs), which is NOT reachable from this environment: the CLI's `vercel logs` returns a 400 for this account/plan tier, and the REST `/v2/deployments/{id}/events` API only returns *build* logs, never runtime ones. The user had to open the dashboard directly and paste the stack trace. **Lesson: if a route 500s in production with zero visible error and local repro fails, ask the user for the Vercel dashboard Runtime Logs early — don't burn cycles on speculative bundler/config changes first.** Runtime log retention is short (~1 hour on this plan), so trigger a few fresh failing requests immediately before asking the user to go look.

The actual error: `Error: require() of ES Module .../jose/dist/webapi/index.js from .../jwks-rsa/src/utils.js not supported ... code: 'ERR_REQUIRE_ESM'`. `firebase-admin@14.1.0` → `jwks-rsa@4.1.0` does a plain `require('jose')` in its CJS source, but `jose` v5+ dropped its CommonJS build entirely (pure ESM). That `require()` throws on Vercel's Node runtime specifically (never established exactly why local Node didn't hit the same wall — plausibly a newer local Node version's more permissive require(esm) interop, or a difference in how Next's dev/start server resolves modules vs. the packaged Vercel function — but the *fix* doesn't depend on knowing that). `jwks-rsa`'s own `package.json` still declares `"jose": "^6.1.3"` (not yet patched upstream).

**Fix:** pin `jose` to `4.15.9` (last major version with a real CJS build — `exports.require` → `dist/node/cjs/index.js`) via npm `overrides` in `package.json`. Verified safe: `jwks-rsa` only calls `jose.importJWK()` and `jose.exportSPKI()`, both stable APIs present since jose v4. Verified fixed live: all three routes now return their correct designed status codes (400/401/400 instead of 500), including a deliberately-bad webhook signature correctly rejecting with `invalid-signature` — proof the fix reaches real Stripe/Firebase logic, not just "stopped crashing." Remove the override once `jwks-rsa` ships a fix.
