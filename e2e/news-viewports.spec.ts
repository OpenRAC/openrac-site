import { expect, test } from "@playwright/test";

/**
 * The news at every size that matters: a sweep of widths, each breakpoint and its neighbours, real
 * devices, landscape phones (short and wide) and very large screens. 320 px also stands for a 1280 px
 * screen at 400% zoom (WCAG 1.4.10). Pages are resized rather than reloaded, so a run stays quick.
 * /news/2026-W41 is a report made of the longest unbroken text the checks allow.
 */
const SWEEP = Array.from({ length: (1100 - 240) / 20 + 1 }, (_, i) => 240 + i * 20);
const SIZES: [number, number][] = [
  ...SWEEP.map((w): [number, number] => [w, 800]),
  // Either side of the site's breakpoints.
  ...[359, 360, 399, 400, 639, 640, 767, 768, 820, 821, 822, 900, 901, 1023, 1024, 1279, 1280].map((w): [number, number] => [w, 800]),
  // Phones, a folded phone and tablets.
  [280, 653], [320, 568], [344, 882], [360, 640], [375, 667], [390, 844], [393, 852], [412, 915], [430, 932], [540, 720], [768, 1024], [820, 1180], [912, 1368],
  // The same on their sides: very little height.
  [568, 320], [640, 360], [667, 375], [844, 390], [915, 412], [932, 430], [1024, 600],
  // Laptops and desktops, to 5K and an ultrawide.
  [1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080], [2560, 1440], [3440, 1440], [3840, 2160], [5120, 2880],
];

function problems(scope: string): string[] {
  const vw = document.documentElement.clientWidth;
  const out: string[] = [];
  const over = document.documentElement.scrollWidth - vw;
  if (over > 0) out.push(`page scrolls sideways by ${over}px`);
  const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 24)}"`;
  const clippedAbove = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== "visible") return true;
    return false;
  };
  for (const el of document.querySelectorAll(`${scope} *`)) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.right > vw + 1 || r.left < -1) && !clippedAbove(el)) out.push(`past the edge: ${name(el)}`);
  }
  // A hidden overflow must not be hiding words.
  for (const el of document.querySelectorAll(`${scope} h1, ${scope} h2, ${scope} h3, ${scope} h4, ${scope} p, ${scope} li, ${scope} figcaption`)) {
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline") out.push(`text wider than its box: ${name(el)}`);
  }
  const bar = document.querySelector("header.bar-stripes")!.getBoundingClientRect();
  if (bar.height > 52) out.push(`header wrapped to ${Math.round(bar.height)}px`);
  // WCAG 2.5.8: a control on its own is at least 24 px each way. Links in a line of text are exempt.
  for (const el of document.querySelectorAll(`${scope} a, ${scope} button, ${scope} summary`)) {
    const r = el.getBoundingClientRect();
    const inText = !!el.closest("p, li, figcaption, h1, h2, h3") && getComputedStyle(el).display === "inline";
    if (r.width && !inText && (r.width < 24 || r.height < 24)) out.push(`small target ${Math.round(r.width)}x${Math.round(r.height)}: ${name(el)}`);
  }
  return out;
}

const PAGES = ["/news", "/news/2026-W44", "/news/2026-W41", "/news/2026-W43", "/news/2026-W42", "/news/2026-W44/rac2-decomp", "/news/2026-W41/rac3-decomp", "/news/days/2026-11-03", "/news/days/2026-11-03/rac2-decomp"];

for (const path of PAGES) {
  test(`${path} holds together at ${SIZES.length} viewport sizes`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    // Open everything that folds, so its content is measured too.
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    const found = new Map<string, string>();
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      for (const p of await page.evaluate(problems, "main")) if (!found.has(p)) found.set(p, `${width}x${height}`);
    }
    expect([...found].map(([p, size]) => `${size}: ${p}`)).toEqual([]);
  });
}

test("the calendar stays usable on a short, wide screen", async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await page.goto("/news/days/2026-11-03");
  const calendar = page.getByRole("navigation", { name: "Pick a day" });
  await calendar.scrollIntoViewIfNeeded();
  await calendar.getByRole("link", { name: "Monday, 2 November 2026" }).click();
  await expect(page).toHaveURL(/\/news\/days\/2026-11-02$/);
});
