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
