// Pure, client-safe helpers for shaping real profile/link data into the
// DemoProfile shape that <ProfileCard> renders. No Firebase/Node deps, so both
// the dashboard editor (live preview from form state) and any server component
// can use it. The public profile page uses its own richer renderer; this is
// specifically for the ProfileCard preview surface.
import type { DemoProfile, DemoTheme } from "@/lib/demo-data";

/** Up to two uppercase initials from a display name, falling back to the
 *  handle, falling back to "★". */
export function initialsFrom(displayName: string, handle: string): string {
  const source = displayName.trim() || handle.trim();
  if (!source) return "★";
  const words = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    words.length >= 2
      ? words[0][0] + words[1][0]
      : source.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2);
  return (letters || source.slice(0, 2)).toUpperCase();
}

/** A friendly host label for a URL, used as a link's fallback subtitle when the
 *  user didn't set a custom note. "https://twitch.tv/nova" -> "twitch.tv". */
export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export interface CardLinkInput {
  title: string;
  url: string;
  meta?: string;
  clickCount?: number;
}

export interface CardProfileInput {
  handle: string;
  displayName: string;
  bio: string;
  theme: string;
  links: CardLinkInput[];
  weeklyViews?: number;
}

/** Shape real profile data into the DemoProfile props ProfileCard expects. */
export function buildCardProfile(input: CardProfileInput): DemoProfile {
  return {
    handle: input.handle,
    displayName: input.displayName || input.handle,
    bio: input.bio,
    initials: initialsFrom(input.displayName, input.handle),
    theme: (input.theme as DemoTheme) ?? "volt",
    weeklyViews: input.weeklyViews ?? 0,
    links: input.links.map((l) => ({
      title: l.title,
      meta: l.meta && l.meta.length > 0 ? l.meta : hostFromUrl(l.url),
      clicks: l.clickCount ?? 0,
    })),
  };
}
