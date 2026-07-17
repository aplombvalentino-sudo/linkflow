// Dashboard home — the authenticated "your stage" view. Gated by
// dashboard/layout.tsx but re-verifies the session server-side. Lists the
// user's profiles (with link counts), offers a create affordance when the
// plan allows another page, and surfaces billing status at the bottom.
import { Sparkles } from "lucide-react";
import { verifySession } from "@/lib/firebase/auth-server";
import {
  getUserPlan,
  getProfilesForUser,
  getLinksForProfile,
} from "@/lib/firebase/data";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { UpgradeButton } from "@/components/dashboard/upgrade-button";
import { CreateProfileForm } from "@/components/dashboard/create-profile-form";
import { ProfileSummaryCard } from "@/components/dashboard/profile-summary-card";

export const dynamic = "force-dynamic";

const MAX_PROFILES = { free: 1, pro: 10 } as const;

export default async function DashboardPage() {
  const session = await verifySession();
  const uid = session!.uid;

  const [plan, profiles] = await Promise.all([
    getUserPlan(uid),
    getProfilesForUser(uid),
  ]);

  const withLinks = await Promise.all(
    profiles.map(async (p) => ({
      profile: p,
      linkCount: (await getLinksForProfile(p.id, {})).length,
    })),
  );

  const canCreate = profiles.length < MAX_PROFILES[plan];

  return (
    <>
      <DashboardHeader />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
          your stage
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
          {profiles.length === 0
            ? "Let's build your first page"
            : "Welcome back"}
        </h1>
        <p className="mt-3 max-w-md text-text-lo">
          {profiles.length === 0
            ? "One link that holds everything you make. Claim your handle to get started."
            : "Every link you share, one home. Edit a page or spin up a new one."}
        </p>

        {profiles.length === 0 ? (
          <div className="glass mx-auto mt-10 flex max-w-lg flex-col items-center rounded-3xl p-8 text-center sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-volt/15">
              <Sparkles className="h-6 w-6 text-volt" aria-hidden />
            </div>
            <h2 className="mt-5 font-heading text-2xl font-bold">
              Claim your first page
            </h2>
            <p className="mt-2 max-w-sm text-sm text-text-lo">
              Pick a handle — it becomes your public link. You can rename the
              page and add links right after.
            </p>
            <div className="mt-7 w-full max-w-sm">
              <CreateProfileForm />
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {withLinks.map(({ profile, linkCount }) => (
              <ProfileSummaryCard
                key={profile.id}
                profile={profile}
                linkCount={linkCount}
              />
            ))}

            {canCreate ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
                  new page
                </p>
                <p className="mt-2 text-sm text-text-lo">
                  Spin up another stage — a fresh handle, its own links.
                </p>
                <div className="mt-4">
                  <CreateProfileForm />
                </div>
              </div>
            ) : null}
          </div>
        )}

        {profiles.length > 0 && !canCreate && plan === "free" ? (
          <p className="mt-5 font-mono text-xs text-text-lo">
            Free covers 1 profile. Go Pro to run up to 10.
          </p>
        ) : null}

        <div className="glass mt-12 max-w-sm rounded-2xl p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
            plan
          </p>
          {plan === "pro" ? (
            <p className="mt-2 font-heading text-lg font-semibold text-volt">
              Pro — thanks for the support
            </p>
          ) : (
            <>
              <p className="mt-2 font-heading text-lg font-semibold">Free</p>
              <p className="mt-1 text-sm text-text-lo">
                1 profile, unlimited links, 7-day analytics.
              </p>
              <UpgradeButton />
            </>
          )}
        </div>
      </main>
    </>
  );
}
