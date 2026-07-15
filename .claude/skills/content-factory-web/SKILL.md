---
name: content-factory-web
description: Use whenever the pipeline reaches the content stage (after marketing, before deploy) and a deployed web app needs a paste-ready web content pack — landing hero copy, pricing-page copy, onboarding emails, ProductHunt launch copy, and TikTok/Instagram video scripts. Trigger on requests like "write the landing copy", "draft the pricing tiers", "onboarding email sequence", "ProductHunt launch", or "short-video scripts".
---

## Purpose

Generate the web-specific content pack for an app that has already been spec'd, built, designed, and marketed (positioning/ICP exist). This skill turns the app's value proposition into five paste-ready asset families and writes them to `content/content-pack.md`, grouped by asset type, ready to drop into Next.js page copy, an email provider, ProductHunt, and a short-video editor.

This skill writes COPY, not components. It does not touch `app/`, `components/`, or any `.tsx`. Output is a single Markdown file the build/design agents (or a human) lift text from.

## When to use

- Pipeline stage `content` (order: idea -> research -> scoring -> spec -> build -> design -> security-audit -> legal -> marketing -> **content** -> deploy).
- A landing page exists at `/` with hero/features/pricing sections that need real words instead of lorem ipsum.
- An onboarding flow exists (Supabase Auth signup) and needs lifecycle emails.
- A launch is planned (ProductHunt) or a paid/organic social push needs short-video scripts.

Do NOT use for: blog posts / long-form SEO content (that is a separate content asset), in-app microcopy, or legal text (owned by legal-compliance-agent).

## Inputs you need first

Read these before writing a single line. If missing, infer from the spec and state the assumption inline at the top of the pack.

- `spec/*.md` or `.claude/memory/journal.md` — what the app does, core feature, target user (ICP).
- `marketing/*` if present — positioning, one-line value prop, primary keyword, brand tone.
- Pricing tiers from the spec (names, prices, limits). If Stripe billing exists, mirror the exact tier names and prices.
- App slug + product name + primary domain.

## Workflow

1. Establish the spine: write the one-line value prop, the ICP, and the single primary outcome the product delivers. Everything below ladders up to that outcome. If you cannot state the outcome in one sentence, stop and re-read the spec.
2. Create the `content/` directory if absent (`mkdir -p content`). Write everything to `content/content-pack.md` in one pass.
3. Generate each asset family in order using the templates below. For every family produce the required count, then immediately follow with ONE fully written, product-specific worked example.
4. Self-check against the Anti-patterns list. Strip every banned phrase. Verify hero variants use genuinely different angles (not three rewordings of one angle).
5. Keep all copy paste-ready: no placeholder brackets left unfilled except intentional merge tags (`{{first_name}}`), no editor notes inside the deliverable text. English only.

## Output

Single file: `content/content-pack.md`. Structure, in this exact order:

```markdown
# Content Pack — {Product Name}

> Value prop: {one line}
> ICP: {who}
> Primary outcome: {one sentence}
> Assumptions: {anything inferred because an input was missing}

## 1. Landing Hero Copy (variants)
## 2. Pricing Page Copy
## 3. Onboarding Email Sequence
## 4. ProductHunt Launch Copy
## 5. TikTok / Instagram Short-Video Scripts
```

Each H2 contains the assets for that family. Within a family, label variants/tiers/emails with H3s so they are individually copyable.

---

## Asset 1 — Landing Hero Copy (3+ variants, distinct angles)

Produce at least 3 variants. Each variant = eyebrow (optional) + H1 headline + subhead (1–2 sentences) + primary CTA + secondary CTA. Each must take a DIFFERENT angle. Use three of:

- **Outcome angle** — the result the user gets ("Ship X in minutes").
- **Pain angle** — the problem you kill ("Stop doing X by hand").
- **Identity/aspiration angle** — who they become ("For teams who ship daily").
- **Mechanism/novelty angle** — the unique how ("AI-routed X, zero config").

Rules: H1 ≤ 12 words, no jargon, lead with a verb or the benefit. Subhead names WHO it's for + the concrete payoff. Primary CTA is action+value ("Start free", "Generate my first X"); secondary is low-friction ("See how it works", "View demo").

Template per variant:
```markdown
### Variant {n} — {angle name}
- Eyebrow: {short kicker or omit}
- H1: {headline}
- Subhead: {1–2 sentences: who it's for + payoff}
- Primary CTA: {label}
- Secondary CTA: {label}
```

### Worked example (product: "Inboxly" — AI that drafts customer-support replies from your help docs)
```markdown
### Variant 1 — Outcome
- Eyebrow: Support automation
- H1: Answer every ticket in seconds, not hours
- Subhead: Inboxly drafts on-brand replies from your own help docs, so your team approves instead of writing from scratch.
- Primary CTA: Start free
- Secondary CTA: Watch 90-sec demo

### Variant 2 — Pain
- Eyebrow: For lean support teams
- H1: Stop rewriting the same answer 40 times a day
- Subhead: Inboxly turns your docs into instant draft replies. Your agents edit and send — repetitive typing disappears.
- Primary CTA: Kill busywork free
- Secondary CTA: See how it works

### Variant 3 — Identity
- Eyebrow: Built for support that scales
- H1: Run a 10-person support desk with three people
- Subhead: Inboxly handles the first draft on every ticket so a small team covers big volume without burning out.
- Primary CTA: Try it on your inbox
- Secondary CTA: Read the case study
```

