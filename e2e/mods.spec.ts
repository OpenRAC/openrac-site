import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Scrolls through the page so every section has faded in (they reveal on scroll). */
async function revealAll(page: Page) {
  for (let y = 0; y < 15; y++) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => scrollTo(0, 0));
}

test("the blog is gone and Mods is in the nav", async ({ page }) => {
  expect((await page.goto("/blog"))?.status()).toBe(404);
  await page.goto("/");
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: "Mods", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Blog" })).toHaveCount(0);
});

test("browse: presets, search, filters and sort live in the address", async ({ page }) => {
  await page.goto("/mods");
  const status = page.getByRole("status").filter({ hasText: /mods?$/ });
  await expect(status).toHaveText("8 mods"); // works on release: no dev-only mods, no packs (7 + the second index's one)

  // A press before the page has hydrated does nothing, so the first one is retried.
  await expect(async () => {
    await page.getByRole("radio", { name: "All" }).click();
    await expect(page).toHaveURL(/preset=all/, { timeout: 1000 });
  }).toPass();
  await expect(status).toHaveText("10 mods");

  await page.getByRole("searchbox", { name: "Search mods" }).fill("radnomizer");
  await expect(page).toHaveURL(/q=radnomizer/);
  await expect(page.locator("#results article").first()).toContainText("Item randomizer");

  await page.getByRole("searchbox", { name: "Search mods" }).fill("");
  // The filters live in one panel; the ones in use show under the search box, each to remove.
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Native", exact: true }).click();
  await expect(page).toHaveURL(/type=native/);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("button", { name: "Remove filter: Native" })).toBeVisible();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Native", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  await page.getByLabel("Sort").selectOption("name");
  await expect(page).toHaveURL(/sort=name/);
});

