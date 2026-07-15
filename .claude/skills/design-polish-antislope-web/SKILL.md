---
name: design-polish-antislope-web
description: "Use whenever a web app has been built/designed and needs an anti-slop polish pass before security/legal/deploy — landing (conversion) AND dashboard (SaaS UX). Triggers: 'polish the UI', 'design review', 'why does this look generic/AI-generated', 'audit the landing page', 'dashboard UX review', 'fix the hero', 'pricing table looks off', 'no empty/loading states'. Detects the recurring slop patterns (wall-of-text hero, weak CTA hierarchy, fake social proof, cluttered pricing, missing data-states, unclear nav, inconsistent spacing) in CODE, prescribes the fix, cites the ui-ux-pro-max rule, and writes specs/<app>/design-polish.md with P0/P1/P2 changes."
---

# design-polish-antislope-web

## Purpose

Catch and kill the design slop that makes a built web app look generic, untrustworthy, or unfinished. This runs AFTER `design` and BEFORE `security-audit` in the pipeline. It is web-specific and split into two surfaces: the **landing** (`/`, conversion-driven) and the **dashboard** (`/dashboard/*`, SaaS UX). Every finding is grounded in source code, paired with a concrete fix, and cited against a `ui-ux-pro-max` rule. Output is a prioritized changelist the build agent can execute.

## When to use

- A landing page or dashboard exists and "looks AI-generated" / generic / off.
- Before deploy gate: nothing ships ugly. Run this once the app builds clean (`tsc && eslint && next build` green).
- After a major UI change, to re-audit the touched surface.
- NOT a substitute for the accessibility audit baked into `ui-ux-pro-max` — fold those findings in, do not duplicate them.

## Workflow

