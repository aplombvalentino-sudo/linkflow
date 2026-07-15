# Decisions Register â€” linkflow

> Architectural & product decisions. Read this SUMMARY first, jump by line number, never reload blindly. Update the SUMMARY after adding an entry.

## SUMMARY

| ID | Line | Decision | Status |
|----|------|----------|--------|
| D-001 | 15 | Fixed stack & Option A architecture (inherited from Web App Factory Core) | superseded by D-002 (backend only) |
| D-002 | 20 | Backend switched Supabase → Firebase (Auth + Firestore) at user request | active |

---

## D-001 â€” Fixed stack & architecture
- date: 20260713
- decision: linkflow uses the factory's fixed stack â€” Next.js 15 (App Router) + React + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres/Auth/RLS) + Stripe (if billing) â†’ Vercel. Architecture = Option A (`/`, `/dashboard/*`, `/legal/*`, `/api/*`).
- why: inherited from Web App Factory Core; deviations must be logged here and approved by orchestrator-webapp-factory.

## D-002 â€” Backend: Supabase â†’ Firebase
- date: 20260714
- decision: Replace the factory-default Supabase backend with Firebase (Auth + Firestore) for linkflow only. Everything else in D-001 (Next.js 15, Tailwind, shadcn/ui, Stripe, Vercel, Option A) stands.
- what changed: Postgres tables â†’ Firestore collections; RLS â†’ `firestore.rules`; security-definer RPCs (`record_view`/`record_click`/`get_profile_stats`) â†’ Admin-SDK functions in `src/lib/firebase/queries.ts`; `@supabase/ssr` session-refresh middleware â†’ `__session` cookie presence check + `/dashboard`-layout `verifySessionCookie`; `handle citext unique` â†’ `handles/{handleLower}` reservation transaction; `supabase/migrations/001_init.sql` + `src/lib/supabase/` removed; `firebase.json`/`firestore.indexes.json`/`FIREBASE_SETUP.md` added.
- why: explicit user request (chose "switch to Firebase entirely" over keeping Supabase). Deviates from the factory fixed stack; logged here per the D-001 rule.
- caveats: Admin SDK is Node-only (no Edge), hence the middleware/layout auth split; Firestore has no server-side aggregation (JS fold in `getProfileStats`, counter-doc pattern is the scale-up) and no unique constraint (handle lock). The factory `.claude/` brain (agents/skills) still documents Supabase as the default â€” intentionally not rewritten; only this app deviates.
