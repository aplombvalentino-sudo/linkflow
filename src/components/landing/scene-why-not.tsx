"use client";

// Scene 02 — "Why not Linktree?" Pinned horizontal track on desktop
// (vertical scroll drives translateX), swipe-snap on mobile.
// specs/landing-wireframe.md §02.
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ProfileCard } from "@/components/profile/profile-card";
import { DEMO_PROFILES } from "@/lib/demo-data";

const GENERIC_LINKS = [
  "My website",
  "Latest video",
  "Merch store",
  "Newsletter",
];

/** Simplified "every other bio link" mock — deliberately flat and gray. */
function GenericBioMock({ label }: { label: string }) {
  return (
    <div className="w-full max-w-[260px] rounded-2xl bg-[#f2f2f2] p-5 text-center shadow-inner">
      <div className="mx-auto h-12 w-12 rounded-full bg-neutral-300" aria-hidden />
      <p className="mt-2 text-sm font-semibold text-neutral-700">{label}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {GENERIC_LINKS.map((l) => (
          <li
            key={l}
            className="rounded-md border border-neutral-300 bg-white py-2.5 text-xs text-neutral-600"
          >
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Panel({
  index,
  title,
  body,
  cta,
  children,
}: {
  index: string;
  title: string;
  body: string;
  cta?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    // w-full stacks cleanly on mobile; md:w-screen fills each slot of the
    // desktop horizontal track. md:h-full lets the track stretch it full-height.
    <div className="flex w-full max-w-[100vw] shrink-0 snap-center items-center md:h-full md:w-screen">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">{index}</p>
          <h3 className="mt-3 font-heading text-3xl font-bold leading-tight md:text-5xl">
            {title}
          </h3>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-text-lo">{body}</p>
          {cta && (
            <a
              href={cta.href}
              className="mt-6 inline-block cursor-pointer font-heading text-sm font-semibold text-volt underline-offset-4 transition-colors duration-150 hover:underline"
            >
              {cta.label}
            </a>
          )}
        </div>
        <div className="flex items-center justify-center">{children}</div>
      </div>
    </div>
  );
}

export function SceneWhyNot() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, [0.08, 0.92], ["0vw", "-200vw"]);
  // the gray world re-lights as the morph panel arrives
  const relight = useTransform(scrollYProgress, [0.55, 0.85], [0.35, 1]);

  const panels = (
    <>
      <Panel
        index="02 / 05 — the problem"
        title="Every bio link looks the same."
        body="White page. Gray buttons. Your brand, flattened into a template."
      >
        <div style={{ filter: "grayscale(1)" }}>
          <GenericBioMock label="@every.creator" />
        </div>
      </Panel>
      <Panel
        index="02 / 05 — the gap"
        title="You post cinematic content."
        body="Then send people to a beige list. The last click before the sale is the least designed thing you own."
      >
        <div className="flex items-center gap-6">
          <div
            aria-hidden
            className="h-64 w-36 rounded-2xl bg-gradient-to-b from-violet/70 via-ink-800 to-ember/50 shadow-[0_16px_48px_rgba(124,108,255,0.25)]"
          />
          <span className="font-mono text-2xl text-text-lo" aria-hidden>→</span>
          <div style={{ filter: "grayscale(1) brightness(0.9)" }}>
            <GenericBioMock label="@you" />
          </div>
        </div>
      </Panel>
      <Panel
        index="02 / 05 — the switch"
        title="Same links. Different gravity."
        body="Your links, re-staged: motion, depth and a theme that's unmistakably yours."
        cta={{ href: "/signup", label: "Make the switch →" }}
      >
        <motion.div
          style={reduceMotion ? undefined : { opacity: relight }}
          className="w-full max-w-[300px]"
        >
          <div className="glass-2 rounded-[2rem] p-2.5">
            <div className="h-[420px] overflow-hidden rounded-[1.6rem]">
              <ProfileCard profile={DEMO_PROFILES[0]} compact />
            </div>
          </div>
        </motion.div>
      </Panel>
    </>
  );

  return (
    <section id="why-not" ref={ref} aria-label="Why not Linktree" className="relative md:h-[300vh]">
      {/* desktop: pinned track scrubbed by vertical scroll */}
      <div className="sticky top-0 hidden h-screen items-center overflow-hidden md:flex">
        <motion.div
          style={reduceMotion ? undefined : { x }}
          className="flex h-full w-[300vw]"
        >
          {panels}
        </motion.div>
      </div>
      {/* mobile: a clean vertical stack — a horizontal swipe track inside a
          vertically-scrolling page fights the user's scroll and exposes a raw
          scrollbar. Each panel is a full-width block. */}
      <div className="flex flex-col gap-16 py-16 md:hidden">{panels}</div>
    </section>
  );
}
