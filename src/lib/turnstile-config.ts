// Cloudflare Turnstile — client-safe config only. The site key is a public
// identifier (safe to ship to the browser, same trust level as the Firebase
// web config); the secret key that actually verifies a solve lives
// server-only in turnstile-server.ts. No SDK import — safe from Edge, client,
// and server alike (mirrors firebase/config.ts's split).
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** False until a site key is configured — the widget simply doesn't render,
 *  same graceful-degrade pattern as isFirebaseConfigured. */
export const hasTurnstileSiteKey = !!TURNSTILE_SITE_KEY;
