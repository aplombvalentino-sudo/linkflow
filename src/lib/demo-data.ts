// Demo profiles rendered on the landing page (hero phone + proof reel).
// Clearly presented as demos — no fabricated testimonials (honesty rule,
// specs/landing-wireframe.md §04).

export type DemoTheme = "volt" | "violet-hour" | "ember";

export interface DemoLink {
  title: string;
  meta: string; // short context line shown under the title
  clicks: number;
}

export interface DemoProfile {
  handle: string;
  displayName: string;
  bio: string;
  initials: string;
  theme: DemoTheme;
  links: DemoLink[];
  weeklyViews: number;
}

export const THEME_ACCENT: Record<DemoTheme, string> = {
  volt: "#d4ff3f",
  "violet-hour": "#7c6cff",
  ember: "#ff8a3d",
};

export const DEMO_PROFILES: DemoProfile[] = [
  {
    handle: "maera.fit",
    displayName: "Maera Kade",
    bio: "Strength coach. 12-week programs that survive real life.",
    initials: "MK",
    theme: "volt",
    links: [
      { title: "12-Week Reset Program", meta: "Most popular", clicks: 4812 },
      { title: "Free mobility routine", meta: "PDF · 5 min", clicks: 3167 },
      { title: "1:1 coaching waitlist", meta: "3 spots left", clicks: 1930 },
      { title: "My gym kit on Amazon", meta: "Affiliate", clicks: 1204 },
    ],
    weeklyViews: 18240,
  },
  {
    handle: "novaplays",
    displayName: "Nova",
    bio: "Variety streamer. Tuesdays & Fridays, 8pm CET.",
    initials: "NV",
    theme: "violet-hour",
    links: [
      { title: "Watch live on Twitch", meta: "Live Fri 8pm", clicks: 7203 },
      { title: "Best-of clips", meta: "YouTube", clicks: 4521 },
      { title: "Discord community", meta: "12k members", clicks: 2874 },
      { title: "Merch drop 03", meta: "Ends Sunday", clicks: 1648 },
    ],
    weeklyViews: 24730,
  },
  {
    handle: "june.waves",
    displayName: "June Waves",
    bio: "New single 'Undertow' out now. Tour dates below.",
    initials: "JW",
    theme: "ember",
    links: [
      { title: "Listen to 'Undertow'", meta: "All platforms", clicks: 9412 },
      { title: "Tour tickets — autumn", meta: "6 cities", clicks: 5108 },
      { title: "Vinyl pre-order", meta: "Ships Oct", clicks: 2390 },
      { title: "Behind the record", meta: "4 min film", clicks: 1822 },
    ],
    weeklyViews: 31450,
  },
];
