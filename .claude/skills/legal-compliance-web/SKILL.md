---
name: legal-compliance-web
description: Use whenever a French-law SaaS reaches the legal pipeline stage and needs RGPD/GDPR compliance before deploy. Generates all 6 mandatory items (Privacy Policy, Terms of Service, Cookie Policy, cookie consent banner, RGPD delete + export endpoints) plus a green/red legal-check.md gate. Any red BLOCKS deployment.
allowed-tools: Read, Write, Edit
---

## Purpose

Produce the complete, legally-required RGPD/GDPR compliance surface for a French-law SaaS and gate deployment on it. The factory rule is absolute: **no deployment without a green check from the legal stage** (CLAUDE.md). This skill emits 6 items and a final checklist; any red line in the checklist is a hard deploy blocker.

The 6 items:
1. Privacy Policy at `app/legal/privacy/page.tsx`
2. Terms of Service at `app/legal/terms/page.tsx` (governing law: French law)
3. Cookie Policy at `app/legal/cookies/page.tsx` (categories: essential / analytics / marketing)
4. Cookie consent banner React component (vanilla Tailwind, no external library, blocks analytics until explicit consent, persists in localStorage)
5. RGPD delete endpoint `app/api/user/delete/route.ts` (DELETE -> hard-delete all user rows)
6. RGPD export endpoint `app/api/user/export/route.ts` (GET -> JSON export)

Plus the gate: `specs/<app>/legal-check.md`.

## When to use

- Pipeline reaches the `legal` stage (idea -> research -> scoring -> spec -> build -> design -> security-audit -> **legal** -> marketing -> content -> deploy).
- A SaaS collects ANY personal data (email at signup already counts) and targets EU/France.
- Before any `vercel --prod`. The deploy stage MUST read `legal-check.md` and refuse on red.

## Inputs (resolve before generating)

Fill every `{{token}}` below. Pull values from `specs/<app>/spec.md`; if missing, ask once, then write a `TODO` and mark that checklist line **red**.

| Token | Meaning | Example |
|---|---|---|
| `{{app_name}}` | Public product name | `Invoicely` |
| `{{company_name}}` | Legal entity (raison sociale) | `Invoicely SAS` |
| `{{contact_email}}` | DPO / contact for RGPD requests | `privacy@invoicely.fr` |
| `{{data_types}}` | Comma list of personal data collected | `email, name, billing address, IP, usage logs` |
| `{{cookies}}` | Cookies used per category | `essential: sb-access-token; analytics: _ga, _ga_*; marketing: none` |
| `{{app_slug}}` | Slug used in paths | `invoicely` |
| `{{effective_date}}` | Today (ISO) | `2026-06-22` |

## Workflow

1. Read `specs/<app>/spec.md` and the build output to resolve all tokens above and enumerate the **actual** Supabase tables that store user data (every table with a `user_id` column). You CANNOT write the delete/export endpoints without this list.
2. Generate the 3 legal pages from the templates below into `app/legal/{privacy,terms,cookies}/page.tsx`. Replace every token. Do not ship a token literal.
3. Generate the consent banner into `components/cookie-consent.tsx` and ensure analytics scripts are gated on `localStorage` consent (see anti-patterns).
4. Generate the two RGPD endpoints into `app/api/user/{delete,export}/route.ts`, wiring the real table list from step 1.
5. Write `specs/<app>/legal-check.md` with the green/red checklist. Compute red lines mechanically (token still present, table missing from endpoint, analytics fires pre-consent, etc.).
6. If any line is red, STOP and report the blocker. Do not signal the deploy stage to proceed.

## Template 1 — Privacy Policy (`app/legal/privacy/page.tsx`)

