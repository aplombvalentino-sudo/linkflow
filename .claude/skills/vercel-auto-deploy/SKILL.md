---
name: vercel-auto-deploy
description: Use whenever an app must be shipped to Vercel — creating the project, pushing env vars, running the production deploy, and capturing the live URL. Trigger at the "deploy" stage of the pipeline (after a green legal-compliance check), or whenever asked to "deploy", "ship", "push to Vercel", "create a Vercel project", or "set Vercel env vars". Covers the full Vercel REST API + CLI workflow with copy-paste commands and the deployment-report.md template.
allowed-tools: Bash
---

## Purpose

Take a built, stable, legally-cleared Next.js app and ship it to Vercel on the factory's personal account: create the project via REST, push every env var with the correct sensitivity, run the production deploy via CLI, and record the live URL in a deployment report. Fully scriptable, no dashboard clicks.

## When to use

- Pipeline stage `deploy` — the LAST stage, only after `legal-compliance-agent` returns a green check (no deploy without it).
- Re-deploying after a fix once `npx tsc --noEmit && npx eslint . && npx next build` all pass.
- Adding or rotating an env var on an existing Vercel project.

Do NOT use to build, lint, or test — that is upstream. Do NOT use before legal sign-off.

## Prerequisites (hard gates)

1. `npx tsc --noEmit && npx eslint . && npx next build` all pass (the factory definition of "stable").
2. `legal-compliance-agent` green check recorded.
3. `VERCEL_TOKEN` present in `.env.local` (gitignored). See below.
4. `app-slug` known (kebab-case) and today's date as `YYYYMMDD`.

## VERCEL_TOKEN — create once, store in .env.local, NEVER hard-code

1. Browser: https://vercel.com/account/tokens (Account Settings -> Tokens).
2. "Create Token". Scope = your personal account. Expiration = your choice (rotate periodically).
3. Copy the token value (shown ONCE).
4. Append to `.env.local` at repo root (this file is gitignored — verify with `git check-ignore .env.local`):

```
VERCEL_TOKEN=vercel_xxxxxxxxxxxxxxxxxxxxxxxx
```

Anti-pattern: pasting the token into a command, committing it, or putting it in `NEXT_PUBLIC_*`. The token grants full account control — treat it like a root password. It NEVER goes to the client and NEVER into git.

## Workflow (copy-paste, run from repo root)

### (1) Load the token from .env.local

```bash
export VERCEL_TOKEN=$(grep -E '^VERCEL_TOKEN=' .env.local | cut -d= -f2-)
test -n "$VERCEL_TOKEN" && echo "token loaded (${#VERCEL_TOKEN} chars)" || { echo "VERCEL_TOKEN missing"; exit 1; }
```

PowerShell equivalent:

```powershell
$env:VERCEL_TOKEN = (Select-String -Path .env.local -Pattern '^VERCEL_TOKEN=').Line -replace '^VERCEL_TOKEN=',''
if (-not $env:VERCEL_TOKEN) { throw "VERCEL_TOKEN missing" }
```

### (2) Create the project (REST, personal account — NO teamId)

Name convention: `webapp-<slug>-<YYYYMMDD>`.

```bash
SLUG=<slug>; DATE=$(date +%Y%m%d); NAME="webapp-${SLUG}-${DATE}"
curl -sS -X POST https://api.vercel.com/v10/projects \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${NAME}\",\"framework\":\"nextjs\"}"
```

The JSON response includes the project `id` (starts with `prj_`). Capture it:

```bash
PROJECT_ID=$(curl -sS -X POST https://api.vercel.com/v10/projects \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"${NAME}\",\"framework\":\"nextjs\"}" | grep -o '"id":"prj_[^"]*"' | head -1 | cut -d'"' -f4)
echo "PROJECT_ID=$PROJECT_ID"
```

If the project already exists you get HTTP 409; in that case fetch the id instead:

```bash
PROJECT_ID=$(curl -sS "https://api.vercel.com/v10/projects/${NAME}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | grep -o '"id":"prj_[^"]*"' | head -1 | cut -d'"' -f4)
```

### (3) Set env vars (REST, upsert)

Endpoint: `POST https://api.vercel.com/v10/projects/<id>/env?upsert=true`
Body fields: `key`, `value`, `type` (`plain` | `encrypted` | `sensitive`), `target` (array of `production` / `preview` / `development`).

Type rules for the FIXED STACK:
- `SUPABASE_SERVICE_ROLE_KEY` -> `sensitive` (write-only, never readable back; NEVER `NEXT_PUBLIC_*`).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` -> `sensitive`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> `encrypted` (safe to expose to client by design, but no reason to leave plaintext).
- Any other secret -> `encrypted` minimum.

Reusable helper:

```bash
set_env () {  # set_env KEY VALUE TYPE
  curl -sS -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?upsert=true" \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
    -d "{\"key\":\"$1\",\"value\":\"$2\",\"type\":\"$3\",\"target\":[\"production\",\"preview\",\"development\"]}"
}

