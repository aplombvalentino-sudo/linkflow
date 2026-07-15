---
name: webapp-security-audit
description: Use whenever a factory app reaches the security-audit pipeline stage (after build/design, before legal), or whenever you touch RLS policies, src/middleware.ts, Server Actions, app/api routes, or env var handling. Runs a Next.js 15 + Supabase static security audit across 6 axes and emits specs/<app>/security-audit.md with a findings table and residual-risk statement. Read-only — never fixes code, only reports.
allowed-tools: Read, Grep, Glob
---

# webapp-security-audit

## Purpose

Static, read-only security audit tailored to the FIXED STACK (Next.js 15 App Router + TypeScript + Supabase Postgres/Auth/RLS/Edge Functions + Stripe, deployed on Vercel). Produces an evidence-backed findings table so legal-compliance-agent can gate deployment. This skill does NOT modify code; it grep/glob-scans, judges PASS/FAIL/WARN per axis, and writes the report.

## When to use

- Pipeline stage `security-audit` (order: idea -> research -> scoring -> spec -> build -> design -> **security-audit** -> legal -> marketing -> content -> deploy).
- Re-run after any change to: SQL migrations, `src/middleware.ts`, Server Actions (`"use server"`), `app/api/**/route.ts`, or anything reading `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_*`.
- No deployment may proceed without a report whose every user-data axis is PASS (or has an accepted, documented residual risk).

## Workflow

Run all six axes. For each, run the exact grep/glob, read the hits, apply the criterion, record a row. Use absolute paths or run from repo root. Default the app root to where `app/` and `package.json` live.

### Axis 1 — RLS coverage (CRITICAL)

Every table holding user data must have row level security ENABLED and at least one policy. Find tables, then prove each is locked.

```bash
# Find every CREATE TABLE in migrations
grep -rniE "create table" supabase/migrations
# Find every RLS enablement
grep -rniE "enable row level security" supabase/migrations
# Find every policy
grep -rniE "create policy" supabase/migrations
```

PASS: for each user-data table T, `ALTER TABLE T ENABLE ROW LEVEL SECURITY;` exists AND at least one `CREATE POLICY ... ON T` exists. FAIL: a user-data table has neither, or has RLS enabled with zero policies (table is then fully locked AND silently broken — flag as FAIL, not PASS). WARN: tables that are reference/lookup data intentionally world-readable — confirm they hold no PII.

Anti-pattern to flag: a `USING (true)` policy on a table with a `user_id` column — that is RLS theater; the correct predicate is `USING (auth.uid() = user_id)`.

### Axis 2 — Middleware auth gate (CRITICAL)

`/dashboard/*` is auth-gated by middleware. Verify the matcher actually covers it and the middleware redirects unauthenticated users.

```bash
ls src/middleware.ts middleware.ts 2>/dev/null      # locate it (root or src/)
grep -nE "matcher|config" src/middleware.ts
grep -niE "dashboard|getUser|getSession|redirect" src/middleware.ts
```

PASS: `config.matcher` includes a pattern matching `/dashboard/:path*` (or a catch-all that does not exclude it), AND the body calls `supabase.auth.getUser()` (server-validated) and redirects to the login route when no user. FAIL: matcher omits `/dashboard`, or middleware file absent, or auth check missing. WARN: uses `getSession()` instead of `getUser()` — `getSession()` trusts the cookie without revalidating against Supabase; prefer `getUser()` in middleware.

Anti-pattern to flag: relying ONLY on client-side redirects in dashboard pages with no middleware matcher — protected content ships to the browser before the redirect fires.

### Axis 3 — Server Action CSRF / auth (HIGH)

Server Actions (`"use server"`) are POST-only by Next.js design, but must still re-check the session — they are public RPC endpoints.

```bash
grep -rnE "\"use server\"|'use server'" app src
# For each action file, confirm an auth check is present
grep -rniE "getUser|auth\.getUser|redirect\(" app src
```

PASS: every mutating Server Action calls `supabase.auth.getUser()` (or a shared `requireUser()` helper) before any write, and authorizes the row owner. FAIL: an action performs a DB write with no session check. WARN: action relies solely on RLS for protection — acceptable as defense-in-depth only if Axis 1 is fully PASS; still note it.

Anti-pattern to flag: trusting a `userId` passed in as an action argument instead of deriving it from `auth.getUser()` — lets a caller act as any user (IDOR).

### Axis 4 — Env var / service-role exposure (CRITICAL)

The service-role key bypasses RLS and must NEVER reach the client. It must never be in `NEXT_PUBLIC_*` nor imported by a Client Component.

