"use client";

// Scene 01 — pinned hero. Entrance choreography plays on load; scroll scrubs
// the phone tilt, glow expansion and scene exit. specs/landing-wireframe.md §01.
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { MagneticButton } from "./magnetic-button";
import { ProfileCard } from "@/components/profile/profile-card";
import { DEMO_PROFILES } from "@/lib/demo-data";

const HEADLINE_WORDS = ["Your", "link", "is", "a", "stage."];

export function SceneHero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const phoneY = useTransform(scrollYProgress, [0, 0.35, 1], [56, 0, -48]);
  const phoneRotate = useTransform(scrollYProgress, [0, 0.4], [8, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 0.6], [0.7, 1.3]);
  const copyOpacity = useTransform(scrollYProgress, [0.7, 0.95], [1, 0]);
  const copyY = useTransform(scrollYProgress, [0.7, 0.95], [0, -48]);

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative h-[260vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* violet radial glow — chapter 01 accent */}
        <motion.div
          aria-hidden
          style={reduceMotion ? undefined : { scale: glowScale }}
          className="pointer-events-none absolute left-[60%] top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/20 blur-[120px]"
        />

        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-24 lg:grid-cols-2 lg:pt-0">
          <motion.div style={reduceMotion ? undefined : { opacity: copyOpacity, y: copyY }}>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
              01 / 05 — the stage
            </p>
            <h1
              id="hero-title"
              className="mt-4 font-heading text-[clamp(2.75rem,6vw+1rem,6rem)] font-bold leading-[1.02] tracking-tight"
            >
              {HEADLINE_WORDS.map((word, i) => (
                <motion.span
                  key={word + i}
                  className="inline-block whitespace-pre"
                  initial={reduceMotion ? false : { opacity: 0, y: 32, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                  {i < HEADLINE_WORDS.length - 1 ? " " : ""}
                </motion.span>
              ))}
            </h1>
            <motion.p
              className="mt-6 max-w-md text-lg leading-relaxed text-text-lo"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              LinkFlow turns the link in your bio into an animated, on-brand
              profile — with analytics you&apos;ll actually read.
            </motion.p>
            <motion.div
              className="mt-8 flex flex-wrap items-center gap-5"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <MagneticButton href="/signup" variant="volt" glow>
                Claim your handle
              </MagneticButton>
              <a
                href="#why-not"
                className="cursor-pointer text-sm text-text-lo underline-offset-4 transition-colors duration-150 hover:text-text-hi hover:underline"
              >
                See it move ↓
              </a>
            </motion.div>
            <motion.p
              className="mt-6 font-mono text-xs uppercase tracking-widest text-text-lo"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.85 }}
            >
              Free forever · live in 60 seconds
            </motion.p>
          </motion.div>

          {/* glass phone playing the demo profile */}
          <motion.div
            style={reduceMotion ? undefined : { y: phoneY, rotate: phoneRotate }}
            initial={reduceMotion ? false : { opacity: 0, y: 96 }}
            animate={{ opacity: 1, y: 56 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-[340px]"
          >
            <div className="glass-2 rounded-[2.5rem] p-3 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
              <div
                aria-hidden
                className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/15"
              />
              <div className="h-[560px] overflow-hidden rounded-[2rem]">
                <ProfileCard profile={DEMO_PROFILES[0]} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
