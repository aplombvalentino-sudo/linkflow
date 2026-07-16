"use client";

// Kicks off Stripe Checkout: POST /api/stripe/checkout, then redirect the
// whole page to the returned Stripe-hosted URL. Same fetch-then-redirect
// shape as submitAuth (src/lib/firebase/auth-client.ts).
import { useState } from "react";

export function UpgradeButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) {
        setStatus("error");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="mt-2 h-12 cursor-pointer rounded-full bg-volt px-7 font-heading font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "One sec…" : "Upgrade to Pro — €9/mo"}
      </button>
      {status === "error" && (
        <p role="alert" className="mt-2 text-xs text-danger">
          Couldn&apos;t start checkout. Try again.
        </p>
      )}
    </div>
  );
}
