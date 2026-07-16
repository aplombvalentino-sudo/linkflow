// Authenticated placeholder — gated by dashboard/layout.tsx. Profiles, links
// and analytics land here in a later phase; this page currently shows the one
// piece of dashboard state that exists so far: billing status.
import { verifySession } from "@/lib/firebase/auth-server";
import { getAdminDbOrThrow } from "@/lib/firebase/admin";
import { UpgradeButton } from "@/components/dashboard/upgrade-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Gated by the layout, so a session exists — re-verify here rather than
  // trust a prop, matching the "never trust, always re-check server-side"
  // pattern used throughout this app's auth surface.
  const session = await verifySession();
  const uid = session!.uid;

  const snap = await getAdminDbOrThrow().collection("users").doc(uid).get();
  const plan = (snap.data()?.plan as string | undefined) ?? "free";

  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
        your stage
      </p>
      <h1 className="mt-3 font-heading text-4xl font-bold">Dashboard</h1>
      <p className="mt-3 max-w-md text-text-lo">
        You&apos;re signed in. Profiles, links and analytics land here next.
      </p>

      <div className="glass mt-8 max-w-sm rounded-2xl p-6">
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
  );
}
