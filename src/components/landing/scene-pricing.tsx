"use client";

// Scene 04b — compact Free/Pro pricing strip. Two columns only, one CTA.
// specs/landing-wireframe.md §04b, pricing per product one-pager.
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { MagneticButton } from "./magnetic-button";

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const FREE = [
  "1 profile, unlimited links",
  "6 themes + a living gradient backdrop",
  "7-day analytics",
  "linkflows.xyz/@handle",
];

const PRO = [
  "10 profiles under one account",
  "Your own Spline background",
  "Full analytics history",
  "No LinkFlow badge",
];

export function ScenePricing() {
  return (
    <section aria-labelledby="pricing-title" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
          the price of the stage
        </p>
        <h2 id="pricing-title" className="mt-3 font-heading text-3xl font-bold md:text-4xl">
          Start free. Upgrade when you outgrow one stage.
        </h2>

        <div className="mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          <motion.div
            className="glass rounded-2xl p-7"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: easeOut }}
          >
            <p className="font-heading text-lg font-semibold">Free</p>
            <p className="mt-1 font-heading text-4xl font-bold tabular-nums">
              €0
              <span className="ml-1 font-body text-sm font-normal text-text-lo">forever</span>
            </p>
            <ul className="mt-6 space-y-3">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-text-lo">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-text-hi" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="glass-2 relative rounded-2xl border-volt/30 p-7"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: 0.1, ease: easeOut }}
          >
            <p className="font-heading text-lg font-semibold">
              Pro
              <span className="ml-2 rounded-full bg-volt/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-volt">
                for multi-brands
              </span>
            </p>
            <p className="mt-1 font-heading text-4xl font-bold tabular-nums">
              €9
              <span className="ml-1 font-body text-sm font-normal text-text-lo">/ month</span>
            </p>
            <ul className="mt-6 space-y-3">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-text-lo">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <MagneticButton href="/signup?plan=pro" variant="volt">
                Go Pro
              </MagneticButton>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
