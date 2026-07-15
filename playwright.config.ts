// End-to-end test config (risk #6). Run: `npm run test:e2e` (starts the dev
// server itself via webServer). Scope note: this environment's server-side
// Firebase Admin SDK calls (session-cookie mint/verify) fail on clock skew
// specific to this sandbox — see .claude/memory/blockers.md B-004 — so these
// specs deliberately cover UI/navigation/client-validation/gating behavior
// rather than a full authenticated happy path, which would be flaky here for
// reasons unrelated to the app. On a normally-clocked machine the same specs
// still pass and can be extended to assert the authenticated outcome too.
// vibeguard-treated(tests): No Automated End-to-End Tests for Critical Flows
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    // Use "localhost", not "127.0.0.1": Next.js 15's dev server treats them as
    // different origins and silently blocks /_next/* dev resources (including
    // the app bundle) as cross-origin when the browser requests from 127.0.0.1,
    // which breaks React hydration without any error in the page itself — only
    // a server-side "Blocked cross-origin request" warning gives it away.
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