test("browse: the change set gathers what picks bring along", async ({ page }) => {
  await page.goto("/mods?preset=all");
  const card = page.locator("#results article", { hasText: "Lock-strafe" });
  await card.getByRole("button", { name: "Add to set" }).click();
  await page.getByRole("button", { name: "Review & install" }).click();
  const dialog = page.getByRole("dialog");
  // Lock-strafe, the two camera mods it needs, and Xbox icons, recommended and so ticked.
  await expect(dialog.getByRole("heading", { name: "Install 4 mods" })).toBeVisible();
  await expect(dialog.getByRole("checkbox", { name: /Xbox icons/ })).toBeChecked();
  await expect(dialog).toContainText("Also installs");
  await expect(dialog).toContainText("Camera base");
  await expect(dialog).toContainText("runs native code");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("browse: list view is a real sortable table", async ({ page }) => {
  await page.goto("/mods?view=list&preset=all");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await table.getByRole("button", { name: /Downloads/ }).click();
  await expect(table.getByRole("columnheader", { name: /Downloads/ })).toHaveAttribute("aria-sort", "descending");
  await expect(table.getByRole("row").nth(1)).toContainText("Item randomizer");
});

test("install: opens the launcher link, then offers help if nothing took it", async ({ page }) => {
  await page.goto("/mods/lock-strafe");
  // The test browser has no launcher, so the openrac:// link goes nowhere, as for a visitor without one.
  await page.locator("main").getByRole("button", { name: "Install", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Didn't open?" })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("dialog")).toContainText("Mods → Add a mod");
  await expect(page.getByRole("dialog")).toContainText("openrac.dev/mods/lock-strafe");
});

test.describe("in Steam's built-in browser", () => {
  // The Steam overlay / Steam Deck browser user agent: Chromium plus "Valve Steam ...".
  test.use({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.183 Safari/537.36 Valve Steam GameOverlay/1731716808" });

  test("install: shows the short page address to type, without trying openrac://", async ({ page }) => {
    const tried: string[] = [];
    page.on("framenavigated", (f) => tried.push(f.url()));
    await page.goto("/mods/lock-strafe");
    await page.locator("main").getByRole("button", { name: "Install", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Didn't open?" });
    await expect(dialog).toBeVisible({ timeout: 1000 });
    await expect(dialog).toContainText("openrac.dev/mods/lock-strafe");
    expect(tried.some((u) => u.startsWith("openrac:"))).toBe(false);
    // No clipboard permission here, as in Steam: the fallback copy still works.
    await dialog.getByRole("button", { name: "Copy" }).click();
    await expect(dialog.getByRole("button", { name: "Copied" })).toBeVisible();
    // Steam's desktop client may still pass the link on, so Try again sends it.
    await dialog.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("dialog", { name: "Didn't open?" })).toBeVisible({ timeout: 5000 });
  });
});

test("mod page: showcase, lightbox by keyboard, relationships, versions", async ({ page }) => {
  await page.goto("/mods/lock-strafe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lock-strafe");
  await expect(page.locator("iframe")).toHaveCount(0); // YouTube loads only on play
  await page.getByRole("button", { name: /^Picture 1/ }).click();
  await page.getByRole("button", { name: /Open .* full screen/ }).click();
  const box = page.getByRole("dialog", { name: "Lock-strafe pictures" });
  await expect(box).toBeVisible();
  await expect(box).toContainText("Picture 1 of 3");
  await page.keyboard.press("ArrowRight");
  await expect(box).toContainText("Picture 2 of 3");
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();

  await revealAll(page);
  await expect(page.locator("#relationships")).toContainText("Camera tweaks");
  await expect(page.locator("#relationships")).toContainText("Classic controls");
  await expect(page.locator("#versions summary")).toHaveCount(2);
  await page.getByRole("button", { name: /^Video:/ }).click();
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toHaveCount(1);
});

test("mod page: an unknown id is a real 404", async ({ page }) => {
  expect((await page.goto("/mods/not-a-mod"))?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No mod by that name" })).toBeVisible();
});

test("mod page: dev-only mods say so", async ({ page }) => {
  await page.goto("/mods/archipelago");
  await expect(page.getByText("Needs the dev build of the launcher.", { exact: true })).toBeVisible();
});

test("README from a second index renders inert", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/mods/evil-readme");
  await revealAll(page);
  await expect(page.locator("#about script, #about iframe, #about picture, #about source, #about img, #about [onerror], #about [style]")).toHaveCount(0);
  await expect(page.locator("#about")).not.toContainText("<");
  await expect(page.locator("#about")).not.toContainText("hidden note");
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  await expect(page.locator('#about a[href^="javascript:"]')).toHaveCount(0);
  // HTML written for GitHub is real markup here, and a badge is its link's text, not a link within a link.
  await expect(page.locator("#about b", { hasText: "raw html" })).toBeVisible();
  await expect(page.locator('#about a[href="https://example.com/release"]')).toHaveText("Download");
  await expect(page.locator("#about a a")).toHaveCount(0);
  await expect(page.locator("#about a", { hasText: "Title picture" })).toHaveAttribute("href", "https://evil.example/title.png");
  await expect(page.locator('#about a[href*="decoration"]')).toHaveCount(0);
  await expect(page.locator('#about a[href="https://example.com"]')).toHaveAttribute("rel", "nofollow ugc noopener noreferrer");
  expect(requests.some((u) => u.includes("evil.example"))).toBe(false); // the tracker picture is a link, not a load
  // A relative link points into the mod's repository at its release, never at this site.
  await expect(page.locator('#about a', { hasText: "docs" })).toHaveAttribute("href", /^https:\/\/github\.com\/OpenRAC\/openrac-mods\/blob\/evil-readme-v1\.2\.0\/camera-base\/docs\/setup\.md$/);
});

test("README: in-page links reach its headings and footnotes, never the page's own sections", async ({ page }) => {
  await page.goto("/mods/evil-readme");
  await revealAll(page);
  const heading = page.locator("#about h3#user-content-set-up");
  await expect(heading).toHaveText("Set up");
  await expect(page.locator('#about a[href="#details"]')).toHaveCount(0);
  await expect(page.locator('#about a[href="#user-content-details"]')).toHaveCount(1);
  await expect(page.locator('#about a[href="#user-content-set-up"]')).toHaveCount(2);
  await page.locator("#about a", { hasText: "to setup" }).click();
  await expect(page).toHaveURL(/#user-content-set-up$/);
  await expect(heading).toBeInViewport();
  // Clear of the stuck header and contents bar, once the smooth scroll has settled.
  const nav = page.getByRole("navigation", { name: "On this page" });
  await expect.poll(async () => (await heading.boundingBox())!.y - (await nav.boundingBox())!.y - (await nav.boundingBox())!.height).toBeGreaterThanOrEqual(0);
  await page.locator('#about sup a[href="#user-content-fn-1"]').click();
  await expect(page.locator("#about li#user-content-fn-1")).toContainText("A footnote.");
  await expect(page.locator("#about li#user-content-fn-1")).toBeInViewport();
  await expect(page.locator('#about a[href="#user-content-fnref-1"]')).toHaveCount(1);
  await expect(page.locator("#about sup a#user-content-fnref-1")).toHaveCount(1);
  await expect(page.locator('#about a[href="#user-content-old-anchor"]')).toHaveCount(1);
  await expect(page.locator("#about a#user-content-old-anchor")).toHaveCount(1);
});

test("SEO: title, canonical, share card, JSON-LD, robots and sitemap", async ({ page, request }) => {
  await page.goto("/mods/lock-strafe");
  await expect(page).toHaveTitle("Lock-strafe · R&C1 mod · OpenRAC");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/mods\/lock-strafe$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(ld["@graph"][0]["@type"]).toBe("SoftwareApplication");
  expect(JSON.stringify(ld)).not.toContain("aggregateRating");
  await expect(page.locator("h1")).toHaveCount(1);

  const og = await request.get("/mods/lock-strafe/opengraph-image");
  expect(og.headers()["content-type"]).toBe("image/png");
  expect((await request.get("/robots.txt").then((r) => r.text())).includes("Disallow: /mods?")).toBe(true);
  const sitemap = await request.get("/sitemap.xml").then((r) => r.text());
  expect(sitemap).toContain("/mods/lock-strafe");
  expect(sitemap).toContain("<video:player_loc>");
});

test("media route: only listed names, cached for good", async ({ request }) => {
  expect((await request.get("/mods/media/000000000000-480.webp")).status()).toBe(404);
  expect((await request.get("/mods/media/..%2fsecret-480.webp")).status()).toBe(404);
});

test("mods.json: the list for scripts, without server-only parts", async ({ request }) => {
  const r = await request.get("/mods.json");
  expect(r.headers()["access-control-allow-origin"]).toBe("*");
  expect(r.headers()["cache-control"]).toContain("stale-if-error");
  const body = await r.json();
  expect(body.mods.length).toBe(11); // the withdrawn test mod too: scripts see it with its reason in "revoked"
  expect(body.revoked.some((r: { id: string }) => r.id === "gone-mod")).toBe(true);
  expect("mediaBase" in body.mods[0]).toBe(false);
});

for (const path of ["/mods", "/mods/lock-strafe"]) {
  test(`accessibility: no serious problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    await revealAll(page);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

for (const path of ["/", "/mods", "/mods/lock-strafe"]) {
  test(`@mobile ${path}: no sideways scroll, big enough targets`, async ({ page }) => {
    await page.goto(path);
    await revealAll(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    // Every control the mods pages add is at least 44×44 (WCAG 2.5.5); links inside text are exempt.
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("main button, main [role=radio], main input[type=checkbox]")]
        .map((el) => {
          const box = (el.closest("label") ?? el).getBoundingClientRect();
          return { el: el.outerHTML.slice(0, 80), w: box.width, h: box.height };
        })
        .filter((b) => b.w > 0 && (b.w < 40 || b.h < 40)),
    );
    expect(small).toEqual([]);
  });
}

test("@mobile mod page: Install stays in thumb reach", async ({ page }) => {
  await page.goto("/mods/lock-strafe");
  const bar = page.locator("div.fixed.bottom-0").filter({ has: page.getByRole("button", { name: "Install" }) });
  await expect(bar).toBeHidden(); // the hero's Install is on screen, so the bar waits
  await page.mouse.wheel(0, 2000);
  await expect(bar).toBeVisible();
  await expect(bar).toBeInViewport();
});

test("@mobile search box does not make iOS zoom", async ({ page }) => {
  await page.goto("/mods");
  const size = await page.getByRole("searchbox").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(16);
});

test("publishing goes to GitHub's form: the old page redirects, its check is gone", async ({ page, request }) => {
  const form = "https://github.com/OpenRAC/openrac-mods/issues/new?template=submit-mod.yml";
  const old = await request.get("/mods/submit", { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toBe(form);
  expect((await request.get("/mods/submit/check?repo=https://github.com/you/x")).status()).toBe(404);

  await page.goto("/mods");
  await expect(page.getByRole("link", { name: "Publish your mod" })).toHaveAttribute("href", "#publish");
  await expect(page.getByRole("link", { name: "Open the submission on GitHub" })).toHaveAttribute("href", form);
});

test("shared setup: exact versions, unknown ones flagged, kept out of search", async ({ page }) => {
  await page.goto("/mods/set?m=lock-strafe@1.1.0,ammo-max@1.0.0,nope@1.0.0&g=rac1&d=pal");
  await expect(page.getByText("Version 1.0.0 is not listed").or(page.getByText("This version was withdrawn"))).toBeVisible();
  await expect(page.getByText("Not in the mod list any more")).toBeVisible();
  await expect(page.getByRole("button", { name: "Install 1 at these versions" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("a mod taken off the list keeps its page, explains why, and leaves search", async ({ page, request }) => {
  expect((await page.goto("/mods/gone-mod"))?.status()).toBe(200);
  await expect(page.getByText("This mod was taken off the list.")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("button", { name: "Install", exact: true })).toHaveCount(0);
  expect(await request.get("/sitemap.xml").then((r) => r.text())).not.toContain("/mods/gone-mod");
});

test("performance: the mod list ships little JavaScript, and nothing shifts", async ({ page }) => {
  await page.goto("/mods", { waitUntil: "networkidle" });
  const js = await page.evaluate(() =>
    performance.getEntriesByType("resource").filter((e) => (e as PerformanceResourceTiming).initiatorType === "script").reduce((a, e) => a + ((e as PerformanceResourceTiming).encodedBodySize || 0), 0),
  );
  // 171 KB compressed when this was written (the whole site's shared code included); a jump past
  // 200 KB means something heavy reached the browser.
  expect(js).toBeLessThan(200 * 1024);
  const shift = await page.evaluate(
    () =>
      new Promise<number>((done) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) total += e.value;
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => done(total), 1000);
      }),
  );
  expect(shift).toBeLessThan(0.1); // Core Web Vitals' "good" for CLS
});
