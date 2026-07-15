"use client";

// Scene 05 — final CTA. Clean, high-contrast, minimal motion: one slow glow
// pulse behind the CTA. specs/landing-wireframe.md §05.
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { MagneticButton } from "./magnetic-button";

export function SceneFinalCta() {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="final-cta-title" className="relative overflow-hidden py-36">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt/10 blur-[100px]"
          animate={reduceMotion ? undefined : { scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
          05 / 05 — your turn
        </p>
        <h2
          id="final-cta-title"
          className="relative mt-4 font-heading text-[clamp(2.5rem,5vw+1rem,5rem)] font-bold leading-none tracking-tight"
        >
          The stage is yours.
        </h2>
        <div className="relative mt-10">
          <MagneticButton href="/signup" variant="volt" glow className="h-14 px-10 text-lg">
            Claim your handle
          </MagneticButton>
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-widest text-text-lo">
          Free forever · no card · 60 seconds
        </p>
      </div>

      <footer className="mx-auto mt-28 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 px-6 pt-8 sm:flex-row">
        <p className="font-heading text-sm font-bold">
          Link<span className="text-volt">Flow</span>
          <span className="ml-3 font-body text-xs font-normal text-text-lo">
            © 2026 — made for the ones being watched
          </span>
        </p>
        <nav aria-label="Legal" className="flex gap-6 font-mono text-xs text-text-lo">
          <Link href="/legal/privacy" className="cursor-pointer transition-colors duration-150 hover:text-text-hi">
            Privacy
          </Link>
          <Link href="/legal/terms" className="cursor-pointer transition-colors duration-150 hover:text-text-hi">
            Terms
          </Link>
          <Link href="/legal/cookies" className="cursor-pointer transition-colors duration-150 hover:text-text-hi">
            Cookies
          </Link>
        </nav>
      </footer>
    </section>
  );
}
