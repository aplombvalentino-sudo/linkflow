# Journal Register â€” linkflow

> Dated factual log, one block per session. Read the SUMMARY first, jump by line number, update the SUMMARY after adding a block.

## SUMMARY

| Date | Line | Session focus |
|------|------|---------------|
| 20260713 | 13 | Project scaffolded from Web App Factory Core |
| 20260713 | 18 | Phases 0-6: discovery, architecture, design system, cinematic landing built (stable), copy/CRO, hand-off |
| 20260714 | 30 | Backend migrated Supabase -> Firebase at user request (D-002); stable gate green |

---

## 20260713 â€” Scaffolded
- Created from the Web App Factory Core scaffolder. `.claude/` brain copied live; overlay files (Supabase clients, middleware, env example, gitignore) in place.
- next: set `.env.local`, `npm run dev`, then tell orchestrator-webapp-factory "start new webapp cycle".

## 20260713 — LinkFlow phases 0–6
- Discovery locked: creators/influencers, cinematic dark + neon, full scroll scrub, glassmorphism, live demo hero, Free + Pro EUR 9/mo, confident & cool tone, fitness demo persona.
- Shipped: 5-chapter scroll-scrubbed landing + auth stubs; stable gate green (tsc, eslint, next build).
- Artifacts: specs/{product,design}-onepager.md, architecture.md, landing-wireframe.md, implementation-plan.md; design-system/MASTER.md; content/copy-cro.md; supabase/migrations/001_init.sql.
- Skills used: ui-ux-pro-max (design system queries), cro/copywriting/copy-editing/marketing-psychology (copy pack), coreyhaines31/marketingskills installed (46 skills).
- next: apply migration to a real Supabase project, wire auth + public profile + dashboard (implementation-plan.md steps 1-8), legal gate, deploy.

## 20260714 — Supabase -> Firebase migration (D-002)
- User chose "switch to Firebase entirely" (after `npm install firebase`). Logged as decision D-002.
- Removed: `src/lib/supabase/`, `supabase/migrations/001_init.sql`, `@supabase/ssr`, `@supabase/supabase-js`, `SUPABASE_SETUP.md`.
- Added: `src/lib/firebase/{client,admin,queries}.ts`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `FIREBASE_SETUP.md`, `firebase`+`firebase-admin`+`server-only` deps.
- Rewrote: `src/middleware.ts` (session-cookie presence, Edge-safe), `specs/architecture.md` (v3 Firestore), `specs/implementation-plan.md`, app `CLAUDE.md`, `.env.local.example`, auth-card microcopy, product-onepager + copy-cro one-liners.
- Data model map: Postgres tables -> Firestore collections; RLS -> Security Rules; definer RPCs -> Admin-SDK functions; citext-unique handle -> `handles/{handleLower}` reservation txn; session-refresh middleware -> `__session` presence + `/dashboard`-layout `verifySessionCookie`.
- Gate: tsc + eslint + next build all green. Fresh dev server: no server/console errors. Stale-console false alarm: old tab retained @supabase/ssr module-not-found from prior server instances across restarts (B-001 OneDrive cache); fresh tab + preview_logs confirmed clean.
- next: unchanged steps 1-8 in implementation-plan.md, now Firebase-flavored.
