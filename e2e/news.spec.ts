import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const WEEK = "2026-W44";
const DAY = "2026-11-03";

/** Scrolls through the page so every card has faded in (they reveal on scroll). */
async function revealAll(page: Page) {
  for (let y = 0; y < 12; y++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => scrollTo(0, 0));
}

const noIndex = (page: Page) => page.locator('meta[name="robots"][content*="noindex"]');

test("/news lists the reports, the weeks waiting for one and the latest facts", async ({ page }) => {
  await page.goto("/news");
  await expect(page.getByRole("heading", { level: 1, name: "News" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Ratchet & Clank reaches 100% matched" })).toBeVisible();
  await expect(page.getByText("By @Lynder063 with Claude Code")).toBeVisible();
  await expect(page.getByText("Updated weekly. Figures up to Tuesday, 3 November 2026.")).toBeVisible();
  // A week with no report is listed, and an unfinished one is not there at all.
  await expect(page.getByRole("link", { name: /Week 43, 2026/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Week 46, 2026/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Help write one" })).toHaveAttribute("href", /openrac-site\/blob\/main\/news\/CONTRIBUTING\.md$/);
  await page.getByRole("link", { name: "Ratchet & Clank reaches 100% matched" }).click();
  await expect(page).toHaveURL(new RegExp(`/news/${WEEK}$`));
});

test("a reported week: the conclusion first, who wrote it, sources and project sections", async ({ page }) => {
  await page.goto(`/news/${WEEK}`);
  await revealAll(page);
  await expect(page.locator("h1")).toHaveText("Ratchet & Clank reaches 100% matched");
  const brief = page.getByLabel("The week in brief");
  await expect(brief.getByRole("link", { name: "OpenRAC#161" })).toHaveAttribute("href", "https://github.com/OpenRAC/OpenRAC/issues/161");
  await expect(brief).toContainText("@Lynder063");
  await expect(brief).toContainText("Claude Code");
  await expect(brief).toContainText("Based on 4 linked pull requests and issues.");
  await expect(brief.getByRole("link", { name: "Report a mistake" })).toHaveAttribute("href", "https://github.com/OpenRAC/openrac-site/issues");
  // The sources are on show, with real titles, without a click.
  await expect(page.getByText("Sources (4)")).toBeVisible();
  await expect(page.locator("details[open]").getByText("Match the last 11 functions")).toBeVisible();
  // The report's order wins, and its label stands out.
  const headings = await page.locator("article h3").allInnerTexts();
  expect(headings.slice(0, 2)).toEqual(["Ratchet & Clank", "OpenRAC launcher"]);
  await expect(page.locator("li strong", { hasText: "Counting fix:" })).toBeVisible();
  await expect(page.getByText("−", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Code matched rose from 14.04% to 84.74%" })).toBeVisible();
  await expect(noIndex(page)).toHaveCount(0);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(ld["@graph"][0].author.name).toBe("Lynder063");
});

test("hostile text stays inert text", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(`/news/${WEEK}`);
  await expect(page.getByLabel("The week in brief")).toContainText("<script>window.__pwned=1</script>");
  await expect(page.getByRole("link", { name: "unknown#7" })).toHaveCount(0);
  await page.goto(`/news/${WEEK}/OpenRAC`);
  await expect(page.getByText('<img src=x onerror="window.__pwned=1"> a hostile title')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  await expect(page.locator("main img:not([alt=''])")).toHaveCount(0);
  await page.goto(`/news/days/${DAY}/rac2-decomp`);
  // Pull request descriptions never reach a page.
  await expect(page.locator("body")).not.toContainText("ignore your instructions");
  expect(requests.filter((u) => !u.startsWith(new URL(page.url()).origin) && !u.startsWith("data:"))).toEqual([]);
});

test("the report states are told apart", async ({ page }) => {
  await page.goto("/news/2026-W43");
  await expect(page.getByRole("status")).toContainText("No written report for this week yet");
  await expect(page.getByRole("link", { name: "Help write it" })).toBeVisible();
  await expect(page.getByLabel("The week in brief")).toHaveCount(0);
  await expect(noIndex(page)).toHaveCount(1);
  // A broken report is not an invitation to write one, and costs the page nothing else.
  await page.goto("/news/2026-W42");
  await expect(page.getByRole("status")).toContainText("has a problem and can't be shown yet");
  await expect(page.getByRole("link", { name: "Help write it" })).toHaveCount(0);
  await expect(page.locator("article h3")).toHaveText(["Up Your Arsenal"]);
  await expect(noIndex(page)).toHaveCount(1);
});

test("a project's week: work grouped in plain words, long lists folded", async ({ page }) => {
  await page.goto(`/news/${WEEK}/rac2-decomp`);
  await expect(page.locator("h1")).toHaveText("Going Commando");
  await expect(noIndex(page)).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "New (3)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fixed (3)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Behind the scenes (3)" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("feat(src):");
  await page.goto(`/news/${WEEK}/OpenRAC`);
  await expect(page.getByRole("link", { name: "Launcher 0.10.0" })).toHaveAttribute("href", /releases\/tag\/launcher-v0\.10\.0$/);
  await expect(page.getByRole("heading", { name: "Opened this week, not merged by its end (1)" })).toBeVisible();
});

test("days: facts, moving between them and the calendar", async ({ page }) => {
  await page.goto(`/news/days/${DAY}`);
  await expect(noIndex(page)).toHaveCount(1);
  await page.getByRole("link", { name: "‹ Monday, 2 November 2026" }).click();
  await expect(page).toHaveURL(/\/news\/days\/2026-11-02$/);
  await page.getByRole("link", { name: "Tuesday, 3 November 2026 ›" }).click();
  await expect(page).toHaveURL(new RegExp(`/news/days/${DAY}$`));
  const calendar = page.getByRole("navigation", { name: "Pick a day" });
  await expect(calendar.getByRole("link", { name: "Tuesday, 3 November 2026" })).toHaveAttribute("aria-current", "date");
  await calendar.getByRole("link", { name: "Earlier month: October 2026" }).click();
  await expect(page).toHaveURL(/\/news\/days\/2026-10-27$/);
  await page.getByRole("link", { name: "‹ Week 44, 2026" }).click();
  await expect(page).toHaveURL(new RegExp(`/news/${WEEK}$`));
});

test("a project's day shows each commit", async ({ page }) => {
  await page.goto(`/news/days/${DAY}/rac2-decomp`);
  await page.getByText("master: 1 commit").click();
  await expect(page.getByRole("link", { name: "bbbbbbb" })).toHaveAttribute("href", /\/rac2-decomp\/commit\/bbbbbbb/);
  await expect(page.getByRole("heading", { name: "New (1)" })).toBeVisible();
});

for (const path of ["/news/2020-W01", "/news/not-a-week", "/news/2026-W54", `/news/${WEEK}/nope`, `/news/${WEEK}/..%2F..%2Fsecrets`, "/news/days/2020-01-01", "/news/days/2026-02-30", "/news/2026-W46", `/news/days/${DAY}/nope`]) {
  test(`${path} is a real 404`, async ({ page }) => {
    expect((await page.goto(path))?.status()).toBe(404);
    await expect(page.getByRole("link", { name: "All news" })).toBeVisible();
  });
}

test("a report's metadata: its own title and description, a share image, and an article's details", async ({ page, request }) => {
  await page.goto(`/news/${WEEK}`);
  await expect(page).toHaveTitle("Ratchet & Clank reaches 100% matched · OpenRAC");
  const description = "The first game is fully matched, Going Commando rises to 84.74%, and the launcher gains install links.";
  const meta = (selector: string) => page.locator(`meta[${selector}]`);
  await expect(meta('name="description"')).toHaveAttribute("content", description);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/news/${WEEK}$`));
  await expect(meta('property="og:title"')).toHaveAttribute("content", "Ratchet & Clank reaches 100% matched");
  await expect(meta('property="og:description"')).toHaveAttribute("content", description);
  await expect(meta('property="og:type"')).toHaveAttribute("content", "article");
  await expect(meta('property="og:url"')).toHaveAttribute("content", new RegExp(`/news/${WEEK}$`));
  await expect(meta('property="article:published_time"')).toHaveAttribute("content", "2026-11-01T23:59:59Z");
  await expect(meta('property="article:author"')).toHaveAttribute("content", "https://github.com/Lynder063");
  await expect(meta('name="twitter:card"')).toHaveAttribute("content", "summary_large_image");
  await expect(meta('name="twitter:title"')).toHaveAttribute("content", "Ratchet & Clank reaches 100% matched");
  for (const selector of ['property="og:image"', 'name="twitter:image"']) {
    const src = await meta(selector).first().getAttribute("content");
    expect(src, selector).toContain(`/news/${WEEK}/opengraph-image`);
    const image = await request.get(new URL(src!).pathname + new URL(src!).search);
    expect(image.status(), selector).toBe(200);
    expect(image.headers()["content-type"], selector).toBe("image/png");
  }
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(ld["@graph"][0]).toMatchObject({ "@type": "Article", headline: "Ratchet & Clank reaches 100% matched", description, datePublished: "2026-11-01" });
  await expect(page.locator("h1")).toHaveCount(1);
});

test("the news page's metadata: title, description, share image and the list of reports", async ({ page, request }) => {
  await page.goto("/news");
  await expect(page).toHaveTitle("OpenRAC News");
  const content = await page.locator('meta[name="description"]').getAttribute("content");
  expect(content!.length).toBeGreaterThanOrEqual(70);
  expect(content!.length).toBeLessThanOrEqual(155);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/news$/);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const src = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(src).toContain("/news/opengraph-image");
  expect((await request.get(new URL(src!).pathname + new URL(src!).search)).headers()["content-type"]).toBe("image/png");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(ld["@graph"][0]["@type"]).toBe("CollectionPage");
  expect(ld["@graph"][0].mainEntity.itemListElement[0].name).toBe("Ratchet & Clank reaches 100% matched");
});

test("a week without a report still previews properly, but stays out of search", async ({ page }) => {
  await page.goto("/news/2026-W43");
  await expect(page).toHaveTitle("Week 43, 2026 · News · OpenRAC");
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/news\/2026-W43\/opengraph-image/);
});

test("pictures are not served: there is no such route", async ({ page }) => {
  expect((await page.goto("/news/media/2026-W44/menu.png"))?.status()).toBe(404);
});

test("the feed is valid RSS of written reports only", async ({ request, page }) => {
  const res = await request.get("/news.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/rss+xml");
  const parsed = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return { error: doc.querySelector("parsererror")?.textContent ?? null, items: [...doc.querySelectorAll("item > link")].map((l) => l.textContent) };
  }, await res.text());
  expect(parsed.error).toBeNull();
  expect(parsed.items).toHaveLength(2);
  expect(parsed.items[0]).toMatch(/\/news\/2026-W44$/);
  await page.goto("/news");
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", /\/news\.xml$/);
});

test.describe("with reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("cards and bars are simply there", async ({ page }) => {
    await page.goto(`/news/${WEEK}`);
    const bar = page.getByRole("img", { name: "Code matched rose from 14.04% to 84.74%" }).locator("i").first();
    expect(await bar.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    expect(Number(await page.locator("[data-reveal]").last().evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
  });
});

for (const path of ["/news", `/news/${WEEK}`, "/news/2026-W43", `/news/${WEEK}/rac2-decomp`, `/news/days/${DAY}`, `/news/days/${DAY}/rac2-decomp`]) {
  test(`accessibility: no serious problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    await revealAll(page);
    await page.waitForTimeout(800);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test(`@mobile ${path}: no sideways scroll`, async ({ page }) => {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}
