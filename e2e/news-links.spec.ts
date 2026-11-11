import { expect, test } from "@playwright/test";

const WEEK = "2026-W44";

test("the site points to the news: nav, home, footer, sitemap, llms.txt", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "News and community" }).getByRole("link", { name: "News", exact: true })).toBeAttached();
  const section = page.locator("#news");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toContainText("Ratchet & Clank reaches 100% matched");
  await section.getByRole("link", { name: "Ratchet & Clank reaches 100% matched" }).click();
  await expect(page).toHaveURL(new RegExp(`/news/${WEEK}$`));
  await expect(page.getByRole("navigation", { name: "News and community" }).getByRole("link", { name: "News", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "News" })).toHaveAttribute("href", "/news");
  const sitemap = await request.get("/sitemap.xml").then((r) => r.text());
  expect(sitemap).toContain("/news<");
  expect(sitemap).toContain(`/news/${WEEK}<`);
  expect(sitemap).not.toContain("/news/2026-W43");
  expect(sitemap).not.toContain("/news/days/");
  expect(await request.get("/llms.txt").then((r) => r.text())).toContain("/news.xml");
});

test("the header still fits with News at its tightest widths", async ({ page }) => {
  for (const width of [821, 900, 1023, 1024]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(`/news/${WEEK}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `sideways scroll at ${width}`).toBeLessThanOrEqual(0);
    const overflow = await page.locator("header.site-header nav").evaluate((nav) => nav.scrollWidth - nav.clientWidth);
    expect(overflow, `nav overflow at ${width}`).toBeLessThanOrEqual(0);
    const bar = await page.locator("header.site-header").boundingBox();
    expect(bar!.height, `one line at ${width}`).toBeLessThanOrEqual(52);
  }
});
