// Shared dashboard chrome: wordmark + optional back link + logout. Server
// component; the only interactive bit (logout) is an isolated client island.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoutButton } from "./logout-button";

export function DashboardHeader({
  back,
}: {
  /** Optional back link (label + href), e.g. { label: "Dashboard", href: "/dashboard" }. */
  back?: { label: string; href: string };
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="font-heading text-lg font-semibold tracking-tight text-text-hi transition-opacity hover:opacity-80"
          >
            link<span className="text-volt">flow</span>
          </Link>
          {back ? (
            <>
              <span className="text-text-lo/40" aria-hidden>
                /
              </span>
              <Link
                href={back.href}
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-text-hi"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                {back.label}
              </Link>
            </>
          ) : null}
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
