import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin and stripe are large packages with dynamic/native-ish
  // internals (gRPC bindings, package.json version reads, etc.) that Vercel's
  // serverless function file-tracing can fail to bundle correctly — causing a
  // module-load-time crash in the deployed function that does NOT reproduce
  // in `next dev` or a local `next build && next start` (confirmed: both work
  // fine locally with the exact same code; only the Vercel-built function
  // crashes, before any of the route's own code ever executes). Marking them
  // external tells Next.js to require() them from node_modules at runtime
  // instead of bundling them — the standard fix for this class of package.
  serverExternalPackages: ["firebase-admin", "stripe"],
};

export default nextConfig;
