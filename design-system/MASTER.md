# LinkFlow Design System — MASTER (Neon Glass Cinema)

**Locked:** 2026-07-13 (Phase 3, user-selected) · Source: ui-ux-pro-max
(Glassmorphism × Dark OLED × Scroll-Triggered Storytelling) + factory anti-slop rules.
Hierarchical retrieval: page overrides live in `design-system/pages/<page>.md`; if absent, this file is law.

## 1. Color tokens

| Token | Value | Usage |
|---|---|---|
| `--ink-950` | `#07070B` | Page bg (default, OLED) |
| `--ink-900` | `#0D0D14` | Alt scene bg, cards on cards |
| `--ink-800` | `#15151F` | Hairline-separated surfaces |
| `--glass` | `rgba(255,255,255,0.06)` | Glass panel fill (+ blur 16px) |
| `--glass-border` | `rgba(255,255,255,0.12)` | 1px panel borders |
| `--volt` | `#D4FF3F` | PRIMARY accent: CTA fill, focus rings, key numerals |
| `--volt-dim` | `rgba(212,255,63,0.14)` | Volt glow fields, hover washes |
| `--violet` | `#7C6CFF` | Secondary: hero gradient, chart series 2 |
| `--ember` | `#FF8A3D` | Tertiary: proof scene, warning-adjacent |
| `--text-hi` | `#F4F5F0` | Headlines, primary text |
| `--text-lo` | `#9DA1AC` | Body muted (4.6:1 on ink-950) |
| `--danger` | `#FF5C7A` | Destructive only |

Rules: volt ≤10% of any viewport. Never volt text on violet (vibration). Public profile
themes: **Volt** (as-is), **Violet Hour** (violet primary / volt numerals), **Ember**
(ember primary / violet glow). On-volt text = ink-950 (13:1).

## 2. Typography

- `font-heading`: **Space Grotesk** 500/600/700 — headlines, scene titles, stat values.
- `font-body`: **DM Sans** 400/500 — body, UI, forms. Min 16px.
- `font-mono`: **Space Mono** 400/700 — analytics numerals (`tabular-nums`), scene index chips ("01 / 05"), handles, kbd.
- Scale: `display` clamp(2.75rem,6vw+1rem,6rem)/1.02/-0.03em · `h2` clamp(2rem,3.5vw+0.5rem,3.5rem)/1.08 · `h3` 1.5rem · `body-lg` 1.125rem/1.6 · `body` 1rem/1.6 · `caption` 0.8125rem mono uppercase tracking +0.08em.
- Landing headlines: sentence case. Never all-caps except mono caption chips.

## 3. Spacing, radius, elevation

- Spacing: 4px base; sections pad-y 96px min (desktop) / 64px (mobile); scene gap 128px.
- Container: `max-w-6xl` everywhere (landing + dashboard). One width, no mixing.
- Radius: `r-sm` 10px (inputs/chips) · `r-md` 16px (cards/tiles) · `r-lg` 24px (glass panels/phone) · `r-full` (pills/CTA).
- Elevation = glass stack, not gray shadows: L1 `--glass`+blur16+1px border · L2 fill 0.09+blur20 · L3 modal fill 0.12+blur24 + `0 24px 64px rgba(0,0,0,0.5)`. Accent glow (`0 0 48px --volt-dim`) reserved for hero CTA + active nav pill.
- Z-scale: 10 (raised) / 20 (sticky nav) / 30 (drawer) / 50 (modal/toast).

## 4. Motion tokens

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 150ms | Hovers, color shifts |
| `--dur-base` | 240ms | Card lifts, fades |
| `--dur-slow` | 420ms | Panel entrances |
| `--ease-out` | cubic-bezier(0.16,1,0.3,1) | Everything non-scrub |
| spring | stiffness 220, damping 26 | Magnetic CTA, tilts |
| scrub | scroll-linked, no duration | Pinned scenes |

