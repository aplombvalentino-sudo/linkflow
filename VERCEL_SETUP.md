# Vercel setup â€” linkflow

How to enable automated deployment for linkflow. Created 20260713. Used by `deployment-agent` / the `vercel-auto-deploy` skill.

## 1. Create a Vercel token
1. https://vercel.com/account/tokens â†’ **Create Token**.
2. Scope: your personal account. Copy the token (shown once).
3. Put it in `.env.local`:
   ```
   VERCEL_TOKEN=your-vercel-token
   VERCEL_TEAM_ID=        # leave empty for a personal account
   ```
   `.env.local` is gitignored â€” the token is never committed.

## 2. Install the CLI (used by the deploy step)
```bash
npm install -g vercel    # or rely on `npx vercel`
```

## 3. What deployment-agent does (automated)
1. Checks prerequisites: legal green check, security audit passed, `npx next build` passes.
2. `git init` in this project if needed.
3. Creates the Vercel project via REST API:
   ```bash
   curl -X POST https://api.vercel.com/v10/projects \
     -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
     -d '{"name":"webapp-linkflow-YYYYMMDD","framework":"nextjs"}'
   ```
4. Sets env vars via `POST /v10/projects/{id}/env?upsert=true` (service-role key as `type:"sensitive"`).
5. Deploys: `npx vercel --prod --yes` â€” **stdout is the live URL**.
6. Writes `specs/linkflow/deployment-report.md` and reports the URL for human review.

## 4. Personal vs team
Personal account â†’ API calls omit `teamId`. If you later use a team, set `VERCEL_TEAM_ID` and append `?teamId=$VERCEL_TEAM_ID` to every API call.

> A human must review the live URL before the cycle is marked complete (CLAUDE.md Â§4).