```tsx
export const metadata = { title: "Privacy Policy — {{app_name}}" };

export default function PrivacyPolicy() {
  return (
    <main className="prose mx-auto max-w-3xl px-4 py-12">
      <h1>Privacy Policy</h1>
      <p>Last updated: {{effective_date}}</p>

      <h2>1. Data controller</h2>
      <p>{{company_name}} is the data controller for personal data processed via {{app_name}}.
         For any request concerning your data, contact {{contact_email}}.</p>

      <h2>2. Personal data we collect</h2>
      <p>We process the following categories of personal data: {{data_types}}.</p>

      <h2>3. Purposes and legal bases (Art. 6 GDPR)</h2>
      <ul>
        <li>Account creation and authentication — performance of the contract.</li>
        <li>Billing and payments — legal obligation / performance of the contract.</li>
        <li>Analytics (only after consent) — consent (Art. 6(1)(a)).</li>
        <li>Security and fraud prevention — legitimate interest.</li>
      </ul>

      <h2>4. Retention</h2>
      <p>Account data is kept while your account is active and deleted within 30 days of
         account closure, unless a longer period is required by law (e.g. invoices: 10 years
         under French commercial law).</p>

      <h2>5. Your rights (Art. 15–22 GDPR)</h2>
      <p>You have the right to access, rectify, erase, restrict, port, and object to the
         processing of your data. You may exercise data portability and erasure directly from
         your account settings (data export and account deletion), or by emailing
         {{contact_email}}. You may lodge a complaint with the CNIL (www.cnil.fr).</p>

      <h2>6. Subprocessors</h2>
      <p>We use Supabase (hosting, database, auth), Vercel (hosting), and Stripe (payments,
         where applicable). Each acts as a processor under Art. 28 GDPR.</p>

      <h2>7. International transfers</h2>
      <p>Where data is transferred outside the EU, we rely on Standard Contractual Clauses.</p>

      <h2>8. Cookies</h2>
      <p>See our <a href="/legal/cookies">Cookie Policy</a>.</p>
    </main>
  );
}
```

## Template 2 — Terms of Service (`app/legal/terms/page.tsx`)

```tsx
export const metadata = { title: "Terms of Service — {{app_name}}" };

export default function TermsOfService() {
  return (
    <main className="prose mx-auto max-w-3xl px-4 py-12">
      <h1>Terms of Service</h1>
      <p>Last updated: {{effective_date}}</p>

      <h2>1. Provider</h2>
      <p>{{app_name}} is operated by {{company_name}}. Contact: {{contact_email}}.</p>

      <h2>2. Acceptance</h2>
      <p>By creating an account or using {{app_name}}, you accept these Terms.</p>

      <h2>3. The service</h2>
      <p>{{app_name}} provides a SaaS accessible online. We may update features at any time.</p>

      <h2>4. Accounts</h2>
      <p>You are responsible for safeguarding your credentials and for activity on your account.</p>

      <h2>5. Payment</h2>
      <p>Paid plans are billed via Stripe. Prices are shown at checkout, taxes included where
         applicable. Subscriptions renew automatically unless cancelled.</p>

      <h2>6. Acceptable use</h2>
      <p>You may not use {{app_name}} unlawfully, to infringe rights, or to disrupt the service.</p>

      <h2>7. Liability</h2>
      <p>The service is provided "as is". To the extent permitted by law, {{company_name}}'s
         liability is limited to the amounts paid in the 12 months preceding the claim.</p>

      <h2>8. Termination</h2>
      <p>You may close your account at any time. We may suspend accounts that breach these Terms.</p>

      <h2>9. Governing law and jurisdiction</h2>
      <p>These Terms are governed by <strong>French law</strong>. Disputes fall under the
         exclusive jurisdiction of the competent French courts, subject to mandatory consumer
         protection rules.</p>
    </main>
  );
}
```

## Template 3 — Cookie Policy (`app/legal/cookies/page.tsx`)

```tsx
export const metadata = { title: "Cookie Policy — {{app_name}}" };

export default function CookiePolicy() {
  return (
    <main className="prose mx-auto max-w-3xl px-4 py-12">
      <h1>Cookie Policy</h1>
      <p>Last updated: {{effective_date}}</p>

      <p>{{app_name}} uses cookies in three categories. You control non-essential cookies via
         the consent banner. Configured cookies: {{cookies}}.</p>

      <h2>Essential</h2>
      <p>Required for the service to function (authentication, security, session). Cannot be
         disabled. No consent required (CNIL exemption).</p>

      <h2>Analytics</h2>
      <p>Help us measure usage. Loaded ONLY after you give explicit consent. You can withdraw
         consent at any time by clearing your choice in the banner.</p>

      <h2>Marketing</h2>
      <p>Used for advertising and retargeting. Loaded ONLY after explicit consent.</p>

      <h2>Managing your choice</h2>
      <p>Your preference is stored locally in your browser. Re-open the banner from the footer
         to change it.</p>
    </main>
  );
}
```

## Template 4 — Cookie consent banner (`components/cookie-consent.tsx`)

Vanilla Tailwind, NO external library. Blocks analytics until explicit consent; persists in `localStorage`.

```tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent-v1";
type Consent = "accepted" | "rejected" | null;

export function getConsent(): Consent {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(STORAGE_KEY) as Consent) ?? null;
}

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsent(getConsent());
  }, []);

  function decide(value: Exclude<Consent, null>) {
    localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
    if (value === "accepted") {
      // Load analytics ONLY here. Never before this point.
      window.dispatchEvent(new CustomEvent("cookie-consent-accepted"));
    }
  }

  if (!mounted || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          We use essential cookies to run the service and, with your consent, analytics
          cookies. See our{" "}
          <a href="/legal/cookies" className="underline">Cookie Policy</a>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide("rejected")}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reject
          </button>
          <button
            onClick={() => decide("accepted")}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
```

