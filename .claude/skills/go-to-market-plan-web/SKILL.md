---
name: go-to-market-plan-web
description: Use whenever a built web app needs a launch plan — covers SEO meta/OG/sitemap/robots/Core Web Vitals, ProductHunt launch kit, landing-page + pricing copy, social proof, and a 3-email onboarding sequence. Triggers at the "marketing" stage of the factory pipeline (build -> design -> security-audit -> legal -> marketing) or whenever someone asks for GTM, launch strategy, channel plan, ProductHunt copy, landing copy, or onboarding emails for a web app. Outputs marketing/gtm-plan.md with a sequenced first-30-days plan and KPIs.
---

## Purpose

Produce a concrete, executable go-to-market plan for a single web app built on the fixed factory stack (Next.js 15 / Supabase / Stripe / Vercel, Option A single-domain). The output is one file — `marketing/gtm-plan.md` — that any operator can run line by line with no further decisions. Every channel section ships real templates, real file contents, and measurable thresholds, not advice.

## When to use

- The app has passed `security-audit` and `legal` (green check from legal-compliance-agent). GTM copy that promises features must match the shipped product and the legal pages.
- The orchestrator reaches the `marketing` pipeline step, or a human asks for "launch plan", "GTM", "ProductHunt copy", "landing headline", "pricing copy", or "onboarding emails".
- Do NOT use to actually deploy SEO files — you produce the file contents here; the build/deploy agents wire them into the repo.

## Inputs you must gather first

Read these before writing anything. If missing, infer from repo and state assumptions explicitly in the plan.

- App slug, production domain (Vercel `webapp-{app-slug}-{YYYYMMDD}` -> custom domain).
- Spec: `.claude/memory/decisions.md` (positioning, ICP), the product spec doc, pricing tiers from the Stripe config.
- One-sentence value prop + top 3 features (from spec/landing).
- Primary ICP (who pays) and the single highest-intent keyword.

## Workflow

1. Read the spec and `decisions.md`; extract value prop, ICP, top 3 features, pricing tiers, primary keyword.
2. Draft SEO assets: per-route metadata table, OG tags, `sitemap.xml`, `robots.txt`, Core Web Vitals targets. Use Next.js App Router `metadata` / `generateMetadata` conventions.
3. Write the ProductHunt launch kit: tagline (<=60 chars), description, maker first-comment, full launch-day checklist with timestamps (PT).
4. Write landing-page copy: 3 hero headline variants (for A/B), subhead, primary CTA, pricing-page copy per tier, social-proof strategy.
5. Write the email onboarding sequence: welcome email + 3-email sequence with triggers, delays, subject lines, bodies, and one CTA each.
6. Assemble the first-30-days sequenced plan (day-by-day, owner, channel) and the KPI table with targets.
7. Write everything to `marketing/gtm-plan.md`. English only, dense, imperative.

## SEO channel

Targets (these are pass/fail gates, measured in Lighthouse / PageSpeed on the production URL):

| Metric | Target | Notes |
| --- | --- | --- |
| LCP | < 2.5 s | hero image `priority` + `next/image`; preconnect to Supabase |
| INP | < 200 ms | minimize client JS; Server Components default |
| CLS | < 0.1 | set explicit width/height on media; reserve ad/embed space |
| TTFB | < 0.8 s | Vercel edge; ISR/static for landing + blog |
| Lighthouse SEO | >= 95 | meta + structured data + crawlable links |

Per-route metadata (Next.js App Router, in each `page.tsx` or `layout.tsx`):

```ts
// app/page.tsx — landing
export const metadata = {
  title: "{App} — {primary benefit in <60 chars}",
  description: "{120–155 char benefit-led summary with primary keyword}",
  alternates: { canonical: "https://{domain}/" },
  openGraph: {
    title: "{App} — {benefit}",
    description: "{same as meta description}",
    url: "https://{domain}/",
    siteName: "{App}",
    images: [{ url: "https://{domain}/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "{App} — {benefit}",
    description: "{meta description}",
    images: ["https://{domain}/og.png"],
  },
};
```

