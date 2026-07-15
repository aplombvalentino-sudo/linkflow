"use client";

// The animated LinkFlow bio profile — the product itself, reused as the hero
// demo, the "why not" morph target, and the proof reel. MASTER.md §5 link tile.
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { DemoProfile, THEME_ACCENT } from "@/lib/demo-data";

export function ProfileCard({
  profile,
  animateIn = true,
  compact = false,
}: {
  profile: DemoProfile;
  /** stagger the tiles in when the card enters the viewport */
  animateIn?: boolean;
  /** smaller paddings for mini mockups */
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const accent = THEME_ACCENT[profile.theme];
  const stagger = reduceMotion ? 0 : 0.04;

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-ink-900 ${compact ? "p-4" : "p-6"}`}
    >
      {/* theme glow — radial bleed, never a filled rectangle (MASTER.md §5) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: accent }}
      />

      <div className="relative flex flex-col items-center text-center">
        <div
          className={`flex items-center justify-center rounded-full font-heading font-semibold text-ink-950 ${compact ? "h-14 w-14 text-lg" : "h-20 w-20 text-2xl"}`}
          style={{ background: accent, boxShadow: `0 0 32px ${accent}33` }}
        >
          {profile.initials}
        </div>
        <p className={`font-heading font-semibold ${compact ? "mt-2 text-base" : "mt-3 text-xl"}`}>
          {profile.displayName}
        </p>
        <p className="font-mono text-xs text-text-lo">@{profile.handle}</p>
        {!compact && (
          <p className="mt-2 max-w-[24ch] text-sm leading-relaxed text-text-lo">
            {profile.bio}
          </p>
        )}
      </div>

      <ul className={`relative flex flex-col ${compact ? "mt-3 gap-2" : "mt-5 gap-3"}`}>
        {profile.links.map((link, i) => (
          <motion.li
            key={link.title}
            initial={animateIn && !reduceMotion ? { opacity: 0, y: 14 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.42, delay: i * stagger + 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="tile group flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-transform duration-150 hover:-translate-y-0.5">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: accent }}
              />
              <span className="min-w-0 flex-1 text-left">
                <span className={`block truncate font-medium ${compact ? "text-xs" : "text-sm"}`}>
                  {link.title}
                </span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-text-lo">
                  {link.meta}
                </span>
              </span>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 text-text-lo transition-colors duration-150 group-hover:text-text-hi"
                aria-hidden
              />
            </div>
          </motion.li>
        ))}
      </ul>

      {!compact && (
        <p className="relative mt-auto pt-4 text-center font-mono text-[10px] uppercase tracking-widest text-text-lo">
          {profile.weeklyViews.toLocaleString("en-US")} views this week
        </p>
      )}
    </div>
  );
}
