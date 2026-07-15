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

export function SceneProof() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
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

      <motion.div
        style={reduceMotion ? undefined : { x: reelX }}
        className="mt-14 flex justify-center gap-8 px-6"
      >
        {DEMO_PROFILES.map((p, i) => {
          const rotate = reduceMotion ? 0 : (i - 1) * 4;
          return (
            <motion.div
              key={p.handle}
              className="w-[280px] shrink-0"
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
