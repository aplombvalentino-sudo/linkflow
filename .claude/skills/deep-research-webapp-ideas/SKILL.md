---
name: deep-research-webapp-ideas
description: Use whenever the factory needs fresh web-app ideas to feed the pipeline — at the "idea" stage, when the user says "find me SaaS ideas", "what should we build", "research a niche", or when research/webapp-ideas.md is empty/stale. Discovers 3-10 validated B2C/B2B SaaS ideas with market signals and writes structured idea-cards.
allowed-tools: WebSearch, WebFetch
---

## Purpose

Discover 3-10 high-potential B2C/B2B SaaS web-app ideas that fit the FIXED STACK (Next.js 15 + Supabase + Stripe on Vercel) and are buildable as APP ARCHITECTURE Option A (single repo, single domain). Output is a ranked list of idea-cards with real market signals (URLs) so the downstream `scoring` and `spec` stages have evidence, not vibes. This is the first stage of the pipeline: `idea -> research -> scoring -> spec -> ...`.

## When to use

- Pipeline is at the `idea`/`research` stage and no validated ideas exist yet.
- User asks to find, brainstorm, or research web-app / SaaS / micro-SaaS ideas.
- `research/webapp-ideas.md` is missing, empty, or older than the current cycle.
- A prior idea was killed in `scoring` and replacements are needed.

Do NOT use for: scoring/ranking already-found ideas (that is the `scoring` stage), writing specs, or competitor deep-dives on a single chosen idea.

## Workflow

1. **Set the lens (30s).** Default to SaaS ideas that (a) solve a recurring, painful workflow, (b) have a clear payer, (c) are CRUD + auth + billing shaped so they fit the FIXED STACK. Prefer narrow B2B niches and prosumer B2C over broad consumer apps.

2. **Fan out across trend sources.** Run WebSearch on 4-6 of these, varied by phrasing. Capture exact result URLs — you will cite them in `market_signal`.
   - Trend/demand: `site:trends.google.com {niche}`, `"problem" OR "frustrated" site:reddit.com {niche}`, Exploding Topics, Google Trends, Hacker News "Ask HN: what do you wish existed".
   - Niche communities: subreddit pain threads (`site:reddit.com {niche} "is there a tool"`), Indie Hackers, dev.to, niche Slack/Discord recaps, X/Twitter build-in-public threads.
   - Marketplace gaps: Shopify App Store / Chrome Web Store / Notion gallery / Zapier app directory — search `"{job}" reviews 1 star` to find unmet needs in existing tools.
   - Money signals: G2 / Capterra categories with high search but thin/expensive incumbents; Product Hunt launches with high upvotes but weak execution.

3. **Cluster into candidate problems.** Group raw findings into 8-15 distinct problems. Drop anything that (a) is not web-deliverable, (b) needs native/mobile-only, (c) requires heavy infra outside Supabase/Vercel, or (d) is a regulated vertical with prohibitive legal load (the `legal` stage will block it anyway).

4. **Validate demand quickly (per surviving problem).** Spend <10 min each:
   - **Search volume / direction:** Google Trends slope (rising > flat > declining). WebFetch the trends or an Exploding Topics page; record the signal.
   - **Willingness to pay:** is someone already charging for an adjacent tool? Existing paid competitor = validated market, not a red flag.
   - **Acute pain:** at least one dated forum/Reddit/HN quote where a real user describes the problem. Quote it.
   - **Reachable audience:** identify one concrete channel (a subreddit, a directory, an SEO term) you could target. If you cannot name one, cut the idea.
   - Kill rule: a problem with no payer AND no rising trend AND no acute-pain quote is dropped.

5. **Write idea-cards.** Keep 3-10 survivors. Fill every REQUIRED field of the schema below. Order best-first by your judgement (strength of signal x stack fit). Append a one-line ranking rationale per card.

6. **Emit the file.** Write all cards to `research/webapp-ideas.md` using the template. Each `market_signal` MUST contain at least one real URL gathered in steps 2-4. No invented sources — if you could not find a signal, the card does not ship.

## Idea-card schema (REQUIRED fields)

