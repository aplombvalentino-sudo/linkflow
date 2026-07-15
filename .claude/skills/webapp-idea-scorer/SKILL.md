---
name: webapp-idea-scorer
description: Use whenever a raw web-app idea (or a batch of ideas) must be objectively ranked before spec/build. Triggers on "score this idea", "which idea should we build", "rank these app ideas", "is this worth building", or any pipeline step between research and spec. Applies the fixed 7-axis rubric, writes research/idea-scores.md, and names the single winner.
---

## Purpose

Convert vague web-app ideas into a single, defensible decision: build this one, not the others. This skill applies a deterministic 7-axis rubric (1-5 anchored scores), a fixed weighting, a weighted-total formula, and explicit tie-break rules, then emits a ranked markdown table to `research/idea-scores.md` and declares the winner. It is the `scoring` step of the factory pipeline (idea -> research -> **scoring** -> spec -> build ...). Garbage in stays garbage out: this skill consumes the `research` step output (market notes, competitor list, monetization hypotheses); it does not invent facts.

## When to use

- Right after `research` produces evidence for one or more ideas and before any `spec` work begins.
- When the user dumps 2+ ideas and asks "which one".
- When a single idea needs a go/no-go gate before committing build hours.
- Re-scoring after new research invalidates a prior assumption (re-run, overwrite the table, note the delta in `.claude/memory/journal.md`).

Do NOT use to validate already-built apps, to compare design options, or to score non-web-app ideas (mobile-native, desktop, hardware) — the stack-alignment axis assumes the fixed factory stack.

## The 7 axes (score each 1-5 using the anchors)

Score ONLY at 1, 3, or 5 unless evidence clearly lands between anchors (then 2 or 4). Never leave an axis blank; if research is missing, score conservatively (assume 2) and flag it as a research gap.

### 1. Market size (weight 0.18)
How many reachable paying users/orgs exist.
- **1** — Niche hobby; < ~5k plausible global users; no clear buyer.
- **3** — Defined vertical or prosumer segment; ~50k-500k reachable; buyer identifiable.
- **5** — Broad horizontal SaaS need; millions reachable; obvious recurring budget line.

### 2. Competition (weight 0.12)
Inverse of crowding/moat difficulty. Higher score = easier to win.
- **1** — Saturated; incumbents with network effects/lock-in; we have no wedge.
- **3** — Several competitors but a clear underserved angle (price, UX, niche, region).
- **5** — Fragmented/manual-today market; weak incumbents; defensible wedge exists.

### 3. Feasibility (weight 0.20)
Can the factory ship a real v1 on the fixed stack without exotic infra/ML/integrations.
- **1** — Needs heavy ML training, real-time at scale, or 5+ fragile third-party integrations.
- **3** — Standard CRUD + auth + a couple of integrations; some non-trivial logic.
- **5** — CRUD + auth + Stripe; expressible as Next.js routes + Supabase tables/RLS, no special infra.

### 4. Excitement (weight 0.10)
Pull/"want it now" factor: demo-ability, shareability, founder/user enthusiasm.
- **1** — Boring utility nobody talks about; hard to demo.
- **3** — Useful, mildly compelling; demos fine.
- **5** — "Show your friends" hook; instantly graspable value; strong screenshot/demo.

### 5. Monetization (weight 0.15)
Clarity and strength of the revenue model and willingness-to-pay.
- **1** — No clear way to charge; relies on ads/donations only.
- **3** — Plausible subscription/usage model; some WTP signal from research.
- **5** — Proven paid category; clear tiers; users already pay for the manual/competing solution.

### 6. Time-to-cash (weight 0.15)
How fast the first real dollar can land after build.
- **1** — Long sales cycle, enterprise procurement, or big audience needed before any revenue.
- **3** — Self-serve but needs marketing ramp; first paid users in weeks.
- **5** — Self-serve checkout + immediate value; first paid user plausibly day one of launch.

### 7. Stack alignment (weight 0.10)
Fit to the non-negotiable stack: Next.js 15 (App Router) + React + TS + Tailwind + shadcn/ui + Supabase (Postgres/Auth/RLS/Edge Functions) + Stripe + Vercel (decision D-001).
- **1** — Wants a stack the factory does not run (native mobile, heavy background workers, non-Postgres DB, websockets-at-scale).
- **3** — Mostly fits; 1-2 features need an Edge Function or a workaround within the stack.
- **5** — Pure fit: landing + `/dashboard/*` + `/api/*` + Supabase + Stripe, deploys on Vercel as-is.

## Weights and formula

Weights are fixed and sum to 1.00:

| Axis | Key | Weight |
|---|---|---|
| Market size | market | 0.18 |
| Competition | comp | 0.12 |
| Feasibility | feas | 0.20 |
| Excitement | excite | 0.10 |
| Monetization | money | 0.15 |
| Time-to-cash | ttc | 0.15 |
| Stack alignment | stack | 0.10 |

**Weighted total (0-5 scale, round to 2 decimals):**

```
total = 0.18*market + 0.12*comp + 0.20*feas + 0.10*excite + 0.15*money + 0.15*ttc + 0.10*stack
```

Optional reference script (deterministic; use if scoring more than ~3 ideas):

```python
W = {"market":0.18,"comp":0.12,"feas":0.20,"excite":0.10,"money":0.15,"ttc":0.15,"stack":0.10}
def total(s):  # s = dict of axis->int(1..5)
    return round(sum(W[k]*s[k] for k in W), 2)
# example: total({"market":4,"comp":3,"feas":5,"excite":4,"money":4,"ttc":5,"stack":5}) -> 4.27
```

