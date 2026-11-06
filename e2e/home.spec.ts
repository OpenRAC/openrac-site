import { expect, test } from "@playwright/test";

// The title screen's clips are served from /img; a policy that blocks media would leave it dark.
test("the page policy lets the home page play its own clips", async ({ request }) => {
  const csp = (await request.get("/")).headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/media-src[^;]*'self'/);
});

test("old links to the folded downloads go to /install", async ({ page }) => {
  await page.goto("/#download");
  await expect(page).toHaveURL(/\/install$/);
});