Route metadata matrix to fill in the plan: `/` (landing), `/pricing`, `/blog`, `/blog/[slug]` (use `generateMetadata`), `/legal/*` (set `robots: { index: false }` on thin legal pages only if duplicative). OG image is a single 1200x630 PNG at `/public/og.png` (or dynamic `opengraph-image.tsx`).

`public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/
Sitemap: https://{domain}/sitemap.xml
```

`app/sitemap.ts` (Next.js generated, preferred over static file):

```ts
import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://{domain}";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.6 },
    // ...map published blog slugs here
  ];
}
```

Add JSON-LD `SoftwareApplication` (or `Product` + `Offer` for pricing) structured data in the landing `<head>` via a `<script type="application/ld+json">`.

## ProductHunt channel

Tagline (<= 60 chars, no period, lead with the verb-able benefit):
> `{App}: {benefit} without {pain}`  — e.g. "Shipfast: launch your SaaS landing page in an afternoon"

Description (260–320 chars):
> "{App} helps {ICP} {core job} so they can {outcome}. {Top feature 1}, {feature 2}, and {feature 3} — built on {one credibility hook}. Free tier, no credit card. Try it: https://{domain}"

Maker first comment (post within 1 min of going live):
> "Hey hunters 👋 I'm {name}, maker of {App}. I built this because {1-sentence origin / pain}. It does {core thing} — {one differentiator vs the obvious alternative}. {Launch-day offer: e.g. 'PH community gets 30% off annual with code PH30'}. I'm here all day — what would make this a no-brainer for you?"

Launch-day checklist (PH resets 00:00 PT; launch 00:01 PT Tue–Thu for max runway):

- T-7d: create draft, line up hunter (or self-hunt), prepare gallery (3–5 images + 1 demo GIF/video), confirm tagline/description.
- T-1d: warm up email/Slack/Discord lists with "we launch tomorrow" teaser; schedule social posts.
- 00:01 PT: publish; post maker first comment immediately.
- +5 min: notify inner circle (DM, not mass blast) to comment/upvote authentically — never buy votes (PH bans).
- Hourly 06:00–18:00 PT: reply to every comment within 30 min; post one update at midday.
- EOD: thank everyone; capture testimonials; export signups; log result in journal.
- T+1d: follow-up email to new signups; write a recap post.

## Landing-page copy

Hero — 3 headline variants for A/B (pick winner by CTA click-through):

- V1 (outcome): "{Achieve outcome} in {timeframe}."
- V2 (pain-removal): "Stop {pain}. {App} does it for you."
- V3 (audience-callout): "The {category} built for {ICP}."

Subhead (1 sentence, names the mechanism): "{App} {how it works} so you {benefit} — no {friction}."
Primary CTA: "Start free" (links to `/dashboard` signup). Secondary: "See pricing".

Pricing-page copy (mirror Stripe tiers; 3 tiers max). Per tier: name, price, one-line "best for", 4–6 feature bullets, CTA. Mark the middle tier "Most popular". Example:

| Tier | Price | Best for | CTA |
| --- | --- | --- | --- |
| Free | $0 | Trying it out | Start free |
| Pro | $19/mo | Solo builders | Start 14-day trial |
| Team | $49/mo | Small teams | Start 14-day trial |

Social-proof strategy (sequenced — never fake it):

1. Day 0: founder quote + "as seen on ProductHunt" badge once live.
2. Week 1–2: collect 3–5 testimonials via the onboarding email (ask power users); show logos if any B2B users consent.
3. Week 3+: add a live counter ("X teams using {App}") only once the number is non-trivial (>= 100); add star rating / PH badge.

## Email channel (onboarding)

Sequence runs on signup (Supabase Auth trigger -> queue / Resend / transactional provider). One CTA per email. Delays measured from signup.

Welcome email — trigger: signup confirmed. Delay: immediate.
> Subject: "You're in. Here's step 1."
> Body: "Welcome to {App}! The fastest path to {first value}: {single action, e.g. 'create your first project'}. → [Do it now]({domain}/dashboard). Reply to this email if you get stuck — a real human (me) reads every one."

