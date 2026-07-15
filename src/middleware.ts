// Next.js middleware (Edge runtime). First-line guard for /dashboard/*.
//
// Firebase note: the Admin SDK can't run on the Edge, so this middleware only
// does a CHEAP presence check on the session cookie — it is deliberately NOT the
// security boundary. The real cryptographic verification (verifySessionCookie)
// happens in the /dashboard server layout (src/app/dashboard/layout.tsx via
// verifySession()), which rejects any forged/expired/revoked cookie before the
// dashboard renders. Both layers must hold; the layout is the authoritative one
// (risk #2). This is the standard Next.js + Firebase split — see specs/architecture.md.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

export function middleware(request: NextRequest) {
  // Demo mode: until real Firebase credentials land in .env.local, don't gate
  // anything so the landing and demo pages work standalone.
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const isDemo = !projectId || projectId.includes("your-project");
  if (isDemo) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
