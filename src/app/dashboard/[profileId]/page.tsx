// Profile editor route. Re-verifies the session, loads the profile with an
// explicit ownership check (getProfileById does not enforce it), fetches all
// links, computes the public share URL from request headers, and hands the
// client hub everything it needs.
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/firebase/auth-server";
import { getProfileById, getLinksForProfile, getUserPlan } from "@/lib/firebase/data";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProfileEditor } from "@/components/dashboard/profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfileEditorPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const session = await verifySession();
  const uid = session!.uid;

  const profile = await getProfileById(profileId);
  if (!profile || profile.userId !== uid) notFound();

  const [links, plan] = await Promise.all([
    getLinksForProfile(profileId, {}),
    getUserPlan(uid),
  ]);

  const h = await headers();
  const host = h.get("host");
  const proto = host && host.includes("localhost") ? "http" : "https";
  const publicUrl = `${proto}://${host}/${profile.handle}`;

  return (
    <>
      <DashboardHeader back={{ label: "Dashboard", href: "/dashboard" }} />
      <main>
        <ProfileEditor
          profile={profile}
          initialLinks={links}
          publicUrl={publicUrl}
          plan={plan}
        />
      </main>
    </>
  );
}
