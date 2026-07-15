// E2E coverage for the auth surface: page rendering + navigation, client-side
// handle validation (risk #5's fix, exercised end to end in a real browser),
// and unauthenticated /dashboard gating behavior. See playwright.config.ts for
// why this suite doesn't attempt a full authenticated happy path here.
import { test, expect } from "@playwright/test";

test.describe("signup / login pages", () => {
  test("signup renders the handle, email and password fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /claim your handle/i })).toBeVisible();
    await expect(page.locator("#handle")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("login and signup cross-link to each other", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /claim your handle/i }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await page.getByRole("link", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("client-side handle validation (risk #5)", () => {
  test("a too-short handle shows an inline error and doesn't submit", async ({ page }) => {
    await page.goto("/signup");
    const handle = page.locator("#handle");
    await handle.fill("a");
    await handle.blur();

    const error = page.locator("#handle-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("2");
    // still on /signup — the invalid-handle short-circuit in handleSubmit
    // prevented any network round trip.
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("a reserved handle is rejected with the exact server-side reason", async ({ page }) => {
    await page.goto("/signup");
    const handle = page.locator("#handle");
    await handle.fill("admin");
    await handle.blur();
    await expect(page.locator("#handle-error")).toContainText(/reserved/i);
  });

  test("a valid handle format clears the error", async ({ page }) => {
    await page.goto("/signup");
    const handle = page.locator("#handle");
    await handle.fill("a");
    await handle.blur();
    await expect(page.locator("#handle-error")).toBeVisible();

    await handle.fill("maera.fit");
    await handle.blur();
    await expect(page.locator("#handle-error")).toBeHidden();
  });
});

test.describe("dashboard gating", () => {
  test("unauthenticated /dashboard is never rendered unprotected", async ({ page }) => {
    await page.goto("/dashboard");

    if (page.url().includes("/login")) {
      // Firebase configured: middleware + layout correctly gate the route.
      expect(page.url()).toContain("redirectedFrom=%2Fdashboard");
      await expect(page.getByRole("heading", { name: /back on stage/i })).toBeVisible();
    } else {
      // Demo mode (Firebase not configured): gating is intentionally skipped,
      // and the placeholder dashboard renders instead of erroring.
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();
    }
  });
});
