// One profile at a glance on the dashboard grid: avatar chip, name + handle,
// a live/hidden badge, a link count, and Edit / View actions. Presentational
// server component — no client hooks, no side effects.
import Link from "next/link";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { THEME_ACCENT } from "@/lib/demo-data";
import { initialsFrom } from "@/lib/card-mapper";
import type { ProfileDoc } from "@/lib/firebase/data";

export function ProfileSummaryCard({
  profile,
  linkCount,
}: {
  profile: ProfileDoc;
  linkCount: number;
}) {
  const accent = THEME_ACCENT[profile.theme];

  return (
    <div className="glass rounded-3xl p-5 transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold text-ink-950"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            {initialsFrom(profile.displayName, profile.handle)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-semibold text-text-hi">
            {profile.displayName || profile.handle}
          </p>
          <p className="truncate font-mono text-xs text-text-lo">
            @{profile.handle}
          </p>
        </div>

        {profile.isPublished ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-volt/15 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-volt">
            <Eye className="h-3 w-3" aria-hidden />
            live
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-text-lo">
            <EyeOff className="h-3 w-3" aria-hidden />
            hidden
          </span>
        )}
      </div>

      <p className="mt-4 font-mono text-xs text-text-lo">
        {linkCount} {linkCount === 1 ? "link" : "links"}
      </p>

      <div className="mt-5 flex items-center gap-2">
        <Link
          href={`/dashboard/${profile.id}`}
          className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full glass px-5 font-heading font-medium text-text-hi transition-colors duration-150 hover:border-volt/40"
        >
          Edit
        </Link>
        {/* A hidden page 404s for everyone (including the owner), so only offer
            "View" once it's actually published. */}
        {profile.isPublished ? (
          <Link
            href={`/${profile.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-text-hi"
          >
            View
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
