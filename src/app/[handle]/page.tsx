// GET /[handle] — the public LinkFlow profile page. Resolves the handle, 404s
// on missing/unpublished, records a best-effort view, then renders the links.
// This is the product's front door: the page every LinkFlow user shares.
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  getProfileByHandle,
  getLinksForProfile,
  recordProfileView,
} from "@/lib/firebase/data";
import { PublicProfile } from "@/components/public/public-profile";

interface PageProps {
  params: Promise<{ handle: string }>;
}

/** First entry of an x-forwarded-for chain is the originating client IP. */
function clientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return "";
  return forwardedFor.split(",")[0].trim();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);

  if (!profile || !profile.isPublished) {
    return { title: "Profile not found — LinkFlow" };
  }

  const name = profile.displayName || profile.handle;
  const title = `${name} (@${profile.handle}) — LinkFlow`;
  const description =
    profile.bio || `${name}'s links, all in one place — powered by LinkFlow.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : undefined,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);

  if (!profile || !profile.isPublished) {
    notFound();
  }

  // Reading headers() opts this route into dynamic rendering — exactly what we
  // want so every visit is fresh and countable. Do NOT add revalidate here.
  const h = await headers();
  await recordProfileView(profile.id, {
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    ip: clientIp(h.get("x-forwarded-for")),
  });

  const links = await getLinksForProfile(profile.id, { activeOnly: true });

  return <PublicProfile profile={profile} links={links} />;
}
