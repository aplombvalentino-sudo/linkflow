"use client";

// Signs out: clears the httpOnly session cookie via /api/auth/signout, then
// sends the user back to /login. Shared by the dashboard header.
import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // ignore — we redirect regardless
    }
    window.location.assign("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors duration-150 hover:text-text-hi disabled:opacity-60"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      {busy ? "…" : "Log out"}
    </button>
  );
}
