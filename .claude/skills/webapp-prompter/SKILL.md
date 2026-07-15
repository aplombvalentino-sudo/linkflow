---
name: webapp-prompter
description: Use whenever a scored web-app idea is ready to build and you need a machine-checkable spec plus the Ultra Prompt that drives webapp-builder-agent. Triggers — "write the spec", "generate webapp-spec.yaml", "produce the build prompt", "spec this app", "prepare the builder prompt", or any handoff from scoring -> build in the factory pipeline. Produces specs/webapp-spec.yaml (Option A architecture) and the derived Ultra Prompt.
---

## Purpose

Turn a scored idea into two artifacts the rest of the factory depends on:

1. `specs/webapp-spec.yaml` — the single source of truth for the app's pages, data model, auth, API surface, legal config, design directions, and monetization. Every downstream agent (builder, design, security-audit, legal, marketing) reads this file.
2. The **Ultra Prompt** — a dense, self-contained instruction block handed to `webapp-builder-agent`. It references the spec by path and restates the non-negotiable guardrails so the builder cannot drift.

This skill is the bridge between `scoring` and `build` in the pipeline: idea -> research -> scoring -> **spec (this skill)** -> build -> design -> security-audit -> legal -> marketing -> content -> deploy.

## When to use

- A scoring artifact exists and the idea passed the gate (build approved).
- You are asked to author, regenerate, or amend `specs/webapp-spec.yaml`.
- You need to (re)generate the Ultra Prompt for `webapp-builder-agent`.

Do NOT use this skill to write code, run `next build`, or deploy. It only produces the spec and the prompt.

## Workflow

1. **Load inputs.** Read the scoring/research output and the factory context (CLAUDE.md at repo root, decision D-001 fixed stack). Extract the app slug, core value prop, target user, and whether monetization is required.
2. **Pull design directions.** Run the factory UI/UX skill to choose a concrete style, palette, and font pairing — do NOT invent these:
   ```bash
   python .claude/skills/ui-ux-pro-max/scripts/search.py --style "<idea-keywords>"
   python .claude/skills/ui-ux-pro-max/scripts/search.py --palette "<mood>"
   python .claude/skills/ui-ux-pro-max/scripts/search.py --fonts "<vibe>"
   ```
   Record the exact style name, palette hex values, and font names into `design_directions`.
3. **Enumerate pages (Option A).** Always include the four route groups: `/` landing (hero/features/pricing/blog/CTA), `/dashboard/*` (auth-gated, middleware-protected), `/legal/*` (terms/privacy/cookies/RGPD), `/api/*` (route handlers + Server Actions). For each route list its components.
4. **Design the data model.** For every user-data table: columns (name + Postgres type), relations (FKs), and a written RLS policy. RLS is mandatory on every table holding user data — no exceptions.
5. **Pick auth.** Choose the Supabase Auth method (email/password, OAuth provider(s), or magic-link) and state which routes it gates.
6. **List API routes.** Each entry: method, path, purpose, auth requirement, and whether it is a Route Handler or Server Action.
7. **Fill legal config.** `data_types_collected`, `cookies_used`, `company_name`, `contact_email` — these feed `legal-compliance-agent`. Be exhaustive; the legal gate is blocking.
8. **Spec monetization (if billing).** Stripe products + prices (id, nickname, unit_amount in cents, currency, interval). If the app is free, set `monetization.enabled: false` and omit products.
9. **Validate.** Confirm the YAML parses and every required section is present and non-empty (see Output). Save to `specs/webapp-spec.yaml`.
10. **Derive the Ultra Prompt.** Fill the template below from the spec, restating guardrails verbatim. Output it for handoff to `webapp-builder-agent`.
11. **Update memory.** Append a journal line; if a stack/architecture choice was forced, log it under decisions and refresh SUMMARY.

## webapp-spec.yaml skeleton (annotated — copy and fill)

