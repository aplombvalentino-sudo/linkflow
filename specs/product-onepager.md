# LinkFlow — Product One-Pager (v2, post-critique)

**Date:** 2026-07-13 · **Phase:** 1 (discovery locked) · **Owner:** Webapp Factory Core

## Positioning

**One line:** Linktree is a list. LinkFlow is a stage.

Linktree won by being the neutral utility — a white page with buttons. That neutrality
is now its weakness: every creator's bio link looks identical, and the page carries none
of the brand the creator spent years building. LinkFlow is the bio link for creators who
treat their feed like a set: animated, themed, cinematic profiles that feel like *their*
brand, with analytics they'll actually open.

**Against Linktree, we do NOT compete on:** integrations count, enterprise features,
social-platform breadth.
**We compete on:** how the page *feels* (motion, depth, theme), speed to a
brand-consistent result, and analytics presented with taste.

## Audience (locked)

Creators & influencers — primary persona: **fitness / lifestyle creator** (programs,
affiliate links, booking, community). Secondary: any IG/TikTok/YouTube creator who
wants the link to match the brand.

## v1 core features (tight scope)

1. **Accounts & profiles** — email/OAuth sign-up (Firebase Auth); Free = 1 profile,
   Pro (€9/mo) = up to 10 profiles under one account.
2. **Unlimited links** — title, URL, optional thumbnail; drag-to-reorder; show/hide.
3. **Animated themes** — 3 launch themes built from the design system (Volt, Violet
   Hour, Ember); Pro unlocks all + hides LinkFlow branding.
4. **Basic analytics** — profile views, link clicks, CTR per link, top referrers,
   7/30-day trend. Free sees 7 days; Pro sees full history.
5. **Public profile** — `linkflow.app/@handle`, sub-100KB critical path, animated but
   fast on mobile; QR code download.

**Explicitly out of v1:** custom domains, team seats, email capture blocks, shop/payment
blocks, A/B testing, API.

## Differentiators

- **Motion as brand** — profiles animate (entrance choreography, hover depth, theme
  gradients) without hurting load time.
- **Narrative landing** — the marketing site itself is the demo: a scroll-scrubbed,
  cinematic experience that proves the product promise before the fold ends.
- **Analytics with taste** — numbers in tabular mono, sparklines, zero dashboard-soup.

## Business model

Free (1 profile, unlimited links, 7-day analytics, LinkFlow badge) → **Pro €9/mo**
(10 profiles, all themes, full analytics history, no badge). Single upgrade path,
one price, no tier matrix in v1.

---

## Agentic loop record

**v1 draft weaknesses (self-critique):**
- Positioning said "empower creators to stand out" — banned generic-AI phrasing; replaced
  with the list/stage contrast.
- v1 feature list included custom domains, email capture, and shop blocks — scope creep
  that guarantees a shallow build; cut and listed as explicit non-goals.
- Differentiators were adjectives ("beautiful", "modern"); rewritten as mechanisms
  (motion as brand, landing-as-demo, mono-numeral analytics).
- Pricing had 3 tiers; collapsed to Free/Pro — one decision, one CTA.
