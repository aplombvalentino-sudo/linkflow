# linkflow

> Generated from **Web App Factory Core** on 20260713. This app's brain. The factory `.claude/` (agents, skills, memory) was copied in live â€” run the pipeline by telling `orchestrator-webapp-factory`: "start new webapp cycle".

## Identity
- **App:** linkflow
- **Stack:** Next.js 15 (App Router) + React + TypeScript + Tailwind + shadcn/ui + **Firebase (Auth + Firestore)** + Stripe (if billing). Deploy: Vercel. _(Backend switched from the factory-default Supabase to Firebase on 20260714 at the user's request — decision logged in `.claude/memory/decisions.md`.)_
- **Architecture â€” Option A:** `/` landing Â· `/dashboard/*` protected Â· `/legal/*` Â· `/api/*`.

## Guardrails (inherited from the factory)
- Server Components by default; `"use client"` only when necessary.
- Firebase Admin private key is server-only â€” never client-side, never in `NEXT_PUBLIC_*`.
- Firestore Security Rules on every collection; analytics events are Admin-SDK only.
- Secrets in `.env.local` (gitignored).
- One file = one responsibility (~300-line ceiling).
- **Stable** only when `npx tsc --noEmit && npx eslint . && npx next build` all pass.
- **No deploy without a green check from `legal-compliance-agent`.**

## Pipeline
idea â†’ research â†’ scoring â†’ spec â†’ build â†’ design â†’ security-audit â†’ legal â†’ marketing â†’ content â†’ deploy.
The spec lives in `specs/webapp-spec.yaml`. Per-app artifacts land under `specs/linkflow/`.

## Setup
1. Copy `.env.local.example` â†’ `.env.local`, fill Firebase web + Admin values (see `VERCEL_SETUP.md`).
2. `npm install && npm run dev`.
3. Tell `orchestrator-webapp-factory`: "start new webapp cycle".

## Memory
`.claude/memory/{decisions,learnings,blockers,journal,evals}.md` â€” read the SUMMARY first, jump by line number, update the SUMMARY after writing.