---

## Asset 2 — Pricing Page Copy (one block per tier, value-framed)

One block per tier. Mirror the spec's exact tier names/prices. Each block = tier name + one-line positioning (who it's for) + price + billing note + 3–6 value-framed features + CTA. Frame features as OUTCOMES, not specs ("Unlimited drafts" not "API calls: ∞"). Mark one tier "Most popular". Add an FAQ-lite line on annual discount or free trial if applicable.

Template per tier:
```markdown
### {Tier name}{ — Most popular?}
- For: {one line — who this tier is right for}
- Price: {$X/mo} ({billing note: billed monthly / annually save X%})
- {Value-framed feature 1}
- {Value-framed feature 2}
- {Value-framed feature 3}
- CTA: {label}
```

### Worked example (Inboxly)
```markdown
### Starter
- For: Solo founders and tiny teams testing the waters
- Price: $0/mo (free forever)
- Up to 100 AI-drafted replies/month
- Connect 1 inbox
- Drafts from up to 25 help-doc articles
- CTA: Start free

### Growth — Most popular
- For: Growing support teams drowning in repeat questions
- Price: $49/mo (billed annually, save 20%)
- Unlimited AI-drafted replies
- Connect up to 5 inboxes
- Unlimited help-doc sources + auto-resync
- Brand-voice tuning so drafts sound like you
- CTA: Start 14-day trial

### Scale
- For: High-volume desks that need control and reporting
- Price: $199/mo (billed annually, save 20%)
- Everything in Growth, plus:
- Unlimited inboxes and seats
- Approval workflows and audit log
- Priority support + onboarding call
- CTA: Talk to us
```

---

## Asset 3 — Onboarding Email Sequence (welcome / day-3 / day-7)

Three emails. Each = send trigger + subject (≤ 50 chars, no spammy caps/!!!) + preheader + body (plain, scannable, one primary CTA). Goal arc: Welcome = activate (get them to the first action), Day-3 = deepen (show a second value moment / handle the drop-off), Day-7 = convert/retain (nudge to paid or to habit). Use one merge tag `{{first_name}}`. Body ≤ 130 words. One CTA per email.

Template per email:
```markdown
### Email {n} — {Welcome | Day 3 | Day 7}
- Trigger: {when it sends}
- Subject: {≤ 50 chars}
- Preheader: {≤ 90 chars}
- Body:
{plain-text body with one CTA line}
```

### Worked example (Inboxly)
```markdown
### Email 1 — Welcome
- Trigger: Immediately on signup
- Subject: Your first drafts are 2 minutes away
- Preheader: Connect an inbox and watch Inboxly write for you.
- Body:
Hi {{first_name}},

Welcome to Inboxly. The fastest way to see the magic: connect one inbox and point us at your help docs. We'll start drafting replies on your next ticket — you just review and send.

Connect your inbox → {{cta_url}}

It takes about 2 minutes. Reply to this email if you get stuck; a human reads it.

— The Inboxly team

### Email 2 — Day 3
- Trigger: 3 days after signup
- Subject: The setting that makes drafts sound like you
- Preheader: Brand-voice tuning takes 60 seconds and changes everything.
- Body:
Hi {{first_name}},

Teams who turn on brand-voice tuning approve 3x more drafts without edits. It learns from a few of your past replies and matches your tone.

Tune your brand voice → {{cta_url}}

Already drafting? Tell us what's working — we read every reply.

— The Inboxly team

### Email 3 — Day 7
- Trigger: 7 days after signup
- Subject: You've saved ~4 hours this week
- Preheader: Here's what unlimited drafts unlock on Growth.
- Body:
Hi {{first_name}},

Nice work — Inboxly has drafted dozens of replies for you this week. Your free plan caps at 100/month, and you're closing in.

Growth gives you unlimited drafts, 5 inboxes, and brand-voice tuning across all of them — for less than one support hour a month.

Upgrade to Growth → {{cta_url}}

Questions on which plan fits? Just reply.

— The Inboxly team
```

---

## Asset 4 — ProductHunt Launch Copy