set_env NEXT_PUBLIC_SUPABASE_URL      "$NEXT_PUBLIC_SUPABASE_URL"      encrypted
set_env NEXT_PUBLIC_SUPABASE_ANON_KEY "$NEXT_PUBLIC_SUPABASE_ANON_KEY" encrypted
set_env SUPABASE_SERVICE_ROLE_KEY     "$SUPABASE_SERVICE_ROLE_KEY"     sensitive
# Stripe (only when monetization is required):
set_env STRIPE_SECRET_KEY     "$STRIPE_SECRET_KEY"     sensitive
set_env STRIPE_WEBHOOK_SECRET "$STRIPE_WEBHOOK_SECRET" sensitive
```

Source the values from `.env.local` first (same `export $(grep ... )` pattern) so nothing is typed inline. Never echo a secret value to stdout or into the report.

### (4) Deploy (CLI — production)

```bash
npx vercel --prod --yes
```

- `--prod` = production deployment; `--yes` = accept all prompts (non-interactive).
- stdout is ALWAYS the deployment URL (the last line). Capture it:

```bash
LIVE_URL=$(npx vercel --prod --yes | tail -1)
echo "LIVE_URL=$LIVE_URL"
```

If the CLI is not yet linked to the project, link non-interactively first: `npx vercel link --yes --project "$NAME"`. The CLI uses `VERCEL_TOKEN` from the environment automatically.

### (5) Capture the live URL into the deployment report

Write `specs/<app>/deployment-report.md` from the template below. Record env var NAMES ONLY — never values.

```bash
mkdir -p "specs/${SLUG}"
# fill the template at specs/${SLUG}/deployment-report.md (see below)
```

## Personal account vs team

This factory uses a PERSONAL Vercel account: omit `teamId` from every request (as shown above). If a Vercel Team is adopted later, append `?teamId=<team_id>` to every REST call (and combine with `&upsert=true` on the env endpoint), and pass `--scope <team_slug>` to the CLI:

```bash
curl ... "https://api.vercel.com/v10/projects?teamId=<team_id>"
curl ... "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?upsert=true&teamId=<team_id>"
npx vercel --prod --yes --scope <team_slug>
```

## deployment-report.md template

Write verbatim to `specs/<app>/deployment-report.md`, filling the placeholders:

```markdown
# Deployment Report — <app-name>

- **Project name:** webapp-<slug>-<YYYYMMDD>
- **Vercel project id:** prj_xxxxxxxxxxxxxxxx
- **Live URL:** https://webapp-<slug>-<YYYYMMDD>.vercel.app
- **Deployed at:** <YYYY-MM-DD HH:MM TZ>
- **Account type:** personal (no teamId)
- **Framework:** nextjs
- **Legal check:** green (legal-compliance-agent, <date>)
- **Stable build:** tsc + eslint + next build all passed (<date>)

## Environment variables (names only — values live in .env.local / Vercel, NEVER here)

| Key | Type | Targets |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | encrypted | production, preview, development |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | encrypted | production, preview, development |
| SUPABASE_SERVICE_ROLE_KEY | sensitive | production, preview, development |
| STRIPE_SECRET_KEY | sensitive | production, preview, development |
| STRIPE_WEBHOOK_SECRET | sensitive | production, preview, development |

## Post-deploy checks

- [ ] Landing `/` loads (hero/features/pricing/CTA render)
- [ ] `/dashboard/*` redirects unauthenticated users (middleware gate works)
- [ ] `/legal/*` reachable (terms/privacy/cookies/RGPD)
- [ ] Auth flow works against production Supabase
- [ ] Stripe checkout works (if monetization enabled)

## Notes

<any rollbacks, custom domains, follow-ups>
```

## Output

1. A Vercel project named `webapp-<slug>-<YYYYMMDD>` with all env vars set at correct sensitivity.
2. A production deployment and its live URL.
3. `specs/<app>/deployment-report.md` populated from the template (env var NAMES only).

## Anti-patterns

- Hard-coding `VERCEL_TOKEN` in a command or committing it — ALWAYS load from gitignored `.env.local`.
- Putting `SUPABASE_SERVICE_ROLE_KEY` (or any secret) in `NEXT_PUBLIC_*`, or setting it as `plain`/`encrypted` instead of `sensitive`.
- Writing env var VALUES into `deployment-report.md` — names only, always.
- Sending `teamId` on a personal account (causes wrong-scope / 403 errors).
- Deploying before the legal green check or before the stable-build gate passes.
- Forgetting `--yes` on `npx vercel --prod` and hanging on an interactive prompt.

## References

- Vercel REST: `POST /v10/projects`, `POST /v10/projects/{id}/env?upsert=true`. Base `https://api.vercel.com`, header `Authorization: Bearer $VERCEL_TOKEN`.
- CLI: `npx vercel --prod --yes` (stdout last line = deployment URL).
- Token management: https://vercel.com/account/tokens
- Factory decision D-001 (FIXED STACK), CLAUDE.md at repo root.