Gate analytics on the event / `getConsent()`. Example loader (only mount after acceptance):

```tsx
"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { getConsent } from "@/components/cookie-consent";

export function Analytics() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (getConsent() === "accepted") setOk(true);
    const h = () => setOk(true);
    window.addEventListener("cookie-consent-accepted", h);
    return () => window.removeEventListener("cookie-consent-accepted", h);
  }, []);
  if (!ok) return null;
  return <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXX" strategy="afterInteractive" />;
}
```

## Template 5 — RGPD delete endpoint (`app/api/user/delete/route.ts`)

Auth-checked, Supabase server client, hard-deletes ALL user rows. Replace the table list with the real tables that have a `user_id` column (resolved in workflow step 1). Order matters: delete children before parents to respect FK constraints.

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Order child -> parent to satisfy foreign keys. Edit to match the real schema.
const USER_TABLES = ["invoices", "invoice_items", "settings", "profiles"];

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  for (const table of USER_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) {
      return NextResponse.json(
        { error: `Failed deleting from ${table}: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // Delete the auth user last. Requires service-role; call a server-only admin client.
  const { adminClient } = await import("@/lib/supabase/admin");
  const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
```

## Template 6 — RGPD export endpoint (`app/api/user/export/route.ts`)

Auth-checked, Supabase server client, returns a JSON export (right to portability, Art. 20).

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const USER_TABLES = ["profiles", "settings", "invoices", "invoice_items"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exportData: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email, created_at: user.created_at },
  };

  for (const table of USER_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: `Failed reading ${table}: ${error.message}` }, { status: 500 });
    }
    exportData[table] = data;
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="{{app_slug}}-data-export.json"`,
    },
  });
}
```

Note: the delete endpoint's admin step uses the service-role key, which is server-only — NEVER in `NEXT_PUBLIC_*` and never reachable from the client (factory guardrail). The route handler runs server-side, so this is safe.

## Output — `specs/<app>/legal-check.md`

Write this checklist. Mark each line green only when verifiably true; otherwise red. **Any red BLOCKS deployment.**

```md
# Legal compliance check — {{app_name}}

| # | Item | Status |
|---|------|--------|
| 1 | Privacy Policy live at /legal/privacy, no {{token}} left | GREEN / RED |
| 2 | Terms of Service live at /legal/terms, governing law = French law | GREEN / RED |
| 3 | Cookie Policy live at /legal/cookies, 3 categories documented | GREEN / RED |
| 4 | Consent banner present, vanilla Tailwind, persists to localStorage | GREEN / RED |
| 5 | Analytics blocked until explicit consent (no pre-consent network call) | GREEN / RED |
| 6 | DELETE /api/user/delete auth-checked, deletes every user table | GREEN / RED |
| 7 | GET /api/user/export auth-checked, returns full JSON export | GREEN / RED |
| 8 | All user-data tables have RLS enabled | GREEN / RED |
| 9 | Service-role key absent from client / NEXT_PUBLIC_* | GREEN / RED |
| 10 | Footer links to /legal/privacy, /legal/terms, /legal/cookies | GREEN / RED |

## Verdict
DEPLOY ALLOWED  /  DEPLOY BLOCKED (reason: ...)
```

## Anti-patterns

- **Loading Google Analytics / Meta Pixel in the root layout unconditionally.** This fires before consent and violates RGPD + the CNIL guidelines. Analytics MUST mount only after `getConsent() === "accepted"`.
- **Soft-deleting on the RGPD delete route** (e.g. `deleted_at` flag). The spec requires a HARD delete of all user rows plus the auth user. A flag is not erasure under Art. 17.
- **Leaving `{{token}}` literals in shipped pages.** Each unreplaced token is an automatic red line.
- **Skipping the auth check on the endpoints** or trusting a `user_id` from the request body. Always derive the user from `supabase.auth.getUser()` server-side; never accept a client-supplied id.
- **Hardcoding a generic table list** without verifying against the real schema. A missed table leaves orphaned personal data and is a red line.
- **A consent banner with only "Accept"** (no reject). Reject must be as easy as accept (CNIL).

## References

- CLAUDE.md (repo root): pipeline order, guardrails, "no deploy without green legal check".
- App architecture Option A: `/legal/*` routes, `/api/*` route handlers.
- Stack D-001: Next.js 15 App Router, Supabase server client, Tailwind (vanilla for the banner).
- CNIL cookie guidelines; GDPR Art. 6, 15–22, 28.
