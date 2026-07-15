# LinkFlow — Design One-Pager (v2, post-critique)

**Date:** 2026-07-13 · **Phase:** 1 · **Source:** ui-ux-pro-max catalog
(Glassmorphism × Dark OLED × Scroll-Triggered Storytelling), refined per discovery.

## Style name

**“Neon Glass Cinema”** — a hybrid direction composed from three catalog entries:
- Pattern: **Scroll-Triggered Storytelling** (chaptered narrative, mini-CTA per chapter,
  progressive accent color per scene, progress indicator).
- Surface: **Glassmorphism on OLED ink** (frosted panels, 1px rgba-white borders,
  backdrop blur 10–20px, z-depth via layered glass, low white emission).
- Attitude: bold display grotesk instead of default Inter/Jakarta (anti-slop rule:
  no system-default typography personality).

## Palette (locked at Phase 1, token-finalized in Phase 3)

| Token | Hex | Role |
|---|---|---|
| `ink-950` | `#07070B` | Page background (OLED black, slight blue cast) |
| `ink-900` | `#0D0D14` | Scene background alt |
| `glass` | `rgba(255,255,255,0.06)` | Panel fill + `backdrop-blur` |
| `volt` | `#D4FF3F` | Signature accent — CTA, focus, key numerals |
| `violet` | `#7C6CFF` | Secondary glow, hero gradient |
| `ember` | `#FF8A3D` | Warm chapter accent (proof scene) |
| `text-hi` | `#F4F5F0` | Headlines / primary text |
| `text-lo` | `#9DA1AC` | Body / muted (4.5:1 on ink) |

**Chapter color progression (scroll narrative):** Hero = violet glow → Problem = desaturated
gray/monochrome (the "boring Linktree" world) → Features = volt → Proof = ember →
Final CTA = volt on pure ink. The accent shift IS the storytelling device.

**Anti-slop guard:** no pink-purple default AI gradient (#EC4899→#8B5CF6 banned);
volt-on-ink is the signature, used sparingly (≤10% of any viewport).

## Typography

- **Headings / display:** Space Grotesk (500–700) — geometric grotesk with real character.
- **Body / UI:** DM Sans (400–500), 16px minimum, line-height 1.6.
- **Numerals / analytics / labels:** Space Mono — tabular stats, kbd-style chips, scene
  index ("01 / 05").
- Scale: display clamp(2.75rem → 6rem), h2 clamp(2rem → 3.5rem), body 1rem/1.125rem.

## Motion principles

1. **Scroll is the timeline.** Pinned scenes scrubbed by scroll progress (Framer Motion
   `useScroll` + `useTransform`); the page plays like a controlled video.
2. **Transform/opacity only** for scroll-linked values (60fps rule); no animated
   width/height/box-shadow on scrub paths.
3. **Depth model:** 3 parallax layers max per scene (bg glow ±24px, glass mid ±12px,
   content ±6px); glass panels tilt ≤6° with spring smoothing.
4. **Micro-interactions:** 150–300ms, `ease-out`; CTA has magnetic hover (translate
   toward cursor ≤8px) + press scale 0.97.
5. **Chapter transitions:** accent color + background gradient interpolate across scene
   boundaries — continuous, no hard cuts.
6. **Reduced motion:** `prefers-reduced-motion` collapses scrub scenes to static frames
   with crossfades; all content readable with JS disabled.
7. **Mobile:** full scrub kept but simplified — horizontal track becomes swipe-snap,
   parallax amplitude halved, blur radius reduced (GPU cost).

## First 3 seconds (locked hierarchy)

1. Animated glass phone mockup playing a fitness-creator LinkFlow profile (auto-plays
   entrance choreography, then loops subtle idle motion).
2. Headline (Space Grotesk, 2 lines max) + one volt CTA.
3. Nav: logo + "Log in" ghost + "Claim your handle" volt pill. Nothing else above fold.

---

## Agentic loop record

**v1 draft weaknesses (self-critique):**
- v1 used the catalog's default creator-pink palette — indistinguishable from every
  AI-generated creator tool; replaced with volt/violet/ember on OLED ink.
- v1 set Inter for headings — the #1 AI-slop tell; replaced with Space Grotesk +
  Space Mono numeral system.
- Motion section said "smooth, delightful animations" — adjectives, not spec; rewritten
  as numbered principles with amplitudes, durations, layer counts, and fallbacks.
- Glassmorphism risk (unreadable low-contrast panels) mitigated with explicit glass
  fill value + 4.5:1 text tokens + ≤10% accent coverage rule.