Produce: tagline (≤ 60 chars, what it does + for whom, no period) + description (2–4 short paragraphs: hook, what it does, who it's for, the ask) + first maker comment (optional but recommended). No hashtags. Conversational, founder voice. Lead with the problem, name the wedge.

Template:
```markdown
### Tagline
{≤ 60 chars}

### Description
{para 1: hook / problem}
{para 2: what it is + how it works}
{para 3: who it's for + the ask (try it, leave feedback)}

### First maker comment
{short, human, asks for feedback}
```

### Worked example (Inboxly)
```markdown
### Tagline
Inboxly — AI that drafts support replies from your docs

### Description
Support teams answer the same questions over and over, retyping replies they've written a hundred times. It's slow, and it burns people out.

Inboxly connects to your inbox and your help docs, then drafts an on-brand reply for every incoming ticket. Your agents review, tweak if needed, and send. Brand-voice tuning makes the drafts sound like your team, not a robot.

It's for lean support teams who want to cover more volume without hiring. Free to start — connect one inbox and you'll see drafts on your next ticket. We'd love your feedback, especially on the brand-voice quality.

### First maker comment
Hey hunters! We built Inboxly after watching our own 3-person support team retype the same answers all day. The hard part was making drafts that actually sound human — that's where most of our work went. Try it on your real inbox and tell us where the drafts miss. We're in the comments all day.
```

---

## Asset 5 — TikTok / Instagram Short-Video Scripts

Produce at least 2 scripts (one problem-led, one demo-led), 15–30 seconds each. Each = hook (first 2 seconds, must stop the scroll) + beats (3–5 timestamped shots with on-screen text + spoken VO) + CTA + caption (with 3–5 hashtags). Vertical, fast, no slow intros. The hook is a claim or a pain, never "Hi guys, today I'm going to...".

Template per script:
```markdown
### Script {n} — {problem-led | demo-led} ({duration})
- Hook (0–2s): {on-screen text} / VO: {line}
- Beat 1 ({t}): {shot} — on-screen: {text} / VO: {line}
- Beat 2 ({t}): ...
- CTA: {line + where to go}
- Caption: {copy} {#hashtags}
```

### Worked example (Inboxly)
```markdown
### Script 1 — problem-led (22s)
- Hook (0–2s): on-screen "POV: ticket #47 asking the SAME question" / VO: "If you answer the same support question all day, watch this."
- Beat 1 (2–7s): screen recording of a flooded inbox — on-screen "47 unread, all repeats" / VO: "Your team is retyping answers that already live in your docs."
- Beat 2 (7–14s): Inboxly drafting a reply in real time — on-screen "Inboxly drafts from your docs" / VO: "Inboxly reads your help docs and writes the reply for you."
- Beat 3 (14–19s): one click to send — on-screen "Review → Send" / VO: "You just check it and hit send. Done."
- CTA (19–22s): on-screen "Free → link in bio" / VO: "Start free, link in bio."
- Caption: Stop retyping the same support reply 40x a day. Inboxly drafts it from your docs. #customersupport #saas #automation #startups #productivity

### Script 2 — demo-led (18s)
- Hook (0–2s): on-screen "I let AI run my support inbox for a day" / VO: "I gave AI my support inbox for one day. Here's what happened."
- Beat 1 (2–8s): connect inbox + docs in seconds — on-screen "Setup: 2 minutes" / VO: "Connected my inbox and docs in two minutes."
- Beat 2 (8–14s): drafts appearing on tickets — on-screen "Every ticket, pre-drafted" / VO: "Every new ticket showed up already drafted, in my tone."
- Beat 3 (14–16s): time-saved counter — on-screen "Saved 4 hours" / VO: "Four hours back. Same day."
- CTA (16–18s): on-screen "Try it free" / VO: "Link in bio."
- Caption: Setup took 2 minutes, saved 4 hours day one. #ai #customersupport #founder #buildinpublic #saas
```

---

## Anti-patterns

- **Three hero "variants" that are one angle reworded.** Each variant must change the persuasion angle, not just synonyms. Reject "Save time on X" / "Cut time on X" / "Less time on X".
- **Spec-dump pricing.** "5,000 API calls, 10GB storage" with no value framing. Always say what the number lets the user DO.
- **Cliché filler.** Ban: "revolutionary", "game-changer", "unleash", "seamless", "supercharge", "take it to the next level", "in today's fast-paced world", "we're excited to announce". Cut on sight.
- **Email walls of text or multiple CTAs.** One goal, one button per email, ≤ 130 words.
- **Slow video hooks.** "Hey guys, welcome back" wastes the only 2 seconds that matter. Open on the claim or the pain.
- **Left-in placeholders.** Shipping `{{product_name}}` or `[insert benefit]` in the body. Only intentional merge tags (`{{first_name}}`, `{{cta_url}}`) survive.
- **Inventing prices/limits.** Never fabricate tiers; mirror the spec/Stripe config or flag the assumption at the top of the pack.

## References

- Factory stack/architecture and pipeline order: `CLAUDE.md` at repo root.
- Positioning, ICP, tone, primary keyword: `marketing/*`.
- Pricing tiers source of truth: `spec/*.md` and Stripe product config.
- Visual reference for the landing page these words fill: skill `ui-ux-pro-max` (`python .claude/skills/ui-ux-pro-max/scripts/search.py`).
- Memory: `.claude/memory/{journal,decisions}.md` — log content-pack generation and any inferred assumptions.
