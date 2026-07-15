// E2E smoke test for the public landing page — the entry point of every
// critical flow this suite covers.
import { test, expect } from "@playwright/test";

test.describe("landing page", () => {
  test("loads with the hero headline and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/LinkFlow/);
    await expect(page.getByRole("heading", { name: /your link is a stage/i })).toBeVisible();
  });

  test("nav links to login and signup", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /log in/i }).first()).toHaveAttribute(
      "href",
      "/login",
    );
    await expect(
      page.getByRole("link", { name: /claim your handle/i }).first(),
    ).toHaveAttribute("href", "/signup");
  });
});