1. **Locate the surfaces.** Landing components live under `app/(marketing)/`, `app/page.tsx`, `components/landing/*`. Dashboard under `app/dashboard/**`, `components/dashboard/*`. Confirm the app slug (`<app>`) from `specs/<app>/`.
2. **Read the code, not a screenshot.** Grep for the tells in the tables below. A pattern only counts if you can point to a file + line.
3. **Render at 3 widths.** `next dev`, then check 375px (mobile), 768px (tablet), 1280px (desktop). Mobile breakage is the #1 landing slop source.
4. **For each detected pattern:** record (a) the file/line evidence, (b) the fix as a concrete diff or component change, (c) the cited `ui-ux-pro-max` rule (run the search, paste the matched rule name + Do/Don't).
5. **Cite via the factory skill.** Always:
   ```bash
   python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <landing|web|ux|product|typography|color> -n 3
   ```
   Use `--domain landing` for hero/CTA/pricing/social-proof; `--domain web` for dashboard states/forms/nav; `--domain ux` for spacing/nav/responsive; `--domain product` to confirm the style matches the product type.
6. **Assign priority** (see scale) and **write** `specs/<app>/design-polish.md` using the Output template.
7. **Hand back** the P0 list to the build agent. Do not mark the surface stable until P0 + P1 are resolved and `next build` is still green.

## Priority scale

- **P0 — blocks deploy.** Trust/conversion killers or broken UX: no CTA, fake/placeholder social proof shipped to prod, broken mobile layout, dashboard with no loading/error state on a primary data view.
- **P1 — fix before launch.** Weak CTA hierarchy, wall-of-text hero, cluttered pricing, inconsistent spacing, unclear nav.
- **P2 — polish.** Micro-interactions, hover states, chart color refinement, copy tightening.

## LANDING slop patterns

| Pattern | Detect in code | Fix | ui-ux-pro-max citation query |
|---|---|---|---|
| **Wall-of-text hero** | Hero `<section>` with a `<p>` over ~30 words, multiple paragraphs, or `<ul>` of features inside the hero. Grep hero component for `</p>.*</p>` and long string literals. | One headline (≤10 words, benefit-led), one subhead (≤20 words), one primary CTA. Move feature lists to a Features section below. Headline `text-4xl md:text-6xl font-bold`, subhead `text-lg text-muted-foreground`. | `search.py "hero headline subhead structure" --domain landing` |
| **No clear CTA hierarchy** | Multiple `<Button>` with identical variant in the hero, or zero primary button, or `variant="outline"` as the only CTA. Grep for `<Button` count per hero. | Exactly ONE primary CTA (`<Button size="lg">`), at most one secondary (`variant="ghost"`/`"outline"`). Repeat the primary CTA in a sticky navbar and a bottom CTA band. Use a contrasting accent (≥7:1). | `search.py "primary CTA placement hierarchy contrast" --domain landing` |
| **Fake / placeholder social proof** | Lorem ipsum testimonials, `avatar.png`/`unsplash` stock with no name+role, "Trusted by 10,000+" with no source, hardcoded fake logos. Grep for `lorem`, `placeholder`, `TODO`, `Company Name`. | Remove unverifiable claims (P0 — legal + trust). Use real testimonials with photo + name + role + company, or a real metric, or remove the section. Never ship invented numbers. | `search.py "testimonials social proof trust photo name role" --domain landing` |
| **Missing trust signals** | No security/payment badges near pricing or CTA; no footer links to `/legal/*`; no logos/guarantee. | Add trust row near primary CTA and pricing: secure-payment note, "Cancel anytime", privacy link. Footer must link `/legal/terms`, `/legal/privacy`, `/legal/cookies`. | `search.py "trust signals badges guarantee near CTA" --domain landing` |
| **Cluttered pricing table** | Pricing component with >4 tiers, >8 feature rows visible at once, no highlighted tier, every cell text-heavy. Grep pricing component for tier array length and feature-row count. | Max 3 tiers (free/pro/team). Highlight the recommended tier (ring + badge "Most popular"). Collapse rarely-read rows into a "compare all" toggle. Price prominent (`text-4xl`), `/mo` muted. Clear per-tier CTA. | `search.py "pricing table tiers highlight recommended" --domain landing` |
| **Missing mobile responsiveness** | No responsive variants — grep for grid/flex with no `md:`/`lg:` prefixes, fixed `w-[NNNpx]` on layout containers, hero text with no `md:` size step. Render at 375px and look for horizontal scroll. | Mobile-first Tailwind: `grid-cols-1 md:grid-cols-3`, fluid widths (`w-full max-w-*`), responsive type steps. Ensure `viewport` meta (Next sets it via `viewport` export). No horizontal scroll at 375px. | `search.py "responsive mobile breakpoints horizontal scroll" --domain ux` |

## DASHBOARD slop patterns

| Pattern | Detect in code | Fix | ui-ux-pro-max citation query |
|---|---|---|---|
| **No data-state handling (empty/loading/error)** | A data fetch (`supabase.from(...).select`, `useQuery`, server component await) that renders straight into a table/list with no branch for empty array, pending, or error. Grep for `.map(` not guarded by a length check; missing `loading.tsx`/`error.tsx` in the route. | Handle all four states: loading (skeleton, not spinner-only), empty (illustration + primary action, e.g. "No projects yet — Create one"), error (message + retry), success. Add `app/dashboard/<route>/loading.tsx` and `error.tsx`. Reserve space to avoid layout shift. | `search.py "empty state loading skeleton error retry" --domain web` |
| **Unclear sidebar / nav** | Flat list of >7 items, no active-state styling (no `aria-current`, no active class keyed off `usePathname`), icon-only items with no label/tooltip, no grouping. | Group nav into ≤3 sections with labels. Active item gets a distinct bg + `aria-current="page"`. Icon-only buttons need `aria-label`. Keep top-level items ≤7; nest the rest. | `search.py "sidebar navigation active state grouping aria-current" --domain web` |
| **Inconsistent spacing** | Mixed ad-hoc paddings/gaps — grep for one-off values like `p-3`, `p-[13px]`, `gap-5`, `mt-7` scattered with no system; cards with differing internal padding. | Adopt a 4px scale (Tailwind `2/4/6/8/12` = 8/16/24/32/48px). Card padding uniform (`p-6`). Section vertical rhythm consistent (`space-y-6`). Kill arbitrary `[Npx]` values in layout. | `search.py "spacing scale consistency padding rhythm" --domain ux` |
| **No data-visualization hierarchy** | Every metric/card same size and weight; charts with default rainbow colors; KPIs not visually distinct from secondary stats; no number emphasis. | Establish hierarchy: primary KPIs large (`text-3xl font-semibold`) at top, secondary stats smaller. One accent color per chart series from the palette, not defaults. Match chart type to data (trend=line, parts=bar/stacked, share=donut sparingly). Provide a table fallback. | `search.py "dashboard KPI hierarchy chart type color" --domain chart` |

## Detection commands (copy-paste)

```bash
# Landing: count CTAs in hero, find wall-of-text + placeholder proof
grep -rEn "<Button" app/page.tsx components/landing/ | wc -l
grep -rniE "lorem|placeholder|company name|trusted by|10,?000|TODO" components/landing/

# Pricing tiers / feature-row bloat
grep -rEn "tier|plan|priceId" components/landing/pricing*

# Responsiveness: layout containers with no responsive prefix or hardcoded widths
grep -rnE "grid-cols-[0-9]|flex" app components | grep -vE "md:|lg:|sm:"
grep -rnE "w-\[[0-9]+px\]" app components

# Dashboard: missing route-level states + unguarded .map
find app/dashboard -type d -exec sh -c 'test -f "$1/loading.tsx" || echo "MISSING loading.tsx: $1"' _ {} \;
find app/dashboard -type d -exec sh -c 'test -f "$1/error.tsx" || echo "MISSING error.tsx: $1"' _ {} \;
grep -rnE "\.map\(" app/dashboard components/dashboard

# Nav active state
grep -rniE "usePathname|aria-current" components/dashboard/
```

## Output

Write exactly one file: `specs/<app>/design-polish.md`. Template:

```markdown
# Design Polish — <app>
Audited: <YYYY-MM-DD> · Surfaces: landing + dashboard · Build status: green/red

## Summary
<2-3 lines: top trust/conversion risks, overall slop verdict>

## P0 — Blocks deploy
### [LANDING] Fake social proof in testimonials section
- Evidence: components/landing/Testimonials.tsx:24 — "Trusted by 10,000+ teams", lorem quotes
- Fix: Remove unverifiable claim and lorem; ship 3 real testimonials (photo+name+role) or delete section
- Rule: ui-ux-pro-max landing → "Hero + Testimonials + CTA" — Do: photo + name + role; Don't: invented numbers
- Owner: build agent

## P1 — Fix before launch
### [DASHBOARD] No empty/loading state on /dashboard/projects
- Evidence: app/dashboard/projects/page.tsx:12 — `.map` on data with no guard; no loading.tsx
- Fix: add loading.tsx skeleton + empty state ("No projects yet — Create one") + error.tsx retry
- Rule: ui-ux-pro-max web → "State / loading-states" — Do: skeleton; Don't: blank flash
- Owner: build agent

## P2 — Polish
### [LANDING] CTA lacks hover affordance
- Evidence: ... · Fix: ... · Rule: ...
```

Rules: one heading per finding, always include Evidence (file:line), Fix (concrete), Rule (cited from search.py with Do/Don't). After writing, update `.claude/memory/journal.md` SUMMARY per factory memory protocol.

## Anti-patterns

- **DON'T fix from a screenshot or vibe.** Every P0/P1 must cite `file:line`. No evidence = not a finding.
- **DON'T add decorative slop while removing slop** — no gratuitous gradients, glows, or emoji icons (use SVG; `ui-ux-pro-max` rule `no-emoji-icons`). Polish ≠ more effects.
- **DON'T invent social proof, logos, or metrics to "fill" the landing.** Fabricated trust signals are a P0 and a legal liability. Remove rather than fake.
- **DON'T leave a dashboard data view with only a success state.** Empty/loading/error are mandatory, not optional.
- **DON'T duplicate the accessibility audit.** Cite `ui-ux-pro-max` CRITICAL rules (contrast, focus, aria) but don't re-list them as new findings.
- **DON'T break the build.** Re-run `npx tsc --noEmit && npx eslint . && npx next build` after applying; a polish that fails the stability gate is not done.

## References

- Citation engine: `.claude/skills/ui-ux-pro-max/SKILL.md` + `python .claude/skills/ui-ux-pro-max/scripts/search.py "<q>" --domain <landing|web|ux|product|chart|typography|color>`
- Domains: `landing` (landing.csv), `web` (web-interface.csv), `ux` (ux-guidelines.csv), `product` (style match), `chart` (charts.csv).
- Pipeline position: design → **design-polish-antislope-web** → security-audit. Output consumed by build agent and the deploy gate.
- Stability gate (CLAUDE.md): `npx tsc --noEmit && npx eslint . && npx next build` all green.
