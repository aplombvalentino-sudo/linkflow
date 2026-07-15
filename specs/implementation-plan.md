# LinkFlow — Implementation Plan & Hand-off (Phase 6)

**Date:** 2026-07-13 · Status: landing SHIPPED (stable gate green), product wiring PLANNED.

## What is built and verified

- **Cinematic landing** (`/`) — 5 chapters, scroll-scrubbed: pinned hero with glass phone
  demo, horizontal "Why not Linktree" track (swipe-snap on mobile), 4 feature story beats
  (fan / live counter / theme cycler / self-drawing QR), demo-profile proof reel, Free/Pro
  pricing strip, final CTA. Real copy throughout (content/copy-cro.md).
- **Auth stubs** (`/login`, `/signup`) — glass forms, demo-mode notice, no dead CTAs.
- **Gate:** `npx tsc --noEmit && npx eslint src && npx next build` — all green,
  4 static routes.
- **DB layer (Firebase)** — `firestore.rules` + `firestore.indexes.json` (owner CRUD,
  public read on published/active, Admin-only events) and `src/lib/firebase/queries.ts`
  (`recordView`/`recordClick`/`reserveHandle`/`getProfileStats`). Ready to deploy.
  _(Backend migrated from Supabase → Firebase on 2026-07-14 at user request; see
  `.claude/memory/decisions.md` and `specs/architecture.md` v3.)_

## File structure (implemented)

```
linkflow/
├─ design-system/MASTER.md          ← design source of truth (Neon Glass Cinema)
├─ specs/{product,design}-onepager.md · architecture.md · landing-wireframe.md · implementation-plan.md
├─ content/copy-cro.md              ← copy pack + CRO audit
├─ firebase.json · firestore.rules · firestore.indexes.json   ← Firestore config
├─ FIREBASE_SETUP.md
└─ src/
   ├─ middleware.ts                 ← __session cookie gate on /dashboard (demo-mode guard)
   ├─ app/
   │  ├─ layout.tsx                 ← fonts (Space Grotesk/DM Sans/Space Mono), noscript fallback
   │  ├─ globals.css                ← tokens as @theme + @utility glass/glass-2/tile/glow-volt
   │  ├─ page.tsx                   ← landing (scene composition, Server Component shell)
   │  └─ (auth)/{login,signup}/page.tsx
   ├─ components/
   │  ├─ landing/ nav · magnetic-button · scene-{hero,why-not,features,proof,pricing,final-cta}
   │  ├─ profile/profile-card.tsx   ← THE product visual, reused by 4 scenes
   │  └─ auth/auth-card.tsx
   └─ lib/ demo-data.ts · firebase/{client,admin,queries}.ts
```

## Where animation logic lives

- **Scroll scrub:** each pinned scene owns its `useScroll({ target, offset })` +
  `useTransform` maps (scene-hero, scene-why-not, scene-proof). Pattern: outer section
  = scroll budget (260–300vh), sticky child = the stage.
- **Entrance choreography:** `initial`/`animate` on mount (hero words), `whileInView`
  with `viewport={{ once: true }}` elsewhere.
- **Micro-interactions:** `magnetic-button.tsx` (spring 220/26, pull ≤8px); tile hovers
  are pure CSS (`transition-transform`, translate only — no layout shift).
- **Reduced motion:** every scene checks `useReducedMotion()` and degrades to static
  frames/crossfades; `<noscript>` fallback in layout.tsx un-hides SSR'd initial states.
- Motion tokens (durations, easings, amplitudes): design-system/MASTER.md §4.

## Next build steps (product wiring, in order)

1. **Firebase project** — create, register web app, generate service account, fill
   `.env.local` (middleware auto-exits demo mode once `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   is real), `firebase deploy --only firestore:rules,firestore:indexes`. See
   `FIREBASE_SETUP.md`.
2. **Auth** — swap `auth-card.tsx` demo submit for `signInWithEmailAndPassword` /
   `createUserWithEmailAndPassword`; add `POST /api/auth/session` (mints `__session` via
   `createSessionCookie`) + `POST /api/auth/signout`; `/dashboard` layout verifies the
   cookie (`verifySessionCookie`); `reserveHandle` in the signup action.
3. **Public profile** `/[handle]/page.tsx` — render ProfileCard from Firestore (ISR 60s),
   server-side `recordView` (hash ip+ua with daily salt, discard raw).
4. **Click redirect** `/r/[linkId]/route.ts` — `recordClick` → 302.
5. **Dashboard** `/dashboard` — profiles list → links CRUD (Server Actions:
   create/update/delete/reorder, plan gate Free=1/Pro=10) → analytics page reading
   `getProfileStats` into the analytics-card component (already designed in scene-features).
6. **RGPD endpoints** — `DELETE /api/user/delete` (batch-delete the uid's docs across all
   collections + `adminAuth.deleteUser`), `GET /api/user/export` + `/legal/*` pages via
   `legal-compliance-agent` (**hard gate before deploy**).
7. **Stripe** — Checkout + webhook → `users.plan` (Pro €9/mo).
8. **Deploy** — `vercel-auto-deploy` skill; project name `webapp-linkflow-<date>`.

## Local dev

```bash
cd linkflow && npm install && npm run dev   # http://localhost:3000
```
⚠ **OneDrive caveat (learned this session):** Turbopack file-watching misses changes on
this OneDrive path — after editing, restart the dev server (`rm -rf .next` if CSS looks
stale). Long-term fix: move the repo to a local path (e.g. `C:\dev\linkflow`).

## Agentic loops run (summary)

| Phase | v1 → v2 change that mattered most |
|---|---|
| 0 | 3 catalog styles → hybrid (pattern ① + surface ② + type ③) after "pink SaaS / Inter-on-black" critique |
| 1 | Scope cut (domains/shop/email out), 3 tiers → Free/Pro, adjectives → mechanisms |
| 2 | Raw IP → salted visitor_hash; client beacon → /r redirect; client-insert RLS → definer RPCs |
| 2b (Firebase migration, 07-14) | Supabase→Firebase at user request: Postgres tables → Firestore collections, RLS → Security Rules, definer RPCs → Admin-SDK `queries.ts`, session-refresh middleware → `__session` presence + layout `verifySessionCookie` |
| 3 | Glass-on-glass noise → 3 elevation levels; sticky full-width nav → floating pill; scale hovers → translate |
| 4 | 3 volt CTAs above fold → 1; nested backdrop-filters (~40) → flat tiles (perf); testimonial quotes → labeled demos |
| 5 | Generic headline/boilerplate pricing header killed; exclamation marks stripped |

## Anti-slop assurance

Tokens + rules enforced from `ui-ux-pro-max` catalog data (design-system/MASTER.md §6):
no card grids >3, no Lorem Ipsum, no emoji icons (Lucide only), banned pink-purple AI
gradient + Inter headings, one CTA per fold, every scene has a motion purpose, hovers
never shift layout. Copy passed the cro/copywriting/copy-editing skill frameworks with
an honest trust-signal gap documented (no fabricated proof).
