// GET /r/[linkId] — the click tracker + outbound redirect. Records the click
// (best-effort, via resolveAndRecordClick) and 302s to the link's destination.
// Only http(s) and mailto: destinations are honored — anything else
// (javascript:, data:, missing/inactive link) is a 404, so this route can't
// become an open vector. mailto: is allowed alongside http(s): it can't XSS,
// open-redirect, or smuggle another protocol, it just launches the visitor's
// mail client (see assertUrl in validation.ts for the write-side rationale).
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveAndRecordClick } from "@/lib/firebase/data";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ linkId: string }>;
}

/** First entry of an x-forwarded-for chain is the originating client IP. */
function clientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return "";
  return forwardedFor.split(",")[0].trim();
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { linkId } = await params;

  const h = await headers();
  const url = await resolveAndRecordClick(linkId, {
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    ip: clientIp(h.get("x-forwarded-for")),
  });

  if (!url) {
    notFound();
  }

  // Defense in depth: never redirect to an unexpected scheme even if one
  // somehow got persisted. Only http(s) and mailto: are allowed out this door.
  const lower = url.toLowerCase();
  if (
    !lower.startsWith("http://") &&
    !lower.startsWith("https://") &&
    !lower.startsWith("mailto:")
  ) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(url, 302);
}