**Go/no-go gate:** any idea with `total < 3.20`, OR any single axis = 1 on `feas`/`money`/`stack`, is marked NO-GO (do not advance to spec) regardless of rank.

## Tie-break rules

When two ideas have equal weighted totals (after rounding to 2 decimals), break the tie in this strict order — first axis where they differ wins:

1. Higher **time-to-cash** (ttc).
2. Then higher **feasibility** (feas).
3. Then higher **stack alignment** (stack).
4. Then higher **monetization** (money).
5. Still tied -> pick the idea with the fewest research gaps; if still tied, the human chooses (flag it).

## Workflow

1. Gather inputs: read the `research` step output for each idea (market notes, competitor list, monetization hypotheses, any WTP signals). If `research/` lacks a file per idea, note which axes are guesses.
2. Score every idea on all 7 axes using the anchors. Write a one-line justification per axis citing the research evidence (or "GAP: assumed").
3. Compute `total` for each idea with the formula above.
4. Apply the go/no-go gate; mark NO-GO ideas.
5. Rank GO ideas by `total` descending; resolve ties with the tie-break order.
6. Write the ranked table to `research/idea-scores.md` (overwrite; this file is the single source of truth for the decision). Create the `research/` folder if absent.
7. Name the winner explicitly in a `## Winner` section with a 2-3 sentence rationale and the next pipeline step (`-> spec`).
8. Update `.claude/memory/journal.md` with a one-line entry: date, ideas scored, winner, winning total. If the decision reverses a prior one, also record it in `.claude/memory/decisions.md`.

## Output

Write exactly this structure to `research/idea-scores.md`:

```markdown
# Idea Scores — <YYYY-MM-DD>

| Rank | Idea | Market (.18) | Comp (.12) | Feas (.20) | Excite (.10) | Money (.15) | TTC (.15) | Stack (.10) | Total | Verdict |
|------|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:-----:|---------|
| 1 | <name> | 4 | 3 | 5 | 4 | 4 | 5 | 5 | 4.27 | GO (winner) |
| 2 | <name> | 5 | 2 | 3 | 5 | 3 | 3 | 3 | 3.46 | GO |
| 3 | <name> | 3 | 3 | 2 | 3 | 1 | 2 | 4 | 2.43 | NO-GO (money=1) |

## Per-axis justifications
### <Idea 1 name>
- market 4 — <evidence/citation>
- comp 3 — <evidence>
- feas 5 — pure CRUD+auth+Stripe on the fixed stack
- excite 4 — <evidence>
- money 4 — <evidence>
- ttc 5 — self-serve checkout, value on signup
- stack 5 — landing + /dashboard + Supabase + Stripe, no special infra
<repeat for each idea>

## Winner
**<Idea 1 name>** (total 4.27). <2-3 sentence rationale: why it beat #2, and which tie-breaks (if any) applied.> Next step: -> spec.

## Research gaps
- <Idea X>: <axis> assumed; verify <what> before build.
```

## Worked scoring example

Idea A "Invoice reminder SaaS for freelancers" vs Idea B "AI-curated global news aggregator".

Idea A scores: market 4, comp 3, feas 5, excite 3, money 5, ttc 5, stack 5.
```
total_A = .18*4 + .12*3 + .20*5 + .10*3 + .15*5 + .15*5 + .10*5
        = 0.72 + 0.36 + 1.00 + 0.30 + 0.75 + 0.75 + 0.50 = 4.38
```

Idea B scores: market 5, comp 2, feas 2, excite 5, money 1, ttc 2, stack 3.
```
total_B = .18*5 + .12*2 + .20*2 + .10*5 + .15*1 + .15*2 + .10*3
        = 0.90 + 0.24 + 0.40 + 0.50 + 0.15 + 0.30 + 0.30 = 2.79
```

Verdict: A = 4.38 GO (winner); B = 2.79 NO-GO (below 3.20 gate AND money=1). No tie, so tie-breaks unused. Winner = Idea A; advance to spec. (Note how big market alone does not save B — feasibility 0.20 and the monetization gate dominate.)

Worked tie-break: if A had also been 4.27-vs-4.27 against a sibling, compare ttc first (rule 1), then feas (rule 2), then stack (rule 3).

## Anti-patterns

- **Anti-pattern: scoring without research.** Never fabricate market/competition numbers to fill the table. If `research/` is empty, score conservatively (2), label every guessed axis `GAP`, and tell the user the score is provisional — do not declare a confident winner on guesses.
- **Anti-pattern: silently changing weights.** Weights are fixed (sum 1.00). Do not re-weight to favor a pet idea. If weights genuinely need to change, that is a `decisions.md` change, not an inline tweak.
- **Anti-pattern: ignoring the go/no-go gate.** Do not advance the top-ranked idea to spec if it is below 3.20 or trips a hard-zero axis — "best of a bad batch" is still NO-GO; report that all ideas failed.
- **Anti-pattern: appending instead of overwriting.** `research/idea-scores.md` is single-source-of-truth; overwrite it on each run so stale rankings cannot mislead the spec step.

## References

- Factory stack decision: `CLAUDE.md` (repo root), decision D-001.
- Pipeline order and memory registers: `.claude/memory/SUMMARY.md`, `.claude/memory/{decisions,journal}.md`.
- Upstream input: `research/` step output. Downstream consumer: `spec` step.
