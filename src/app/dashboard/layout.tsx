// Authoritative auth gate for /dashboard/* (risk #2). Runs on the server and
// cryptographically verifies the Firebase session cookie via the Admin SDK.
// A forged/expired/revoked cookie that passes the Edge middleware's presence
// check is rejected here before any dashboard content renders.
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/firebase/auth-server";

// Reads cookies → always dynamic; never statically prerendered.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");
  return <>{children}</>;
}
