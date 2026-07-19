"use client";

// Scene 04 — creator proof: scroll-scrubbed reel of demo profiles.
// Honestly labeled as demos — no fabricated testimonials.
// specs/landing-wireframe.md §04.
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ProfileCard } from "@/components/profile/profile-card";
import { DEMO_PROFILES } from "@/lib/demo-data";
import { useIsMobile } from "@/lib/use-is-mobile";

export function SceneProof() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // the whole reel drifts left as the visitor scrolls through the scene
  const reelX = useTransform(scrollYProgress, [0.1, 0.9], ["6%", "-14%"]);
  const glowOpacity = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);

  return (
    <section ref={ref} aria-labelledby="proof-title" className="relative overflow-hidden py-28">
      {/* ember chapter glow fades in with scroll */}
      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { opacity: glowOpacity }}
        className="pointer-events-none absolute right-0 top-0 h-[36rem] w-[36rem] translate-x-1/3 rounded-full bg-ember/10 blur-[140px]"
      />

      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ember">
          04 / 05 — the proof
        </p>
        <h2
          id="proof-title"
          className="mt-3 max-w-xl font-heading text-[clamp(2rem,3.5vw+0.5rem,3.5rem)] font-bold leading-[1.08]"
        >
          Built for the ones being watched.
        </h2>
        <p className="mt-4 max-w-md text-lg text-text-lo">
          Three demo stages, three different brands. Claim yours before someone
          takes <span className="font-mono text-text-hi">@you</span>.
        </p>
      </div>

      {/* mobile: a swipeable snap carousel (hidden scrollbar) — the desktop
          scroll-drift reel just clips the outer cards on a narrow screen.
          desktop: keep the drift, centered and clipped by the section. */}
      <motion.div
        style={reduceMotion || isMobile ? undefined : { x: reelX }}
        className="no-scrollbar mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 md:snap-none md:justify-center md:gap-8 md:overflow-visible md:pb-0"
      >
        {DEMO_PROFILES.map((p, i) => {
          const rotate = reduceMotion || isMobile ? 0 : (i - 1) * 4;
          return (
            <motion.div
              key={p.handle}
              className="w-[280px] shrink-0 snap-center"
              style={{ rotate }}
              initial={{ opacity: 0, y: 64 }}
              whileInView={{ opacity: 1, y: i === 1 ? -16 : 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="glass-2 rounded-[2rem] p-2">
                <div className="h-[460px] overflow-hidden rounded-[1.6rem]">
                  <ProfileCard profile={p} />
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-text-lo">
                demo profile
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