Email 1 — Activation. Trigger: signup. Delay: +1 day (suppress if already activated).
> Subject: "Did {first value} click for you?"
> Body: "Most people get their first {win} within 10 minutes of {key action}. If you haven't yet, here's a 60-second walkthrough: [Watch]({link}). Stuck on {common blocker}? Here's the fix: {1 sentence}."

Email 2 — Feature depth / aha. Trigger: signup. Delay: +3 days.
> Subject: "The {App} feature people wish they'd found sooner"
> Body: "{Power feature} is how teams get {bigger outcome}. Here's how in 3 steps: 1) … 2) … 3) … → [Try {feature}]({link})."

Email 3 — Convert / social proof. Trigger: signup. Delay: +7 days (segment: free users not yet upgraded).
> Subject: "{ICP outcome}, minus the busywork"
> Body: "{Testimonial 1 sentence with name/role}. Pro unlocks {top 2 paid features}. → [Upgrade to Pro]({domain}/pricing). PH launch offer PH30 still works for 48 more hours."

KPIs for email: welcome open >= 55%, activation-email CTR >= 12%, free-to-paid by day 14 >= 3%.

## Output

Write exactly one file: `marketing/gtm-plan.md`. Structure:

1. Summary: app, domain, ICP, value prop, primary keyword, launch date.
2. SEO section (metadata matrix, robots.txt, sitemap, CWV targets) — copy-pasteable.
3. ProductHunt kit (tagline, description, first comment, checklist).
4. Landing copy (hero variants, subhead, CTAs, pricing table, social-proof plan).
5. Email sequence (welcome + 3 emails, with triggers/delays).
6. First-30-days sequenced plan — day | channel | action | owner.
7. KPI table with 30-day targets.

First-30-days table shape:

| Day | Channel | Action | Owner | Target |
| --- | --- | --- | --- | --- |
| -7 | PH | Create draft, gallery, line up hunter | marketing | draft ready |
| -1 | Email | Teaser to waitlist | marketing | sent |
| 0 | PH + Social | Launch 00:01 PT, first comment, reply hourly | maker | top 5 of day |
| 1 | Email | Welcome + activation live | system | seq active |
| 2–7 | SEO | Publish 2 blog posts targeting keyword | content | indexed |
| 8–14 | Email | Collect testimonials from power users | marketing | 3 quotes |
| 15–30 | SEO/Content | Weekly post + backlink outreach (10 sites) | content | 3 links |

KPI table shape (set numeric 30-day targets):

| KPI | Target (day 30) |
| --- | --- |
| Unique landing visitors | 3,000 |
| Signup conversion (visitor -> signup) | >= 4% |
| Activation rate (signup -> first value) | >= 40% |
| Free -> paid | >= 3% |
| Lighthouse SEO / CWV | SEO >= 95, all CWV green |
| ProductHunt rank | top 5 of the day |

## Anti-patterns

- Do NOT promise features the product does not ship or the legal pages do not cover — GTM copy must match `legal` output and the spec. Mismatch = blocker, not a launch.
- Do NOT fake social proof (invented testimonials, bought PH upvotes, fabricated user counts). Bans + legal exposure. Add proof only once real.
- Do NOT hardcode `https://localhost` or the raw Vercel preview URL in OG tags / sitemap / canonical — always the production custom domain.
- Do NOT index `/dashboard/*` or `/api/*` — block in robots.txt; these are auth-gated.
- Do NOT write more than 3 pricing tiers or more than 4 onboarding emails — added complexity lowers conversion.
- Do NOT create any file other than `marketing/gtm-plan.md`.

## References

- Pipeline + stack rules: repo `CLAUDE.md`, decision D-001 (fixed stack), Option A architecture.
- Next.js metadata API: App Router `metadata` / `generateMetadata`, `app/sitemap.ts`, `opengraph-image.tsx`.
- Visual reference for landing/pricing layouts: factory skill `ui-ux-pro-max` — `python .claude/skills/ui-ux-pro-max/scripts/search.py`.
- Core Web Vitals: measure on production via Lighthouse / PageSpeed Insights before declaring launch-ready.
