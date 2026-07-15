# LinkFlow — Architecture & Data Model (v3, Firebase)

**Date:** 2026-07-13 (v2 Supabase) → **2026-07-14 (v3: migrated to Firebase at user request).**
**Phase:** 2 · **No UI in this phase.**

> **Backend change:** the factory default is Supabase (Postgres + RLS). This app was
> switched to **Firebase (Auth + Firestore)** on 2026-07-14. The relational schema below
> became Firestore collections, RLS became Security Rules, and the security-definer RPCs
> became Admin-SDK functions in `src/lib/firebase/queries.ts`. Decision logged in
> `.claude/memory/decisions.md`.

## Tech stack

- **Frontend:** Next.js 15 (App Router, Server Components default) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui.
- **Animation:** Framer Motion (`useScroll`/`useTransform` scrub, springs, layout animations). One library only — no GSAP double-dependency.
- **Auth:** Firebase Auth (email/password + OAuth). Session = httpOnly `__session` cookie minted by the Admin SDK (`createSessionCookie`); verified in the `/dashboard` server layout.
- **DB:** Cloud Firestore. Client reads/writes governed by `firestore.rules`; all privileged work via Admin SDK (`src/lib/firebase/admin.ts`).
- **Analytics:** first-party collections (`profileViews`, `linkClicks`) written only by the Admin SDK; JS aggregation (`getProfileStats`). No third-party tracker (RGPD-lean).
- **Billing (Pro €9/mo):** Stripe Checkout + webhook → `users.plan`. Stubbed in v1 UI, wired when keys exist.
- **Deploy:** Vercel (REST API + CLI via `vercel-auto-deploy`). Firestore rules/indexes deployed via `firebase deploy`.
- **Architecture Option A:** `/` landing · `/[handle]` public profiles · `/dashboard/*` protected · `/legal/*` · `/api/*`.

## Data model (Firestore collections)

Top-level collections (flat, not subcollections — keeps Security Rules simple and lets
collection-group-free queries filter by `profileId`). `userId` is denormalized onto
`links` so ownership is checkable in rules without a join.

```
users/{uid}
  { email, plan: 'free'|'pro', stripeCustomerId?, createdAt }
  // doc id = Firebase Auth uid. Created by the signup route handler (Admin).

profiles/{profileId}
  { userId, handle, handleLower, displayName, bio, avatarUrl?,
    theme: 'volt'|'violet-hour'|'ember', isPublished, createdAt, updatedAt }

handles/{handleLower}                       // uniqueness lock (no unique constraint in Firestore)
  { profileId, userId, createdAt }

links/{linkId}
  { profileId, userId, title, url, thumbnailUrl?, position,
    isActive, clickCount, createdAt }        // clickCount = denormalized cache

profileViews/{autoId}                        // append-only, Admin-only
  { profileId, viewedAt, referrer?, device, visitorHash }

linkClicks/{autoId}                          // append-only, Admin-only
  { linkId, profileId, clickedAt, referrer?, device, visitorHash }
```

No raw IP / no PII on events (RGPD): `visitorHash` = daily-salted SHA-256 of ip+ua,
computed server-side and discarded. Composite indexes for the event/time and
`(profileId, position)` queries are declared in `firestore.indexes.json`.

### Security Rules (replaces RLS — `firestore.rules`)

- `users/{uid}`: owner read/update/create (`request.auth.uid == uid`); delete only via Admin (RGPD endpoint).
- `profiles`: public read where `isPublished == true`, else owner; owner create/update/delete (`isOwner(userId)`).
- `links`: public read where `isActive == true`, else owner; owner create/update/delete. (Parent-published gating is applied server-side during the SSR profile render.)
- `handles`: public read (availability check); **writes Admin-only** (reservation transaction).
- `profileViews` / `linkClicks`: **no client access at all** — reads via `getProfileStats` (server), writes via `record*` (server). Unspoofable.

### Server data functions (`src/lib/firebase/queries.ts`, Admin SDK)

| Function | Was (Postgres RPC) | Behavior |
|---|---|---|
| `recordView` | `record_view` | append a `profileViews` doc |
| `recordClick` | `record_click` | append `linkClicks`, `FieldValue.increment(clickCount)`, return target URL |
| `reserveHandle` | `citext unique` + app list | transaction against `handles/{handleLower}`, throws `handle-taken` |
| `getProfileStats` | `get_profile_stats` | read event window, fold to totals/daily/top-referrers in JS; Free capped at 7 days |

Firestore has no server-side SQL aggregation, so `getProfileStats` reads the windowed
event docs via Admin and aggregates in JS — fine at v1 scale; a counter-doc aggregation
pattern is the scale-up path (noted below).

## API surface

**Public**
- `GET /[handle]` — SSR public profile (ISR 60s); calls `recordView` server-side.
- `GET /r/[linkId]` — click-through: `recordClick` → 302 to the target URL. Server-side redirect = tracking that survives ad-blockers and JS-off.

**Auth** — `/login`, `/signup` (Firebase Auth client) → `POST /api/auth/session` mints the `__session` cookie via `createSessionCookie`; `POST /api/auth/signout` clears it. Middleware checks cookie presence; `/dashboard` layout verifies it cryptographically.

**Dashboard (Server Actions, owner-scoped; ownership re-checked server-side)**
- `createProfile / updateProfile / deleteProfile` (plan gate: Free = 1 profile, Pro = 10; `reserveHandle` on create)
- `createLink / updateLink / deleteLink / reorderLinks(profileId, orderedIds)`
- Analytics pages read via `getProfileStats` in Server Components.

**RGPD (required by legal gate)** — `DELETE /api/user/delete` (delete Firestore docs for the uid across all collections + `adminAuth.deleteUser`), `GET /api/user/export` (JSON dump of the user's docs).

**Billing** — `POST /api/stripe/checkout`, `POST /api/stripe/webhook` (plan sync → `users.plan`).

---

## Agentic loop record

**v1→v2 weaknesses found (critique, still applies under Firebase):**
1. Raw `ip` on events — RGPD red flag → daily-salted `visitorHash`, raw IP never persisted.
2. Client-side click beacon — loses ~10–15% to ad-blockers → `/r/[linkId]` server redirect.
3. Per-link `count(*)` at read time (N+1) → `getProfileStats` single window read + `clickCount` cache.
4. Case-colliding handles (`@Sam` vs `@sam`) → `handleLower` + `handles/{handleLower}` lock + reserved list (`admin`, `api`, `dashboard`, `legal`, `login`, `r`, …).
5. Spoofable client-written analytics → events are Admin-SDK-only (rules deny all client access).
6. Multi-profile plan limit enforced in the Server Action (authoritative), not just UI.

**v3 Firebase-migration notes:**
7. No SQL aggregation → JS fold in `getProfileStats`; scale-up = per-day counter docs (`profiles/{id}/daily/{yyyymmdd}` incremented in `recordView`) to avoid reading every event.
8. No unique constraint → `reserveHandle` transaction; the reserved-word list still lives in the app layer.
9. Admin SDK can't run on the Edge → session split: middleware = cookie-presence, `/dashboard` layout = `verifySessionCookie`. Documented in `FIREBASE_SETUP.md`.
10. Cascade delete (`on delete cascade`) has no Firestore equivalent → RGPD delete endpoint explicitly batch-deletes the user's docs across all collections before `deleteUser`.
