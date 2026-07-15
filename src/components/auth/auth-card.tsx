"use client";

// Shared auth card (login/signup). Performs REAL Firebase auth via submitAuth
// when configured; falls back to the demo notice (no fake login) when Firebase
// isn't set up — demo detection is centralized in isFirebaseConfigured (risks
// #1, #8). MASTER.md §5 forms.
import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { submitAuth } from "@/lib/firebase/auth-client";

type Status = "idle" | "loading" | "demo" | "error";

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
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("loading");
    setErrorMessage("");

    const result = await submitAuth({
      mode,
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      handle: mode === "signup" ? String(form.get("handle") ?? "") : undefined,
    });

    if (result.ok) {
      const params = new URLSearchParams(window.location.search);
      const to = params.get("redirectedFrom") ?? "/dashboard";
      window.location.assign(to);
      return;
    }
    if (result.code === "demo") {
      setStatus("demo");
      return;
    }
    setStatus("error");
    setErrorMessage(result.message ?? "Something went wrong. Try again.");
  }

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

        <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit}>
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
            disabled={status === "loading"}
            className="mt-2 h-12 cursor-pointer rounded-full bg-volt font-heading font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "loading"
              ? "One sec…"
              : mode === "signup"
                ? "Claim it — free"
                : "Log in"}
          </button>
        </form>

        {status === "demo" && (
          <p role="status" className="mt-4 rounded-xl bg-volt/10 px-4 py-3 text-center font-mono text-xs text-volt">
            Demo mode — connect Firebase in .env.local to enable real accounts.
          </p>
        )}
        {status === "error" && (
          <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-center font-mono text-xs text-danger">
            {errorMessage}
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
