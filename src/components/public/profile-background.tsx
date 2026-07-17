// The full-page backdrop behind a public profile. Three treatments — a slow
// animated theme glow (default), a user cover image, or a flat solid color —
// plus a fixed legibility overlay so foreground text stays readable over any
// of them. Server Component: no hooks, just markup + an injected <style>.
import { THEME_ACCENT } from "@/lib/demo-data";
import type { ProfileDoc } from "@/lib/firebase/data";

interface ProfileBackgroundProps {
  style: ProfileDoc["backgroundStyle"];
  theme: ProfileDoc["theme"];
  imageUrl: string | null;
  color: string | null;
}

const INK_950 = "#07070b";

/** Animated treatment: two slow radial blobs built from the theme accent,
 *  drifting over the ink base. Reduced-motion visitors get the same gradient,
 *  frozen. Keyframes are name-scoped (lf-bg-*) so nothing else collides. */
function AnimatedLayer({ accent }: { accent: string }) {
  const css =
    "@keyframes lf-bg-drift {" +
    "0% { transform: translate3d(-4%, -2%, 0) scale(1.05); }" +
    "50% { transform: translate3d(4%, 3%, 0) scale(1.15); }" +
    "100% { transform: translate3d(-4%, -2%, 0) scale(1.05); }" +
    "}" +
    ".lf-bg-animated {" +
    "background-color: " + INK_950 + ";" +
    "background-image:" +
    " radial-gradient(42rem 42rem at 22% 18%, " + accent + "26, transparent 60%)," +
    " radial-gradient(38rem 38rem at 82% 88%, " + accent + "1f, transparent 62%);" +
    "background-repeat: no-repeat;" +
    "will-change: transform;" +
    "animation: lf-bg-drift 26s ease-in-out infinite;" +
    "}" +
    "@media (prefers-reduced-motion: reduce) {" +
    ".lf-bg-animated { animation: none; }" +
    "}";

  return (
    <>
      <style>{css}</style>
      <div aria-hidden className="lf-bg-animated fixed inset-0 -z-10" />
    </>
  );
}

export function ProfileBackground({
  style,
  theme,
  imageUrl,
  color,
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
  } else {
    // "animated", plus the "image"-without-url fallback.
    base = <AnimatedLayer accent={accent} />;
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
