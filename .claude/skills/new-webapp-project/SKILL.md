---
name: new-webapp-project
description: Use whenever you must spin up a fresh target web-app project from this factory — i.e. the orchestrator is about to "start new webapp cycle", a new idea has been scored and needs its own repo, or anyone asks to scaffold/bootstrap/init a new Next.js app from the factory brain. Runs scripts/new-webapp.sh (bash) or scripts/new-webapp.ps1 (PowerShell) to create the folder, clone the live .claude/ brain with zero drift, and lay down the fixed stack.
allowed-tools: Bash
---

## Purpose

Create a brand-new target web-app project that inherits this factory's full operating brain (`.claude/` agents, skills, decisions, guardrails) and the FIXED STACK (Next.js 15 App Router + React + TypeScript + Tailwind + shadcn/ui + Supabase + Stripe, deployed on Vercel). The scaffolder guarantees the new project starts from the **live** factory configuration, not a stale snapshot, so there is no drift between the factory and the app it produces.

This is the first concrete step of the pipeline: `idea -> research -> scoring -> spec -> build -> ...`. The orchestrator calls this skill to begin a cycle.

## When to use

- The orchestrator (`orchestrator-webapp-factory`) is told to "start new webapp cycle".
- A scored idea has cleared the bar and needs a dedicated repo to be built into.
- A human or agent asks to "scaffold / bootstrap / init / create a new webapp project".

Do NOT use this to add a feature to an existing app, or to re-scaffold over a project that already exists (use `--force` only when you intend to overwrite).

## Workflow

1. **Pick the app name.** Use a short kebab-case slug, e.g. `invoice-snap`. It becomes the folder name, the `{{APP_NAME}}` token, and the basis for the Vercel project name `webapp-{app-slug}-{YYYYMMDD}`.

2. **Run the scaffolder** from the factory root. Bash (Git Bash / macOS / Linux):

   ```bash
   ./scripts/new-webapp.sh <app-name> [parent-path] [--with-external-skills] [--force]
   ```

   PowerShell (Windows):

   ```powershell
   ./scripts/new-webapp.ps1 <app-name> [parent-path] [--with-external-skills] [--force]
   ```

   Examples:

   ```bash
   # Create ../invoice-snap as a sibling of the factory
   ./scripts/new-webapp.sh invoice-snap

   # Create it under an explicit parent folder
   ./scripts/new-webapp.sh invoice-snap "C:/Users/Utilisateur/Documents/apps"

   # Include optional external/third-party skills, overwrite if folder exists
   ./scripts/new-webapp.sh invoice-snap ../apps --with-external-skills --force
   ```

3. **Arguments**
   - `<app-name>` (required): kebab-case slug. Validated; rejected if it contains spaces/uppercase/illegal path chars.
   - `[parent-path]` (optional, positional): where to create the project folder. Defaults to the factory's parent directory (new project is a sibling of the factory).
   - `--with-external-skills` (flag): also copy non-core/third-party skills from `.claude/skills/` (by default only factory-core skills are copied to keep the app lean).
   - `--force` (flag): proceed even if the target folder already exists, overwriting overlay files. Without it the script aborts on an existing non-empty folder.

4. **Wait for "Scaffold complete"** in stdout. The script prints the absolute path of the new project and the NEXT STEPS (see below). If any step fails the script exits non-zero and leaves a clear error — fix and re-run with `--force`.

## What the scaffolder does (in order)

1. **Create the project folder** at `<parent-path>/<app-name>` (default: sibling of the factory). Aborts if it exists unless `--force`.
2. **Copy the live `.claude/` brain** — agents, skills (core only, or all with `--with-external-skills`), `CLAUDE.md`, settings, `ui-ux-pro-max` skill — straight from the factory's working tree so there is **no drift**.
3. **Seed fresh memory registers** at `.claude/memory/{decisions,learnings,blockers,journal,evals}.md` plus their `SUMMARY` — empty/initialized for THIS app, not the factory's history (factory decision D-001 stack is recorded as inherited).
4. **Copy the spec template** into the app so the spec step has a ready scaffold to fill.
5. **Run create-next-app** non-interactively:
   ```bash
   npx create-next-app@latest <app-name> \
     --typescript --tailwind --app --src-dir --import-alias "@/*" \
     --eslint --use-npm --yes
   ```
6. **Overlay factory files** on top of the generated app:
   - Supabase clients (browser + server, service-role kept server-only).
   - `middleware.ts` (auth-gating `/dashboard/*` per Architecture Option A).
   - `.env.local.example` (documented keys; real secrets never committed).
   - `.gitignore` (ensures `.env.local` is ignored).
   - App-level `CLAUDE.md` (inherits factory rules + app-specific header).
7. **Token-fill** every overlaid/templated file: replace `{{APP_NAME}}` with the slug and `{{DATE}}` with today (`YYYY-MM-DD`), including the Vercel project name `webapp-{app-slug}-{YYYYMMDD}`.

The result is a self-contained project that obeys the same guardrails: Server Components by default, RLS on all user-data tables, service-role key never in `NEXT_PUBLIC_*`, one-file-one-responsibility (~300 line ceiling), stable only when `npx tsc --noEmit && npx eslint . && npx next build` all pass.

## Output

stdout ends with the new project path and these NEXT STEPS:

1. `cd <parent-path>/<app-name>`
2. Copy `.env.local.example` to `.env.local` and fill real Supabase + Stripe + Vercel values (`.env.local` is gitignored; never commit secrets, never put the service-role key in `NEXT_PUBLIC_*`).
3. Install + run dev to confirm the baseline boots:
   ```bash
   npm install
   npm run dev   # http://localhost:3000 should render the create-next-app baseline
   ```
4. Tell the orchestrator: **"start new webapp cycle"** — it picks up from the freshly scaffolded project and drives `research -> scoring -> spec -> build -> design -> security-audit -> legal -> marketing -> content -> deploy`.

## Anti-patterns

- **Do NOT** hand-copy `.claude/` from an old project or a tarball — that reintroduces drift. Always run the scaffolder so the brain is cloned from the factory's live tree.
- **Do NOT** copy the factory's populated memory registers into the new app. Each app gets fresh, empty registers; mixing histories corrupts decision/learning provenance.
- **Do NOT** edit `package.json`/stack choices to swap frameworks — the stack is FIXED by decision D-001 (non-negotiable). If a project "needs" a different stack, escalate, don't fork the scaffolder.
- **Do NOT** run with `--force` over a folder that already contains work you care about; it overwrites overlay files.
- **Do NOT** commit `.env.local` or paste real secrets into `.env.local.example` — only documented placeholder keys belong there.

## References

- Scripts: `scripts/new-webapp.sh`, `scripts/new-webapp.ps1` (factory root).
- Factory rules: repo-root `CLAUDE.md` (authoritative), Architecture Option A, FIXED STACK decision D-001.
- Memory registers convention: `.claude/memory/{decisions,learnings,blockers,journal,evals}.md` (read SUMMARY first).
- UI/UX reference skill: `.claude/skills/ui-ux-pro-max` (`python .claude/skills/ui-ux-pro-max/scripts/search.py`).
- Orchestrator entry point: `orchestrator-webapp-factory` — command "start new webapp cycle".
