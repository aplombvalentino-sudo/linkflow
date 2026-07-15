// Next.js middleware (Edge runtime). Guards /dashboard/*.
//
// Firebase note: the Admin SDK can't run on the Edge, so middleware only checks
// for the presence of the Firebase session cookie (cheap, non-cryptographic).
// The real cryptographic verification (verifySessionCookie) happens in the
// /dashboard server layout, which can reject a forged/expired cookie. This is
// the standard Next.js + Firebase split — see specs/architecture.md.
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "__session";

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