Principles (from design one-pager, binding): scroll = timeline; transform/opacity only on
scrub paths; ≤3 parallax layers/scene (±24/±12/±6px); tilt ≤6°; chapter accents interpolate
across boundaries; `prefers-reduced-motion` → static frames + crossfades; mobile: halve
amplitudes, reduce blur, horizontal track → swipe-snap.

## 5. Component library

- **Button/CTA** — primary: volt pill, ink text, 48px, hover = magnetic (≤8px toward cursor, spring) + glow; press scale 0.97. Secondary: glass pill, 1px border, hover border→volt-40%. Ghost: text-lo → text-hi. One primary per fold, no exceptions. Async: spinner + disabled, label persists.
- **Link tile (public profile)** — L1 glass row, r-md: 44px thumb / title DM Sans 500 / mono click-count (owner view only). Hover: translateY(-2px) + border-brighten 150ms (no scale — no layout shift). Entrance: staggered 40ms rise+fade on load. Tap target full-width ≥56px.
- **Profile header (public)** — avatar 96px ring(2px glass-border), display name h3, @handle mono text-lo, bio ≤160 chars. Theme gradient bleeds behind as radial glow, never a filled rectangle.
- **Analytics card (dashboard)** — L1 glass, r-md: caption label mono uppercase / value Space Grotesk 700 2.25rem tabular / delta chip (volt ↑, danger ↓) / 7-pt sparkline (1.5px line, no fill, no axes). Skeleton = shimmering glass on load.
- **Nav (landing)** — floating glass pill bar, `top-4 inset-x-4 max-w-6xl mx-auto`, z-20: logo · Log in (ghost) · Claim your handle (volt pill). Content pads under it. Scroll progress: 2px volt line, top edge.
- **Nav (dashboard)** — left rail 240px (icons+labels, active = volt-dim pill); mobile bottom tab bar. Lucide icons only, 24px viewBox, w-5.
- **Section/scene** — each landing scene: mono index chip ("02 / 05") + one h2 + ≤2 short paragraphs + one visual + ≤1 mini-CTA. Never two stacked text-only sections.
- **Forms** — ink-800 fill, 1px glass border, focus ring 2px volt (visible always), label above (never placeholder-as-label), error `--danger` text+border with message adjacent.
- **Empty states (dashboard)** — illustration-free: glass panel, one-line insight + primary action ("No links yet. Add your first — it takes 10 seconds.").

## 6. Anti-slop constraints (binding)

1. No generic card grids: never >3 same-size cards in a row; features = alternating story beats.
2. No Lorem Ipsum anywhere, ever — real copy from Phase 5 only.
3. No emoji as icons — Lucide SVG only. No stock/AI-generated imagery — product IS the visual.
4. Banned palette: default AI pink-purple gradients (#EC4899→#8B5CF6). Banned fonts: Inter for headings.
5. No box+text hero: hero must contain the live animated profile demo (glass phone).
6. Max copy per fold: 1 headline + 1 subline + 1 CTA (+1 proof line). No paragraph >2 lines in landing.
7. Every interactive element: cursor-pointer, hover feedback, visible focus state.
8. No section without motion purpose — if a scene has nothing to animate, merge it.
9. Hover states never shift layout (color/opacity/translate only, no scale on containers).
10. Both landing and dashboard use these exact tokens — one system, zero drift.

---

## Agentic loop record (Phase 3)

**Critique of initial system:** glass-on-glass everywhere read as visual noise → limited
elevation to 3 levels, glow to 2 uses. Sparklines with fills+axes looked like dashboard
soup → stripped to line-only. Nav was full-width sticky bar (AI default) → floating pill
with edge spacing per ui-ux-pro-max floating-navbar rule. Link tile hover used scale(1.02)
→ swapped to translateY (layout-shift rule). Added empty-state spec (most common missing
state in AI dashboards). Volt coverage rule (≤10%) added after mock reading as "neon soup".
