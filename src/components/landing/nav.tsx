"use client";

// Floating glass pill nav + 2px volt scroll-progress line — MASTER.md §5.
// Nav CTA stays glass while the hero CTA is on screen (single dominant CTA
// per fold), then turns volt once the visitor scrolls past the hero.
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";

export function LandingNav() {
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const [pastHero, setPastHero] = useState(false);

  useEffect(
    () =>
      scrollY.on("change", (v) => {
        setPastHero(v > window.innerHeight * 1.5);
      }),
    [scrollY],
  );

  return (
    <header className="fixed inset-x-4 top-4 z-20 mx-auto max-w-6xl">
      <div className="glass flex items-center justify-between rounded-full py-2 pl-5 pr-2">
        <Link
          href="/"
          className="font-heading text-lg font-bold tracking-tight"
          aria-label="LinkFlow home"
        >
          Link<span className="text-volt">Flow</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <Link
            href="/login"
            className="cursor-pointer rounded-full px-4 py-2 text-sm text-text-lo transition-colors duration-150 hover:text-text-hi"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={`cursor-pointer rounded-full px-4 py-2 font-heading text-sm font-semibold transition-colors duration-200 ${
              pastHero
                ? "glow-volt bg-volt text-ink-950"
                : "glass text-text-hi hover:border-volt/40"
            }`}
          >
            Claim your handle
          </Link>
        </nav>
      </div>
      {/* scroll progress — the film's timeline */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="mx-5 mt-1.5 h-0.5 origin-left rounded-full bg-volt/80"
      />
    </header>
  );
}
