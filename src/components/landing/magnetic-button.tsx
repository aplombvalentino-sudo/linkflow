"use client";

// Volt CTA with magnetic hover (≤8px toward cursor) + press scale — MASTER.md §5.
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import Link from "next/link";

const MAX_PULL = 8;
const spring = { stiffness: 220, damping: 26 };

export function MagneticButton({
  href,
  children,
  variant = "volt",
  glow = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "volt" | "glass" | "ghost";
  glow?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useSpring(useMotionValue(0), spring);
  const y = useSpring(useMotionValue(0), spring);

  function onPointerMove(e: React.PointerEvent) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(Math.max(-MAX_PULL, Math.min(MAX_PULL, dx / 6)));
    y.set(Math.max(-MAX_PULL, Math.min(MAX_PULL, dy / 6)));
  }

  function onPointerLeave() {
    x.set(0);
    y.set(0);
  }

  const styles = {
    volt: "bg-volt text-ink-950 hover:brightness-105",
    glass: "glass text-text-hi hover:border-volt/40",
    ghost: "text-text-lo hover:text-text-hi",
  }[variant];

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="inline-block"
    >
      <motion.span whileTap={reduceMotion ? undefined : { scale: 0.97 }} className="inline-block">
        <Link
          href={href}
          className={`inline-flex h-12 cursor-pointer items-center justify-center rounded-full px-7 font-heading text-base font-semibold transition-colors duration-150 ${styles} ${glow ? "glow-volt" : ""} ${className}`}
        >
          {children}
        </Link>
      </motion.span>
    </motion.div>
  );
}