| Field | Rule |
|---|---|
| `title` | Short product name / working title. |
| `pitch` | One sentence: "X for Y that does Z." |
| `problem` | The specific recurring pain, who feels it, how often. |
| `target_users` | Concrete segment (e.g. "solo Shopify merchants doing <$50k/mo"), not "everyone". |
| `market_signal` | 2-4 bullets of evidence, each with a real source URL (trend, quote, competitor pricing). |
| `competitors` | 2-5 named tools + one-line gap each ("expensive", "no X", "abandoned"). Empty market = red flag, note it. |
| `monetization_model` | Exactly one of: `subscription` \| `freemium` \| `one-time` \| `usage-based` \| `marketplace`. |
| `landing_page_angle` | The main conversion hook for the `/` hero — the promise + primary CTA. |
| `stack_fit` | One line on how it maps to Next.js 15 + Supabase (tables/RLS/auth/Edge Functions) and whether Stripe billing is needed. |

## Output

Write to `research/webapp-ideas.md`. Header + one block per idea:

```markdown
# Web-App Ideas — research output ({YYYY-MM-DD})
Generated by deep-research-webapp-ideas. {N} validated cards, best-first.

---

## 1. {title}
- **pitch:** ...
- **problem:** ...
- **target_users:** ...
- **market_signal:**
  - {claim} — {https://source-url}
  - {claim} — {https://source-url}
- **competitors:** {Tool A} (gap), {Tool B} (gap)
- **monetization_model:** subscription
- **landing_page_angle:** ...
- **stack_fit:** ...
- **ranking_rationale:** ...

---
```

## Filled example card

```markdown
## 1. ShipProof
- **pitch:** Automated delivered-vs-disputed evidence packets for solo Shopify merchants who lose chargebacks.
- **problem:** Small Shopify sellers lose 1-3 chargeback disputes/month because assembling tracking + delivery + customer-comms evidence by hand is slow and error-prone; banks reject incomplete packets.
- **target_users:** Solo / 2-person Shopify & WooCommerce merchants doing $5k-$80k/mo with physical goods.
- **market_signal:**
  - r/shopify recurring "how do I win chargebacks" threads with hundreds of comments — https://www.reddit.com/r/shopify/search/?q=chargeback
  - "Chargeback fees" rising on Exploding Topics (e-commerce ops category) — https://explodingtopics.com/
  - Incumbent Chargeflow prices at a % of recovered funds (high take-rate complaints in reviews) — https://www.g2.com/products/chargeflow/reviews
- **competitors:** Chargeflow (revenue-share pricing, opaque), Signifyd (enterprise-only, overkill for solo sellers), manual/DIY (slow).
- **monetization_model:** subscription
- **landing_page_angle:** "Win more chargebacks on autopilot — generate bank-ready evidence packets in 30 seconds. Connect your store, free first dispute." CTA: Connect Shopify.
- **stack_fit:** Next.js 15 App Router; Supabase Postgres tables (orders, disputes, evidence) with RLS per merchant; Supabase Auth + Shopify OAuth; Edge Function pulls tracking/delivery data and renders the PDF packet; Stripe subscription billing. Clean Option-A fit, no exotic infra.
- **ranking_rationale:** Clear payer, painful recurring problem, validated by paid incumbents, and a narrow reachable audience — strongest signal-to-stack-fit ratio.
```

## Anti-patterns

- **Inventing market signals.** Every `market_signal` bullet needs a URL you actually retrieved via WebSearch/WebFetch. A card with no real source does not ship — delete it, don't fabricate.
- **Broad consumer apps with no payer** ("an app for everyone to organize their life"). No identifiable payer = cut in step 4.
- **Empty-market = opportunity fallacy.** Zero competitors usually means zero demand. Treat an empty `competitors` field as a red flag and say so.
- **Ideas that break the FIXED STACK or Option A** (native-only, real-time video infra, on-prem). They die later; cut them in step 3.
- **Stopping at <3 cards or padding past 10.** Below 3 the pipeline starves; above 10 the `scoring` stage wastes effort. Hold the 3-10 band.
- **Vague `target_users`** ("businesses", "creators"). Name a segment with a size/spend qualifier.

## References

- Pipeline order and FIXED STACK / Option A: repo root `CLAUDE.md` and decision D-001.
- Downstream consumers of this file: `scoring` stage, then `spec`.
- Memory registers: `.claude/memory/{decisions,learnings,blockers,journal,evals}.md` — read SUMMARY first.
