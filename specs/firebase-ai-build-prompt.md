# Prompt for the Firebase AI — build LinkFlow's product features

> Paste everything below the line into the Firebase Studio App Prototyping agent
> (or Gemini in Firebase), pointed at the existing `linkflow` repo. It extends the
> app that's already built — it does not start over.

---

You are extending an existing **Next.js 15 (App Router)** app called **LinkFlow**, a
Linktree-style "link in bio" SaaS for creators. The Firebase project (`linkflow-b4137`)
is already created and connected via `.env.local`. The public landing page, design
system, and Firebase library layer are already built and must **not** be rebuilt or
restyled. Your job is to add the backend-connected product features listed under
"BUILD THESE", reusing the existing files and conventions exactly.

## Stack (already installed — do not add alternatives)
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Framer Motion, lucide-react
- `firebase` (web SDK) + `firebase-admin` (Admin SDK) + `server-only`
- Firebase Auth (Email/Password) + Cloud Firestore
- Architecture "Option A": `/` landing · `/[handle]` public profiles · `/dashboard/*` protected (auth-gated) · `/api/*` route handlers + Server Actions · `/legal/*`
- Server Components by default; add `"use client"` only where interactivity requires it.

## Existing files you MUST reuse (do NOT duplicate, rewrite, or restyle)
- `src/lib/firebase/client.ts` — exports `auth`, `db`, `firebaseApp`, `isFirebaseConfigured` (web SDK; client components).
- `src/lib/firebase/admin.ts` — exports `adminAuth`, `adminDb`, `SESSION_COOKIE` (= `"__session"`). Server-only (`import "server-only"`). NEVER import from a client component.
- `src/lib/firebase/queries.ts` — server functions already implemented: `recordView(profileId, referrer, device, visitorHash)`, `recordClick(linkId, referrer, device, visitorHash) → url|null`, `reserveHandle(handle, profileId, userId)`, `getProfileStats(profileId, days) → {totalViews, totalClicks, daily[], topReferrers[]}`. Call these instead of writing new Firestore access for those operations.
- `src/middleware.ts` — already gates `/dashboard/*` on presence of the `__session` cookie (and short-circuits in demo mode). Do not change its matcher.
- `firestore.rules` + `firestore.indexes.json` — security rules and composite indexes (already deployed). If you add a query that needs a new index, add it here.
- `src/components/profile/profile-card.tsx` — the animated public-profile card (glass tiles, theme accent, staggered entrance). Reuse it for BOTH the public `/[handle]` page and the dashboard live preview.
- `src/lib/demo-data.ts` — the `DemoProfile` / `DemoLink` / `DemoTheme` TypeScript shapes and `THEME_ACCENT` map. Mirror these field names in the real Firestore types.
- Design tokens in `src/app/globals.css` — colors `ink-950/900/800`, `volt` (#D4FF3F), `violet` (#7C6CFF), `ember` (#FF8A3D), `text-hi`, `text-lo`, `danger`; utility classes `.glass`, `.glass-2`, `.tile`, `.glow-volt`; fonts `font-heading` (Space Grotesk), `font-body` (DM Sans), `font-mono` (Space Mono, use for all numerals with `tabular-nums`). Use ONLY these tokens — no new palette, no new fonts.

## Firestore data model (already enforced by `firestore.rules` — match exactly)
```
users/{uid}          { email, plan: 'free'|'pro', stripeCustomerId?, createdAt }
                     // doc id = Firebase Auth uid.
profiles/{profileId} { userId, handle, handleLower, displayName, bio, avatarUrl?,
                       theme: 'volt'|'violet-hour'|'ember', isPublished, createdAt, updatedAt }
handles/{handleLower}{ profileId, userId, createdAt }   // uniqueness lock, Admin-write only
links/{linkId}       { profileId, userId, title, url, thumbnailUrl?, position,
                       isActive, clickCount, createdAt }   // userId denormalized for rules
profileViews/{autoId}{ profileId, viewedAt, referrer?, device, visitorHash }  // Admin-only
linkClicks/{autoId}  { linkId, profileId, clickedAt, referrer?, device, visitorHash } // Admin-only
```
Rules already in place: owner-only CRUD on users/profiles/links; public read of profiles where `isPublished==true` and links where `isActive==true`; `handles` public-read / Admin-write; analytics collections have NO client access (Admin SDK only). Respect this — never write analytics events from the client.

## BUILD THESE (in order)

### 1. Auth flow (Email/Password)
- Update `src/components/auth/auth-card.tsx` (currently a demo stub) to call the web SDK:
  signup → `createUserWithEmailAndPassword`; login → `signInWithEmailAndPassword`.
- On success, get the Firebase ID token and POST it to `POST /api/auth/session` (new route handler): verify it with `adminAuth.verifyIdToken`, mint a session cookie with `adminAuth.createSessionCookie` (14-day expiry), and set it as an httpOnly, secure, sameSite=lax cookie named `__session`.
- On signup: create the `users/{uid}` doc (Admin, plan `'free'`), and if a handle was entered, create the first `profiles` doc + `reserveHandle` in one flow. Enforce the reserved-handle blocklist: `admin, api, dashboard, login, signup, legal, r, auth, _next, settings, about, pricing, help, support, terms, privacy, cookies`. Reject taken/reserved handles with a clear inline error.
- Add `POST /api/auth/signout` that clears the `__session` cookie.
- The `/dashboard` layout (Server Component) must call `adminAuth.verifySessionCookie(cookie, true)`; on failure redirect to `/login`. (Middleware only checks presence — the cryptographic check lives here.)
- Keep the existing glass card visual; only wire the logic.

### 2. Public profile — `app/[handle]/page.tsx`
- Server Component. Look up `handles/{handle.toLowerCase()}` → profile; if missing or `isPublished==false`, return `notFound()`.
- Load the profile's active links ordered by `position`, map to the `ProfileCard` props shape, render `<ProfileCard>`.
- Fire `recordView(...)` server-side (compute `visitorHash` = SHA-256 of `ip + userAgent + dailySalt`; never store raw IP). Compute `device` from the UA.
- `export const revalidate = 60` (ISR). Add `generateMetadata` for per-profile title/OG.

### 3. Click redirect — `app/r/[linkId]/route.ts`
- GET handler: call `recordClick(linkId, referrer, device, visitorHash)`; if it returns a URL, `redirect(302)` to it; else `notFound()`. Public profile link tiles must point at `/r/{linkId}`, not the raw URL, so clicks are tracked server-side (survives ad-blockers / JS-off).

### 4. Dashboard — `app/dashboard/*`
- Left-rail nav (glass, active = volt-dim pill, lucide icons) per the design system; mobile bottom tab bar.
- **Profiles list** (`/dashboard`): the user's profiles as glass cards with live `ProfileCard` preview; "New profile" gated by plan (Free = 1, Pro = 10 — enforce in the Server Action, not just UI; show an upgrade prompt when the Free limit is hit).
- **Profile editor** (`/dashboard/[profileId]`): edit displayName, bio, avatar, theme (volt/violet-hour/ember), publish toggle; **links CRUD** with drag-to-reorder (Server Actions: `createLink`, `updateLink`, `deleteLink`, `reorderLinks(profileId, orderedIds)`), each with title/url/thumbnail/active toggle. Live preview via `ProfileCard` updates as you edit.
- **Analytics** (`/dashboard/[profileId]/analytics`): read `getProfileStats(profileId, days)` in the Server Component; render the total-views/total-clicks stat cards (Space Grotesk numerals, `tabular-nums`), a 7-point sparkline (line only, no fill/axes), per-link CTR rows, and top referrers. Free plan caps `days` at 7; Pro sees full history. Use the analytics-card visual language already prototyped in `src/components/landing/scene-features.tsx`.
- All dashboard mutations are owner-scoped Server Actions that re-check ownership server-side.
- Include empty states ("No links yet. Add your first — it takes 10 seconds."), loading skeletons (shimmering glass), and error states.

### 5. RGPD endpoints (required before any deploy)
- `DELETE /api/user/delete` — for the signed-in uid: batch-delete their docs across `profiles`, `links`, `handles`, `profileViews`, `linkClicks`, then `users/{uid}`, then `adminAuth.deleteUser(uid)`, then clear the session cookie.
- `GET /api/user/export` — return a JSON dump of the signed-in user's docs across all collections.

## Conventions & hard constraints
- **Do not touch** `src/app/page.tsx` (landing) or any `src/components/landing/*` except reading them for style reference. Do not change the design tokens or fonts.
- **Anti-slop rules (enforced):** no generic 3-card grids, no Lorem Ipsum, no emoji as icons (lucide SVG only), no new gradients/fonts, one primary (volt) CTA per view, hover states never shift layout (color/opacity/translate only), every clickable element gets `cursor-pointer` + visible focus ring, respect `prefers-reduced-motion`.
- **Security:** the Admin private key stays server-only (never `NEXT_PUBLIC_`); never write analytics events from the client; every user-data query is owner-scoped; validate/normalize URLs before storing links.
- **No fabricated data** — no fake testimonials, counts, or avatars.
- **Types:** strong TypeScript throughout; the build must pass `npx tsc --noEmit && npx eslint . && npx next build`.
- Keep each file to one responsibility (~300-line ceiling); organize by feature (`auth`, `dashboard`, `profile`).

## Definition of done
- Sign up → session cookie set → land on `/dashboard`; refresh keeps the session; logout clears it; `/dashboard` redirects to `/login` when signed out.
- Create a profile + links; visit `/[handle]` and see them rendered by `ProfileCard`; clicking a tile routes through `/r/[linkId]`, records a click, and redirects.
- Analytics page shows real view/click/CTR numbers from Firestore.
- Free account blocked at 2nd profile with an upgrade prompt; Pro allows up to 10.
- RGPD delete removes all of the user's data + auth record; export returns their JSON.
- `tsc`, `eslint`, and `next build` all pass.
