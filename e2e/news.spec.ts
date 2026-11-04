import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DAY = "2026-11-03";

test("/news goes to the latest day", async ({ page }) => {
  await page.goto("/news");
  await expect(page).toHaveURL(new RegExp(`/news/${DAY}$`));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("87.68%");
});

test("a reported day: summary, who wrote it, totals, projects and links", async ({ page }) => {
  await page.goto(`/news/${DAY}`);
  await expect(page.getByText("Written by")).toContainText("@Lynder063");
  await expect(page.getByText("Written by")).toContainText("Claude Code");
  await expect(page.getByRole("link", { name: "Report a mistake" })).toHaveAttribute("href", "https://github.com/OpenRAC/openrac-news/issues");
  await expect(page.getByRole("link", { name: "OpenRAC#249" })).toHaveAttribute("href", "https://github.com/OpenRAC/OpenRAC/issues/249");
  await expect(page.locator("dl")).toContainText("Commits landed");
  await expect(page.getByRole("link", { name: /Going Commando/ })).toContainText("87.68% matched");
  await expect(page.getByRole("link", { name: /Going Commando/ })).toContainText("+2.19 points");
  // A project where nothing happened has no card.
  await expect(page.getByRole("link", { name: /Up Your Arsenal/ })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
});

test("hostile text stays inert text", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(`/news/${DAY}`);
  await expect(page.getByLabel("The day in brief")).toContainText("<script>window.__pwned=1</script>");
  await expect(page.getByRole("link", { name: "unknown#7" })).toHaveCount(0);
  await page.goto(`/news/${DAY}/OpenRAC`);
  await expect(page.getByText('<img src=x onerror="window.__pwned=1"> a hostile title')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  await expect(page.locator("main img")).toHaveCount(0);
  // Pull request descriptions never reach a page.
  await expect(page.locator("body")).not.toContainText("ignore your instructions");
  expect(requests.filter((u) => !u.startsWith(new URL(page.url()).origin) && !u.startsWith("data:"))).toEqual([]);
});

test("a day with only facts invites a report and stays out of search", async ({ page }) => {
  await page.goto("/news/2026-11-02");
  await expect(page.getByRole("link", { name: "Help write it" })).toHaveAttribute("href", /openrac-news\/blob\/main\/CONTRIBUTING\.md$/);
  await expect(page.getByText("Written by")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
});

test("moving between days: next, previous and the calendar", async ({ page }) => {
  await page.goto(`/news/${DAY}`);
  await page.getByRole("link", { name: "‹ Monday, 2 November 2026" }).click();
  await expect(page).toHaveURL(/\/news\/2026-11-02$/);
  await page.getByRole("link", { name: "Tuesday, 3 November 2026 ›" }).click();
  await expect(page).toHaveURL(new RegExp(`/news/${DAY}$`));
  const calendar = page.getByRole("navigation", { name: "Pick a day" });
  await expect(calendar.getByRole("link", { name: "Tuesday, 3 November 2026, written report" })).toHaveAttribute("aria-current", "date");
  await calendar.getByRole("link", { name: "Earlier month: October 2026" }).click();
  await expect(page).toHaveURL(/\/news\/2026-10-31$/);
  await expect(page.getByText("Nothing landed on the tracked projects this day.")).toBeVisible();
});

test("a project's page: its report, progress and every item", async ({ page }) => {
  await page.goto(`/news/${DAY}/rac2-decomp`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Going Commando");
  await expect(page.getByLabel("This project's report")).toContainText("A batch of 145 functions");
  await expect(page.getByRole("link", { name: "#399" }).first()).toHaveAttribute("href", "https://github.com/OpenRAC/rac2-decomp/issues/399");
  await expect(page.getByText("+2.19 points")).toBeVisible();
  await page.getByText("master: 2 commits").click();
  await expect(page.getByRole("link", { name: "bbbbbbb" })).toHaveAttribute("href", /\/rac2-decomp\/commit\/bbbbbbb/);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
  await page.getByRole("link", { name: "OpenRAC launcher" }).click();
  await expect(page).toHaveURL(new RegExp(`/news/${DAY}/OpenRAC$`));
  await expect(page.getByRole("link", { name: "Launcher 0.11.0" })).toHaveAttribute("href", /releases\/tag\/launcher-v0\.11\.0$/);
});

for (const path of ["/news/2020-01-01", "/news/not-a-day", "/news/2026-02-30", `/news/${DAY}/nope`, `/news/${DAY}/..%2F..%2Fsecrets`]) {
  test(`${path} is a real 404`, async ({ page }) => {
    expect((await page.goto(path))?.status()).toBe(404);
  });
}

test("the feed is valid RSS of written reports only", async ({ request, page }) => {
  const res = await request.get("/news.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/rss+xml");
  const body = await res.text();
  const parsed = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return { error: doc.querySelector("parsererror")?.textContent ?? null, items: [...doc.querySelectorAll("item > link")].map((l) => l.textContent) };
  }, body);
  expect(parsed.error).toBeNull();
  expect(parsed.items).toHaveLength(1);
  expect(parsed.items[0]).toMatch(/\/news\/2026-11-03$/);
  await page.goto(`/news/${DAY}`);
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", /\/news\.xml$/);
});

for (const path of [`/news/${DAY}`, "/news/2026-11-02", `/news/${DAY}/rac2-decomp`]) {
  test(`accessibility: no serious problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });

  test(`@mobile ${path}: no sideways scroll`, async ({ page }) => {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}