```yaml
# specs/webapp-spec.yaml — single source of truth for the build.
# Architecture is Option A (single repo, single domain). Stack is fixed by D-001.
meta:
  app_slug: my-app                 # lowercase-kebab; used in vercel project name webapp-{slug}-{YYYYMMDD}
  display_name: "My App"
  value_prop: "One sentence: what the user gets."
  target_user: "Who pays / who logs in."
  primary_language: en             # factory is English-only

# 1) PAGES — every route + the components it renders.
pages:
  landing:                         # route group: /
    - route: /
      type: server                 # Server Component by default
      components: [Navbar, Hero, FeatureGrid, PricingTable, BlogTeaser, CTASection, Footer]
    - route: /blog/[slug]
      type: server
      components: [Navbar, ArticleBody, Footer]
  dashboard:                       # route group: /dashboard/* (auth-gated, middleware-protected)
    - route: /dashboard
      type: server
      components: [DashboardShell, StatsCards, RecentList]
    - route: /dashboard/settings
      type: client                 # "use client" ONLY because of stateful form interactivity
      components: [SettingsForm, BillingPanel]
  legal:                           # route group: /legal/*
    - route: /legal/terms
      type: server
      components: [LegalDocument]
    - route: /legal/privacy
      type: server
      components: [LegalDocument]
    - route: /legal/cookies
      type: server
      components: [LegalDocument, CookieConsentManager]
    - route: /legal/rgpd
      type: server
      components: [LegalDocument]

# 2) DATA_MODEL — Supabase tables. RLS policy is REQUIRED on every user-data table.
data_model:
  tables:
    - name: profiles
      columns:
        - { name: id, type: uuid, pk: true, default: "auth.uid()" }
        - { name: email, type: text, nullable: false }
        - { name: full_name, type: text }
        - { name: created_at, type: timestamptz, default: "now()" }
      relations:
        - { column: id, references: "auth.users(id)", on_delete: cascade }
      rls:
        enabled: true
        policies:
          - { name: "own_profile_select", op: select, using: "auth.uid() = id" }
          - { name: "own_profile_update", op: update, using: "auth.uid() = id" }
    - name: items
      columns:
        - { name: id, type: uuid, pk: true, default: "gen_random_uuid()" }
        - { name: owner_id, type: uuid, nullable: false }
        - { name: title, type: text, nullable: false }
        - { name: created_at, type: timestamptz, default: "now()" }
      relations:
        - { column: owner_id, references: "profiles(id)", on_delete: cascade }
      rls:
        enabled: true
        policies:
          - { name: "items_owner_all", op: all, using: "auth.uid() = owner_id", with_check: "auth.uid() = owner_id" }

# 3) AUTH — Supabase Auth.
auth:
  method: email                    # one of: email | oauth | magic-link
  oauth_providers: []              # e.g. [google, github] when method = oauth
  gated_routes: ["/dashboard/*"]   # enforced by middleware
  redirect_after_login: /dashboard

# 4) API_ROUTES — route handlers + Server Actions; Supabase Edge Functions if needed.
api_routes:
  - { method: POST, path: /api/items, kind: route-handler, auth: required, purpose: "Create an item for the current user." }
  - { method: GET,  path: /api/items, kind: route-handler, auth: required, purpose: "List the current user's items." }
  - { action: createCheckoutSession, kind: server-action, auth: required, purpose: "Start a Stripe Checkout session." }

# 5) LEGAL_PAGES_CONFIG — feeds legal-compliance-agent (blocking gate).
legal_pages_config:
  company_name: "Acme SAS"
  contact_email: "privacy@example.com"
  data_types_collected: [email, full_name, ip_address, usage_analytics, payment_metadata]
  cookies_used:
    - { name: sb-access-token, purpose: "Auth session", category: essential }
    - { name: _ga, purpose: "Analytics", category: analytics }
  third_party_processors: [supabase, stripe, vercel]
  data_retention: "Account data retained until deletion request; logs 30 days."

# 6) DESIGN_DIRECTIONS — from ui-ux-pro-max (do NOT invent; use search.py output).
design_directions:
  style: "<exact style name from search.py>"
  palette:
    primary: "#0A0A0A"
    accent:  "#4F46E5"
    bg:      "#FFFFFF"
    muted:   "#6B7280"
  typography:
    heading: "<font name>"
    body:    "<font name>"
  components_lib: shadcn/ui
  notes: "Tailwind tokens map 1:1 to palette above."

# 7) MONETIZATION — Stripe. Set enabled:false for free apps and omit products.
monetization:
  enabled: true
  provider: stripe
  products:
    - { id: pro, name: "Pro", prices: [ { id: price_pro_monthly, unit_amount: 1900, currency: usd, interval: month } ] }
```

