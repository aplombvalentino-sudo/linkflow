// The full-page backdrop behind a public profile. Four treatments — a
// mouse-reactive theme glow (default, free), a user cover image, a flat solid
// color, or a Pro user's own Spline scene — plus a fixed legibility overlay so
// foreground text stays readable over any of them. Server Component: the
// Spline iframe and static layers are plain markup; the animated treatment
// delegates to a small client island for its pointer interactivity.
import { THEME_ACCENT } from "@/lib/demo-data";
import type { ProfileDoc } from "@/lib/firebase/data";
import { AnimatedGradientBackground } from "./animated-gradient-background";

interface ProfileBackgroundProps {
  style: ProfileDoc["backgroundStyle"];
  theme: ProfileDoc["theme"];
  imageUrl: string | null;
  color: string | null;
  /** Pro-only Spline (spline.design) scene URL. Already host-validated at
   *  write time (assertSplineUrl) — trusted here without re-checking plan. */
  splineUrl: string | null;
}

const INK_950 = "#07070b";

export function ProfileBackground({
  style,
  theme,
  imageUrl,
  color,
  splineUrl,
}: ProfileBackgroundProps) {
  const accent = THEME_ACCENT[theme] ?? THEME_ACCENT.volt;

  let base: React.ReactNode;
  if (style === "image" && imageUrl) {
    base = (
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${imageUrl}")` }}
      />
    );
  } else if (style === "solid") {
    base = (
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: color || INK_950 }}
      />
    );
  } else if (style === "spline" && splineUrl) {
    base = (
      <div aria-hidden className="fixed inset-0 -z-10 bg-ink-950">
        {/* No allow-top-navigation/allow-popups/allow-forms — a background
            embed must never redirect, pop, or submit on the visitor's behalf.
            no-referrer keeps the visitor's LinkFlow URL from leaking to Spline. */}
        <iframe
          src={splineUrl}
          title="Background animation"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
        />
      </div>
    );
  } else {
    // "animated", plus the "image"- and "spline"-without-url fallbacks.
    base = <AnimatedGradientBackground accent={accent} />;
  }

  return (
    <>
      {base}
      {/* Legibility scrim — always on top of the base, always behind content. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-ink-950/40 to-ink-950/85"
      />
    </>
  );
}
