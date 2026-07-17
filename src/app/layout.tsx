import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  // Resolves relative OG/canonical URLs. Falls back to the production domain
  // so this stays correct even before NEXT_PUBLIC_APP_URL is flipped in Vercel
  // (metadataBase only affects link/meta tags, never a live redirect — safe to
  // set ahead of DNS being ready, unlike the Stripe checkout redirect).
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://linkflows.xyz"),
  title: "LinkFlow — Your link is a stage",
  description:
    "LinkFlow turns the link in your bio into an animated, on-brand profile — with analytics you'll actually read. Free forever, live in 60 seconds.",
  openGraph: {
    title: "LinkFlow — Your link is a stage",
    description:
      "An animated, on-brand bio link with analytics you'll actually read.",
    siteName: "LinkFlow",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink-950 text-text-hi">
        {/* If JS never runs, SSR'd animation initial states (opacity:0) must
            not hide content — readable-without-JS rule, design-onepager §motion */}
        <noscript>
          <style>{`[style*="opacity"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
