"use client";

// SSR-safe viewport check. Returns false on the server and first client render
// (so markup matches and there's no hydration mismatch), then flips to the real
// value after mount. Used by the landing scenes to switch OFF the scroll-scrubbed
// cinematic transforms on phones — where a pinned, scroll-linked timeline reads
// as "broken scrolling" rather than a film. Layout itself is handled by Tailwind
// `md:` classes (no shift); this only gates the framer-motion transforms.
import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)"; // matches Tailwind's md breakpoint

export function useIsMobile(query: string = MOBILE_QUERY): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return isMobile;
}
