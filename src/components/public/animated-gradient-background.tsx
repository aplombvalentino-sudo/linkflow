"use client";

// The free-tier default backdrop: the same slow ambient drift as before, plus
// a soft glow that eases toward the visitor's pointer. Pure CSS drift is
// server-rendered (so it plays even before hydration / with JS disabled);
// the pointer-follow is a progressive enhancement layered on top via direct
// DOM writes (no React state) so it never re-renders on every mousemove.
import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const INK_950 = "#07070b";

export function AnimatedGradientBackground({ accent }: { accent: string }) {
  const reduceMotion = useReducedMotion();
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const el = glowRef.current;
    if (!el) return;

    let targetX = 50;
    let targetY = 42;
    let x = targetX;
    let y = targetY;
    let raf = 0;

    function onMove(e: PointerEvent) {
      targetX = (e.clientX / window.innerWidth) * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
    }
    function tick() {
      // Exponential easing toward the pointer — a gentle trail, not a snap.
      x += (targetX - x) * 0.06;
      y += (targetY - y) * 0.06;
      el!.style.setProperty("--mx", `${x.toFixed(2)}%`);
      el!.style.setProperty("--my", `${y.toFixed(2)}%`);
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  const css =
    "@keyframes lf-bg-drift {" +
    "0% { transform: translate3d(-4%, -2%, 0) scale(1.05); }" +
    "50% { transform: translate3d(4%, 3%, 0) scale(1.15); }" +
    "100% { transform: translate3d(-4%, -2%, 0) scale(1.05); }" +
    "}" +
    ".lf-bg-animated {" +
    "background-color: " + INK_950 + ";" +
    "background-image:" +
    " radial-gradient(42rem 42rem at 22% 18%, " + accent + "26, transparent 60%)," +
    " radial-gradient(38rem 38rem at 82% 88%, " + accent + "1f, transparent 62%);" +
    "background-repeat: no-repeat;" +
    "will-change: transform;" +
    "animation: lf-bg-drift 26s ease-in-out infinite;" +
    "}" +
    "@media (prefers-reduced-motion: reduce) {" +
    ".lf-bg-animated { animation: none; }" +
    "}";

  return (
    <>
      <style>{css}</style>
      <div aria-hidden className="lf-bg-animated fixed inset-0 -z-10" />
      {/* Pointer-reactive glow — defaults to a centered position (--mx/--my
          fall back to 50%/42%) so it still looks intentional pre-hydration,
          on touch devices, and under reduced motion. */}
      <div
        ref={glowRef}
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(30rem 30rem at var(--mx, 50%) var(--my, 42%), ${accent}22, transparent 62%)`,
        }}
      />
    </>
  );
}
