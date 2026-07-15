// Minimal authenticated placeholder — gated by dashboard/layout.tsx. The full
// dashboard (profiles, links, analytics) is built in a later phase; this makes
// the protected route real so the auth gate is exercised end to end.
export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
        your stage
      </p>
      <h1 className="mt-3 font-heading text-4xl font-bold">Dashboard</h1>
      <p className="mt-3 max-w-md text-text-lo">
        You&apos;re signed in. Profiles, links and analytics land here next.
      </p>
    </main>
  );
}
