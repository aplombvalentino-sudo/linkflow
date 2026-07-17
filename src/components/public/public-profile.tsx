// The rendered public profile: avatar, name, bio, and the tappable link stack.
// Server Component — plain <a> navigations only, no hooks. Every link points at
// /r/[linkId] so the click is counted before the visitor is redirected out.
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { THEME_ACCENT } from "@/lib/demo-data";
import { initialsFrom } from "@/lib/card-mapper";
import type { ProfileDoc, LinkDoc } from "@/lib/firebase/data";
import { ProfileBackground } from "./profile-background";

interface PublicProfileProps {
  profile: ProfileDoc;
  links: LinkDoc[];
}

export function PublicProfile({ profile, links }: PublicProfileProps) {
  const accent = THEME_ACCENT[profile.theme] ?? THEME_ACCENT.volt;
  const name = profile.displayName || profile.handle;

  return (
    <main className="relative min-h-dvh w-full">
      <ProfileBackground
        style={profile.backgroundStyle}
        theme={profile.theme}
        imageUrl={profile.backgroundImageUrl}
        color={profile.backgroundColor}
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-14 pt-16">
        {/* Header — avatar, name, handle, bio */}
        <header className="flex flex-col items-center text-center">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={name}
              className="h-24 w-24 rounded-full object-cover"
              style={{ boxShadow: `0 0 36px ${accent}33` }}
            />
          ) : (
            <div
              aria-hidden
              className="flex h-24 w-24 items-center justify-center rounded-full font-heading text-3xl font-semibold text-ink-950"
              style={{ background: accent, boxShadow: `0 0 36px ${accent}33` }}
            >
              {initialsFrom(profile.displayName, profile.handle)}
            </div>
          )}

          <h1 className="mt-5 font-heading text-2xl font-semibold text-text-hi">
            {name}
          </h1>
          <p className="mt-1 font-mono text-sm text-text-lo">@{profile.handle}</p>

          {profile.bio && (
            <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-text-lo">
              {profile.bio}
            </p>
          )}
        </header>

        {/* Link stack — each tile is a real navigation through the click tracker */}
        {links.length > 0 && (
          <nav className="mt-9 flex flex-col gap-3">
            {links.map((link) => (
              <a
                key={link.id}
                href={`/r/${link.id}`}
                rel="noopener noreferrer nofollow ugc"
                className="group flex items-center gap-3 rounded-2xl glass px-4 py-4 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-volt/40"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: accent }}
                />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-medium text-text-hi">
                    {link.title}
                  </span>
                  {link.meta && (
                    <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-wider text-text-lo">
                      {link.meta}
                    </span>
                  )}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-text-lo transition-colors duration-150 group-hover:text-text-hi"
                />
              </a>
            ))}
          </nav>
        )}

        {/* Footer — quiet attribution / conversion nudge */}
        <footer className="mt-auto pt-14 text-center">
          <Link
            href="/"
            className="font-mono text-xs text-text-lo transition-colors hover:text-text-hi"
          >
            make your own — linkflow
          </Link>
        </footer>
      </div>
    </main>
  );
}