```bash
# Service-role key leaking into a public-prefixed var
grep -rniE "NEXT_PUBLIC_.*SERVICE_ROLE|SERVICE_ROLE.*NEXT_PUBLIC" .
# Any service-role usage at all (then check the file's directive)
grep -rniE "SERVICE_ROLE_KEY|service_role|createClient.*service" app src lib
# Files that are Client Components
grep -rlE "\"use client\"|'use client'" app src
```

PASS: `SUPABASE_SERVICE_ROLE_KEY` appears only in server-only files (route handlers, Server Actions, `lib/*server*`), never in a file marked `"use client"`, never with a `NEXT_PUBLIC_` prefix, and `.env.local` is gitignored. FAIL: any service-role reference inside a `"use client"` file or any `NEXT_PUBLIC_*SERVICE_ROLE*` match. WARN: service-role client constructed in a shared module that a client file could import — verify the import graph.

```bash
grep -nE "\.env|env\.local" .gitignore   # confirm secrets are gitignored
```

Anti-pattern to flag: instantiating the service-role client at module top-level in a file that also exports a component — bundler may pull it client-side.

### Axis 5 — API route auth (HIGH)

Every `app/api/**/route.ts` handler must validate the session unless it is intentionally public (e.g. Stripe webhook, which instead verifies a signature).

```bash
glob app/api/**/route.ts                              # enumerate handlers
grep -rniE "getUser|getSession|auth\(|requireUser" app/api
# Public-by-design endpoints needing signature checks instead
grep -rniE "stripe|webhook|constructEvent|signature" app/api
```

PASS: each route either (a) calls `supabase.auth.getUser()` and returns 401 on no user, or (b) is a documented webhook that verifies its signature (`stripe.webhooks.constructEvent` with the signing secret). FAIL: a route reads/writes user data with no auth and no signature check. WARN: route uses `getSession()` only, or returns 200 with empty body instead of 401 (information-leak-lite).

Anti-pattern to flag: a Stripe webhook that parses the body without `constructEvent` signature verification — anyone can forge billing events.

### Axis 6 — Dependency vulnerabilities (MEDIUM)

```bash
npm audit --omit=dev --json    # report high/critical only for prod deps
```

PASS: zero `high`/`critical` advisories in production dependencies. FAIL: any `critical` in a prod dep. WARN: `high` advisories or vulns only in devDependencies — note but do not block. If `npm audit` cannot run (no lockfile), record that as a WARN and state the audit is incomplete.

## Output

Write `specs/<app>/security-audit.md` (create the folder if needed). Use this exact structure:

```markdown
# Security Audit — <app-slug>
Date: <YYYY-MM-DD> · Auditor: webapp-security-audit · Scope: static, read-only

## Findings
| # | Axis | Severity | Status | Evidence (file:line / grep hit) | Recommendation |
|---|------|----------|--------|---------------------------------|----------------|
| 1 | RLS coverage | CRITICAL | PASS/FAIL/WARN | supabase/migrations/0002_x.sql:14 | ... |
| 2 | Middleware auth | CRITICAL | ... | src/middleware.ts:8 | ... |
| 3 | Server Action auth | HIGH | ... | app/dashboard/actions.ts:22 | ... |
| 4 | Env / service-role | CRITICAL | ... | lib/supabase/admin.ts:3 | ... |
| 5 | API route auth | HIGH | ... | app/api/items/route.ts:5 | ... |
| 6 | npm audit | MEDIUM | ... | npm audit output | ... |

## Gate
PASS only if every CRITICAL and HIGH axis is PASS. Otherwise BLOCKED — list each blocker.

## Residual risk
<Explicit statement: this is a static audit; it does not cover runtime auth bypass,
business-logic flaws, rate limiting, DoS, supply-chain at install time, or pen-test
findings. Security is never perfect — state what was NOT tested.>
```

Every row MUST cite concrete evidence (a `file:line` or the literal grep hit). No row may be left as "looks fine".

## Anti-patterns

- Claiming "the app is secure" — forbidden. Always state residual risk and the audit's static-only scope.
- Marking an axis PASS without an evidence cell — every PASS needs a proof location too (e.g. the line enabling RLS).
- Treating RLS-enabled-but-zero-policies as PASS — it is a FAIL (broken access, false safety).
- Editing or "fixing" code from this skill — out of scope; this skill is Read/Grep/Glob only. Hand fixes back to the build agent.
- Skipping Axis 4 because grep returned nothing — confirm the service-role key IS used somewhere server-side; if it is never referenced, that itself is worth a WARN (admin operations may be missing or mis-wired).

## References

- Deeper threat modeling and exploit reasoning: `external-skills/cybersecurity`.
- Factory guardrails: CLAUDE.md at repo root (Server Components by default, RLS on all user tables, service-role never client-side, secrets in gitignored `.env.local`).
- Supabase auth: prefer `auth.getUser()` (revalidates) over `auth.getSession()` (trusts cookie) on the server.
