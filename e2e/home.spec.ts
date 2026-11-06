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

test("the site search finds a game by a misspelt name, and a mod", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: /Search the site/ }).click();
  const box = page.getByRole("combobox");
  await box.fill("comando");
  await expect(page.getByRole("option").first()).toContainText("Going Commando");
  await box.fill("how do I install a mod");
  await expect(page.getByRole("option", { name: "Install from a link Guide" })).toBeVisible();
});
