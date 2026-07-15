"use client";

// Scene 03 — features as story beats. Four beats, four DIFFERENT visual
// patterns (anti-slop rule: no repeated card grid). specs/landing-wireframe.md §03.
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { DEMO_PROFILES, THEME_ACCENT, DemoTheme } from "@/lib/demo-data";
import { ProfileCard } from "@/components/profile/profile-card";

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

function Beat({
  chip,
  title,
  body,
  visual,
  flip = false,
}: {
  chip: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
      <motion.div
        className={flip ? "md:order-2" : ""}
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: easeOut }}
      >
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-volt">{chip}</p>
        <h3 className="mt-3 font-heading text-3xl font-bold leading-tight md:text-4xl">
          {title}
        </h3>
        <p className="mt-4 max-w-sm text-lg leading-relaxed text-text-lo">{body}</p>
      </motion.div>
      <motion.div
        className={`flex items-center justify-center ${flip ? "md:order-1" : ""}`}
        initial={{ opacity: 0, y: 48, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.7, delay: 0.1, ease: easeOut }}
      >
        {visual}
      </motion.div>
    </div>
  );
}

/* Beat 1 — three profiles fanned like cards in hand */
function FanVisual() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative h-[380px] w-full max-w-[420px]">
      {DEMO_PROFILES.map((p, i) => {
        const rot = (i - 1) * 7;
        const x = (i - 1) * 84;
        return (
          <motion.div
            key={p.handle}
            className="absolute left-1/2 top-1/2 w-[220px]"
            style={{ zIndex: i === 1 ? 2 : 1 }}
            initial={{ x: "-50%", y: "-50%", rotate: 0 }}
            whileInView={
              reduceMotion
                ? undefined
                : { x: `calc(-50% + ${x}px)`, y: "-50%", rotate: rot }
            }
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: easeOut }}
            whileHover={reduceMotion ? undefined : { y: "calc(-50% - 8px)" }}
          >
            <div className="glass-2 rounded-3xl p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
              <div className="h-[300px] overflow-hidden rounded-[1.4rem]">
                <ProfileCard profile={p} compact animateIn={false} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* Beat 2 — analytics card with live-counting mono numerals + sparkline */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, { duration: 1.6, ease: "easeOut", delay: 0.3 });
    return controls.stop;
  }, [inView, mv, to, reduceMotion]);

  return (
    <span ref={ref} className="font-heading text-4xl font-bold tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

const SPARK_PATH = "M0,34 L14,30 L28,31 L42,24 L56,26 L70,16 L84,18 L98,8";

function AnalyticsVisual() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="glass w-full max-w-sm rounded-2xl p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-lo">
        Profile views · 7 days
      </p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <CountUp to={18240} />
        <span className="rounded-full bg-volt/15 px-2 py-0.5 font-mono text-xs text-volt">
          ↑ 23%
        </span>
      </div>
      <svg viewBox="0 0 98 40" className="mt-5 h-12 w-full" aria-hidden>
        <motion.path
          d={SPARK_PATH}
          fill="none"
          stroke="#d4ff3f"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={reduceMotion ? undefined : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.4, delay: 0.4, ease: "easeOut" }}
        />
      </svg>
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        {[
          ["12-Week Reset Program", "26.4%"],
          ["Free mobility routine", "17.3%"],
        ].map(([name, ctr]) => (
          <div key={name} className="flex items-center justify-between text-sm">
            <span className="truncate text-text-lo">{name}</span>
            <span className="font-mono text-xs text-text-hi">{ctr} CTR</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Beat 3 — theme cycler */
const THEMES: DemoTheme[] = ["volt", "violet-hour", "ember"];

function ThemeVisual() {
  const [idx, setIdx] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % THEMES.length), 2000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const profile = { ...DEMO_PROFILES[0], theme: THEMES[idx] };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="glass-2 w-[240px] rounded-3xl p-1.5">
        <div className="h-[320px] overflow-hidden rounded-[1.4rem]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={THEMES[idx]}
              className="h-full"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ProfileCard profile={profile} compact animateIn={false} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="flex gap-3" role="tablist" aria-label="Theme preview">
        {THEMES.map((t, i) => (
          <button
            key={t}
            role="tab"
            aria-selected={i === idx}
            aria-label={`${t} theme`}
            onClick={() => setIdx(i)}
            className={`h-8 w-8 cursor-pointer rounded-full border-2 transition-transform duration-150 hover:scale-110 ${
              i === idx ? "border-white/60" : "border-transparent"
            }`}
            style={{ background: THEME_ACCENT[t] }}
          />
        ))}
      </div>
    </div>
  );
}

/* Beat 4 — self-drawing themed QR tile */
function QrVisual() {
  // deterministic pseudo-QR pattern (not scannable — decorative demo)
  const cells: [number, number][] = [];
  let seed = 7;
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
      seed = (seed * 31 + r * 12 + c) % 97;
      const inFinder =
        (r < 4 && c < 4) || (r < 4 && c > 7) || (r > 7 && c < 4);
      if (!inFinder && seed % 3 === 0) cells.push([r, c]);
    }
  }
  return (
    <div className="glass rounded-2xl p-8">
      <svg viewBox="0 0 120 120" className="h-56 w-56" aria-label="Themed QR code illustration">
        {/* finder squares */}
        {[
          [4, 4],
          [4, 96],
          [96, 4],
        ].map(([y, x]) => (
          <motion.rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="20"
            height="20"
            rx="4"
            fill="none"
            stroke="#d4ff3f"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ))}
        {cells.map(([r, c], i) => (
          <motion.rect
            key={i}
            x={c * 8 + 12}
            y={r * 8 + 12}
            width="5.5"
            height="5.5"
            rx="1.5"
            fill="#f4f5f0"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: r % 4 === 0 ? 0.9 : 0.6 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.25, delay: 0.5 + i * 0.012 }}
          />
        ))}
      </svg>
      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-text-lo">
        linkflow.app/@maera.fit
      </p>
    </div>
  );
}

export function SceneFeatures() {
  return (
    <section aria-label="Features" className="relative py-16">
      {/* volt chapter glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/3 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-volt/[0.07] blur-[140px]"
      />
      <Beat
        chip="03 / 05 — multi-profile"
        title="One account. Every persona."
        body="Your fitness brand, your podcast, your side project — separate stages, one login. Switch in one tap."
        visual={<FanVisual />}
      />
      <Beat
        chip="03 / 05 — analytics"
        title="Know what they tap."
        body="Views, clicks and CTR per link. Numbers with taste — no dashboard soup."
        visual={<AnalyticsVisual />}
        flip
      />
      <Beat
        chip="03 / 05 — themes"
        title="Motion is your brand color."
        body="Three cinematic themes tuned for 60fps. Pick one; stay recognizable everywhere."
        visual={<ThemeVisual />}
      />
      <Beat
        chip="03 / 05 — qr codes"
        title="From stage to street."
        body="A themed QR code for posters, merch and gym walls. Same brand, offline."
        visual={<QrVisual />}
        flip
      />
    </section>
  );
}
