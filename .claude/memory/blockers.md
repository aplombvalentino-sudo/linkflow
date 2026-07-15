# Blockers Register â€” linkflow

> Frictions, root causes, solutions. Read the SUMMARY first, jump by line number, update the SUMMARY after adding an entry.

## SUMMARY

| ID | Line | Blocker | Root cause | Status |
|----|------|---------|------------|--------|
| B-001 | 15 | Turbopack file-watching blind on OneDrive path | OneDrive sync defeats FS events; .next cache serves stale CSS/JS | documented (restart dev + rm .next; move repo off OneDrive) |
| B-002 | 20 | Raw backdrop-filter stripped from plain CSS rules by Tailwind v4/Lightning CSS pipeline | custom properties outside @utility get pruned | solved (define custom classes with @utility) |
| B-003 | 25 | Browser-pane screenshots + rAF suspended (visibilityState=hidden) | preview surface not visible to user; frame production paused | worked around (DOM/JS verification; visual check pending user opening preview) |
| B-004 | 30 | Firebase server-side auth (Admin SDK / Firestore) returns UNAUTHENTICATED in this sandbox | sandbox clock is future-dated (2026-07-14); Google OAuth rejects the JWT iat/exp timeframe | env-only: credentials are valid, works on a real-clock machine |

<!-- Add entries as B-001, B-002, ... Log any obstacle that costs > 30 min. -->

### B-001 — OneDrive vs Turbopack watching
Edits to src/ were never recompiled (no Fast Refresh events); .next persisted stale output across restarts. Fix: `rm -rf .next` + restart after edits, or relocate project to a non-OneDrive path.

### B-002 — backdrop-filter stripped
`.glass { backdrop-filter: blur(16px) }` in plain CSS reached the browser without the declaration. Moving the class to Tailwind v4 `@utility glass { ... }` preserved it. Rule: in Tailwind v4 projects, define custom utility classes via @utility, not bare selectors.

### B-003 — hidden preview surface
All framer-motion animation is rAF-driven; with the pane hidden, rAF never ticks -> entrance animations pending, useScroll static, screenshots time out. Not a code bug: verified fonts/tokens/glass/DOM structure via JS; animations follow standard patterns and run when the page is actually viewed.

### B-004 — Firebase server auth can't complete in-sandbox (clock skew)
Real project `linkflow-b4137` wired into `.env.local` (verified: key length 1704, all 10 vars present, gitignored). Admin SDK inits fine and google-auth SIGNS the JWT with the key without error, but Google's token endpoint returns `invalid_grant: Token must be a short-lived token (60 minutes) and in a reasonable timeframe. Check your iat and exp values` → Firestore call = `16 UNAUTHENTICATED`. Root cause: the sandbox wall clock reads 2026-07-14, outside Google's acceptable JWT-timestamp window vs real server time. The credentials themselves are valid (a bad key gives "Invalid JWT Signature", a different message). This is an execution-environment limit, NOT a config bug — the same `.env.local` authenticates on a correctly-clocked machine. Consequence: any server-side Firebase call (session-cookie mint/verify, Firestore reads/writes, RGPD delete) can't be end-to-end tested here; verify those on the user's machine. Demo mode is OFF and confirmed: `/dashboard` → `/login?redirectedFrom=/dashboard`, no console errors.