## Ultra Prompt template (fill from the spec, then hand to webapp-builder-agent)

```text
ROLE: You are webapp-builder-agent. Build the app defined in specs/webapp-spec.yaml. Read that file first; it is authoritative.

APP: {{display_name}} ({{app_slug}}) — {{value_prop}}

FIXED STACK (D-001, non-negotiable): Next.js 15 App Router + React + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres/Auth/RLS/Edge Functions) + Stripe (only if monetization.enabled). Deploy target: Vercel.

ARCHITECTURE: Option A (single repo, single domain). Build exactly the route groups in spec.pages: / (landing), /dashboard/* (auth-gated), /legal/* , /api/* .

GUARDRAILS (restate, obey verbatim):
- Server Components by default. Add "use client" ONLY for the pages/components marked type: client in the spec.
- RLS enabled on EVERY user-data table, with the exact policies in spec.data_model. No table ships without RLS.
- Middleware protects {{auth.gated_routes}} (i.e. /dashboard/*). Unauthenticated -> redirect to login.
- Supabase service-role key is server-only: never client-side, never in NEXT_PUBLIC_*. Secrets live in .env.local (gitignored).
- One file = one responsibility, ~300-line ceiling.
- A change is "stable" only when: npx tsc --noEmit && npx eslint . && npx next build all pass.

WHAT TO BUILD (from spec):
- Pages & components: see spec.pages.
- Data model & RLS: see spec.data_model — generate Supabase migrations + RLS policies.
- Auth: {{auth.method}} via Supabase; gate {{auth.gated_routes}}; redirect to {{auth.redirect_after_login}}.
- API: implement spec.api_routes (route handlers + Server Actions; Edge Functions where noted).
- Legal pages: scaffold /legal/* from spec.legal_pages_config (final copy comes from legal-compliance-agent — leave a clear hook).
- Design: apply spec.design_directions (style, palette, typography) via Tailwind tokens + shadcn/ui.
- Monetization: {{#if monetization.enabled}}wire Stripe products/prices from spec.monetization{{else}}none — app is free{{/if}}.

DONE = all three checks green and the app runs locally with no console errors. Do NOT deploy; that is the deploy stage after the legal green check.
```

## Output

- Written file: `specs/webapp-spec.yaml` containing ALL required sections, each non-empty: `pages`, `data_model` (with per-table `rls`), `auth`, `api_routes`, `legal_pages_config`, `design_directions`, `monetization`.
- The filled Ultra Prompt, emitted as text for handoff to `webapp-builder-agent`.
- A one-line journal entry in `.claude/memory/journal.md` (and a decision entry if a forced choice occurred), with SUMMARY refreshed.

## Anti-patterns

- **Inventing design directions.** Never hand-pick a palette or font from memory. Always source `design_directions` from `ui-ux-pro-max/scripts/search.py` output and paste the exact names/hex.
- **Shipping a table without RLS.** A `data_model` table missing an `rls` block is an invalid spec. Reject and fill it.
- **Vague legal config.** Empty or placeholder `data_types_collected`/`cookies_used` blocks the legal gate. Enumerate every real data type and cookie, including Supabase auth cookies and any analytics.
- **Marking pages `client` by default.** Default is Server Components; only routes needing interactivity (forms, live state) get `type: client`, and the Ultra Prompt must say so explicitly.
- **Leaking the service-role key into the spec or prompt as a NEXT_PUBLIC_* value.** Secrets are server-only; never reference them client-side.
- **Writing code here.** This skill stops at the spec + prompt. Building belongs to `webapp-builder-agent`.

## References

- Factory context & guardrails: `CLAUDE.md` at repo root; decision D-001 (fixed stack).
- UI/UX source of truth: `.claude/skills/ui-ux-pro-max/SKILL.md` + `scripts/search.py`.
- Memory registers: `.claude/memory/{decisions,learnings,blockers,journal,evals}.md` (read SUMMARY first).
- Consumer of the spec: `webapp-builder-agent` (build stage).
- Downstream readers: design, security-audit, legal-compliance-agent, marketing.
