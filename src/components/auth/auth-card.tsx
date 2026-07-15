"use client";

// Shared auth card (login/signup). Demo mode: submits show a notice instead
// of hitting Firebase Auth until credentials are configured — MASTER.md §5 forms.
import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export function AuthCard({
  mode,
  title,
  subtitle,
}: {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
}) {
  const reduceMotion = useReducedMotion();
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet/15 blur-[120px]"
      />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-2 relative w-full max-w-md rounded-3xl p-8"
      >
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs text-text-lo transition-colors duration-150 hover:text-text-hi"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> back to the stage
        </Link>
        <h1 className="mt-5 font-heading text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-lo">{subtitle}</p>

        <form
          className="mt-7 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          {mode === "signup" && (
            <div>
              <label htmlFor="handle" className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-text-lo">
                Your handle
              </label>
              <div className="flex items-center rounded-xl border border-white/15 bg-ink-800 focus-within:border-volt">
                <span className="pl-4 font-mono text-sm text-text-lo">@</span>
                <input
                  id="handle"
                  name="handle"
                  type="text"
                  required
                  placeholder="maera.fit"
                  className="w-full bg-transparent px-2 py-3 text-sm outline-none placeholder:text-text-lo/50"
                />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-text-lo">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/15 bg-ink-800 px-4 py-3 text-sm outline-none placeholder:text-text-lo/50 focus:border-volt"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-text-lo">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-white/15 bg-ink-800 px-4 py-3 text-sm outline-none focus:border-volt"
            />
          </div>
          <button
            type="submit"
            className="mt-2 h-12 cursor-pointer rounded-full bg-volt font-heading font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98]"
          >
            {mode === "signup" ? "Claim it — free" : "Log in"}
          </button>
        </form>

        {submitted && (
          <p role="status" className="mt-4 rounded-xl bg-volt/10 px-4 py-3 text-center font-mono text-xs text-volt">
            Demo mode — connect Firebase in .env.local to enable real accounts.
          </p>
        )}

        <p className="mt-6 text-center text-sm text-text-lo">
          {mode === "signup" ? (
            <>
              Already on stage?{" "}
              <Link href="/login" className="cursor-pointer text-text-hi underline underline-offset-4">
                Log in
              </Link>
            </>
          ) : (
            <>
              No stage yet?{" "}
              <Link href="/signup" className="cursor-pointer text-text-hi underline underline-offset-4">
                Claim your handle
              </Link>
            </>
          )}
        </p>
      </motion.div>
    </main>
  );
}
