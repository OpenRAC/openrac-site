import { expect, test, type Page } from "@playwright/test";

/**
 * Whole visits to the mod list and mod pages, the usual ones and the strange ones: odd addresses, odd
 * input, broken storage, fast clicking, back and forward. Each fails on any script error on the page.
 */

const INTRO = "openrac.mods.intro-seen";
const PICKED = "openrac.mods.picked";

/** Fails the test on an uncaught error or an alert (an alert would mean injected script ran). */
function guard(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    errors.push(`dialog: ${d.message()}`);
    void d.dismiss();
  });
  return () => expect(errors, "errors on the page").toEqual([]);
}

/** The intro has been read in this browser, so it does not cover the list. */
async function introRead(page: Page) {
  await page.addInitScript((k) => localStorage.setItem(k, "1"), INTRO);
}

const status = (page: Page) => page.getByRole("status").filter({ hasText: /mods?$/ });
const rows = (page: Page) => page.locator("#results li");

/** A press before the page has hydrated does nothing, so the first one is retried. */
async function untilHydrated(page: Page, act: () => Promise<void>, done: () => Promise<void>) {
  await expect(async () => {
    await act();
    await done();
  }).toPass();
}

test("first visit: the intro shows once, Esc keeps it away, ? brings it back", async ({ page }) => {
  const ok = guard(page);
  await page.goto("/mods");
  const intro = page.getByRole("dialog", { name: "Before you install mods" });
  await expect(intro).toBeVisible();
  await expect(intro.locator("span[title]", { hasText: "Not checked" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(intro).toBeHidden();

  await page.reload();
  await expect(status(page)).toHaveText("9 mods");
  await expect(intro).toBeHidden();

  await page.getByRole("button", { name: /what the labels mean|\?/i }).first().click();
  await expect(intro).toBeVisible();
  await intro.getByRole("button", { name: "I understand" }).click();
  await expect(intro).toBeHidden();
  ok();
});

test("first visit: Show only checked mods turns the filter on and stays in the address", async ({ page }) => {
  const ok = guard(page);
  await page.goto("/mods?dev=1");
  const intro = page.getByRole("dialog", { name: "Before you install mods" });
  await untilHydrated(
    page,
    () => intro.getByRole("button", { name: "Show only checked mods" }).click(),
    () => expect(intro).toBeHidden({ timeout: 1000 }),
  );
  await expect(page).toHaveURL(/trust=/);
  await expect(page).toHaveURL(/dev=1/);
  await expect(page.getByRole("checkbox", { name: "Not checked" })).not.toBeChecked();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Not checked" })).not.toBeChecked();
  await expect(intro).toBeHidden();
  ok();
});

test("strange addresses fall back to the plain list, never an error page", async ({ page }) => {
  const ok = guard(page);
  await introRead(page);
  for (const q of [
    "?game=zzz&cat=%3Cscript%3Ealert(1)%3C%2Fscript%3E&sort=bogus&disc=xx,,yy&trust=foo,bar",
    "?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
    "?game=&cat=&sort=&q=&trust=&disc=&dev=",
    "?cat=camera&cat=controls&sort=name&sort=downloads",
    `?q=${"a".repeat(3000)}`,
    "?trust=none",
    "?checked=1&trust=unchecked",
    "?q=%F0%9F%9A%80%20%D7%A9%D7%9C%D7%95%D7%9D",
    "?m=%E0%A4%A",
  ]) {
    const res = await page.goto(`/mods${q}`);
    expect(res?.status(), q).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }), q).toHaveText("Ratchet & Clank mods");
    await expect(status(page), q).toHaveText(/^\d+ mods?$/);
  }
  // Every label off: nothing matches, and Clear filters brings the list back.
  await page.goto("/mods?trust=none");
  await expect(status(page)).toHaveText("0 mods");
  await untilHydrated(
    page,
    () => page.getByRole("button", { name: "Clear filters" }).first().click(),
    () => expect(status(page)).toHaveText("9 mods", { timeout: 1000 }),
  );
  await expect(page).not.toHaveURL(/trust=/);
  ok();
});

test("search: odd input never breaks the list, a typo gets a suggestion", async ({ page }) => {
  const ok = guard(page);
  await introRead(page);
  await page.goto("/mods");
  const box = page.getByRole("searchbox", { name: "Search mods" });
  await expect(status(page)).toHaveText("9 mods");
  for (const text of ["(([", "\\", ".*", "<b>x</b>", "🚀🚀🚀", "שלום", "   ", "a".repeat(2000), "%00", "' OR 1=1 --"]) {
    await box.fill(text);
    await expect(status(page), text).toHaveText(/^\d+ mods?$/);
  }
  await box.fill("lokc strafe");
  await expect(page).toHaveURL(/q=lokc/);
  const first = rows(page).first();
  if (await first.isVisible()) await expect(first).toContainText("Lock-strafe");
  else await page.getByRole("button", { name: "Lock-strafe" }).click();

  // Typing then clearing at once: the address ends without the search, the full list is back.
  await box.fill("camera");
  await box.fill("");
  await expect(page).not.toHaveURL(/q=/);
  await expect(status(page)).toHaveText("9 mods");
  // "/" jumps to the search box from anywhere but a field.
  await page.locator("h1").click();
  await page.keyboard.press("/");
  await expect(box).toBeFocused();
  ok();
});

test("fast clicking through filters ends where the last click says", async ({ page }) => {
  const ok = guard(page);
  await introRead(page);
  await page.goto("/mods");
  await untilHydrated(
    page,
    () => page.getByRole("button", { name: /^camera/i }).click(),
    () => expect(page).toHaveURL(/cat=camera/, { timeout: 1000 }),
  );
  const cats = ["controls", "camera", "gameplay", "randomizer", "camera", "controls"];
  for (let i = 0; i < 4; i++) for (const c of cats) await page.getByRole("button", { name: new RegExp(`^${c}`, "i") }).click({ delay: 0 });
  await expect(page).toHaveURL(/cat=controls/);
  await expect(page.getByRole("button", { name: /^controls/i })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => Number((await status(page).textContent())!.split(" ")[0]) - (await rows(page).count())).toBe(0);

  for (let i = 0; i < 7; i++) await page.getByRole("checkbox", { name: "Trusted authors" }).click();
  for (let i = 0; i < 6; i++) await page.getByRole("checkbox", { name: "PAL" }).click();
  await expect(page.getByRole("checkbox", { name: "Trusted authors" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "PAL" })).not.toBeChecked();
  await expect.poll(async () => Number((await status(page).textContent())!.split(" ")[0]) - (await rows(page).count())).toBe(0);
  ok();
});

test("back and forward: filters come back with the list, a mod page in between", async ({ page }) => {
  const ok = guard(page);
  await introRead(page);
  await page.goto("/mods");
  await untilHydrated(
    page,
    async () => {
      await page.getByLabel("Sort").selectOption("name");
    },
    () => expect(page).toHaveURL(/sort=name/, { timeout: 1000 }),
  );
  await page.getByRole("button", { name: /^camera/i }).click();
  await expect(page).toHaveURL(/cat=camera/);
  await rows(page).first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/mods\/camera-/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Camera/);
  await page.goBack();
  await expect(page).toHaveURL(/cat=camera/);
  await expect(page).toHaveURL(/sort=name/);
  await expect(page.getByRole("button", { name: /^camera/i })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Sort")).toHaveValue("name");
  await page.goForward();
  await expect(page).toHaveURL(/\/mods\/camera-/);
  ok();
});

test("a set: pick on the list and on a mod page, keep it over reloads, share it, clear it", async ({ page }) => {
  const ok = guard(page);
  await introRead(page);
  await page.goto("/mods?dev=1");
  await untilHydrated(
    page,
    () => page.getByRole("checkbox", { name: "Add Xbox icons to the set" }).check(),
    () => expect(page.getByText(/1\s*mods? picked/)).toBeVisible({ timeout: 1000 }),
  );
  await page.getByRole("checkbox", { name: "Add Camera base to the set" }).check();
  await expect(page.getByText(/2\s*mods? picked/)).toBeVisible();

  // Picks hidden by a filter stay picked.
  await page.getByRole("button", { name: /^controls/i }).click();
  await expect(page.getByText(/2\s*mods? picked/)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/2\s*mods? picked/)).toBeVisible();

  await page.goto("/mods/ammo-max");
  await page.getByRole("button", { name: /Add to set/i }).first().click();
  await page.goto("/mods?dev=1");
  await expect(page.getByText(/3\s*mods? picked/)).toBeVisible();

  // Without clipboard access the share link opens the set page itself.
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("no")) } }));
  await page.getByRole("button", { name: /^Share/ }).click();
  await expect(page).toHaveURL(/\/mods\/set\?m=.*xbox-icons@/);
  await expect(page).toHaveURL(/camera-base@/);
  await expect(page).toHaveURL(/ammo-max@/);
  await expect(page.locator("main")).toContainText("Xbox icons");

  await page.goto("/mods?dev=1");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByText(/mods? picked/)).toBeHidden();
  await page.reload();
  await expect(page.getByText(/mods? picked/)).toBeHidden();
  ok();
});

test("broken or blocked storage: the list and picking still work for the visit", async ({ page }) => {
  const ok = guard(page);
  await page.addInitScript(() => {
    const no = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Storage.prototype.getItem = no;
    Storage.prototype.setItem = no;
  });
  await page.goto("/mods?dev=1");
  const intro = page.getByRole("dialog", { name: "Before you install mods" });
  await untilHydrated(
    page,
    () => intro.getByRole("button", { name: "I understand" }).click(),
    () => expect(intro).toBeHidden({ timeout: 1000 }),
  );
  await page.getByRole("checkbox", { name: "Add Lock-strafe to the set" }).check();
  await expect(page.getByText(/1\s*mods? picked/)).toBeVisible();
  ok();
});

test("garbage in storage is ignored", async ({ page }) => {
  const ok = guard(page);
  await page.addInitScript(
    ([intro, picked]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(intro, "1");
      localStorage.setItem(picked, '{"not":"a list"');
    },
    [INTRO, PICKED],
  );
  await page.goto("/mods");
  await expect(status(page)).toHaveText("9 mods");
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify(["no-such-mod", 42, null, "xbox-icons"])), PICKED);
  await page.reload();
  await expect(page.getByText(/1\s*mods? picked/)).toBeVisible();
  ok();
});

test("mod addresses that are not mods are a 404, never a server error", async ({ page }) => {
  for (const id of ["%3Cscript%3E", "a".repeat(300), "LOCK-STRAFE", "lock-strafe%00", "..%2Fpackage.json", "%E0%A4%A"]) {
    const res = await page.goto(`/mods/${id}`);
    expect(res?.status(), id).toBe(404);
  }
  expect((await page.goto("/mods/lock-strafe?x=%3Cscript%3E#safety"))?.status()).toBe(200);
  await expect(page.locator("#safety")).toBeVisible();
});

test("keyboard only: search, open a mod, pick it, go back", async ({ page }) => {
  const ok = guard(page);
  await introRead(page);
  await page.goto("/mods");
  await expect(status(page)).toHaveText("9 mods");
  await untilHydrated(
    page,
    async () => {
      await page.locator("h1").click();
      await page.keyboard.press("/");
    },
    () => expect(page.getByRole("searchbox", { name: "Search mods" })).toBeFocused({ timeout: 1000 }),
  );
  await page.keyboard.type("xbox");
  await expect(page).toHaveURL(/q=xbox/);
  const link = rows(page).first().getByRole("link", { name: /Xbox icons/ });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/mods\/xbox-icons/);
  await page.goBack();
  const tick = page.getByRole("checkbox", { name: "Add Xbox icons to the set" });
  await tick.focus();
  await page.keyboard.press("Space");
  await expect(tick).toBeChecked();
  ok();
});

test("@mobile a phone visit: filters fold open, pick, the bar fits, no sideways scroll", async ({ page }) => {
  const ok = guard(page);
  await introRead(page);
  await page.goto("/mods?dev=1");
  const filters = page.locator("details.d-card").first();
  await untilHydrated(
    page,
    () => filters.locator("summary").click(),
    () => expect(filters).toHaveAttribute("open", "", { timeout: 1000 }),
  );
  await filters.getByRole("button", { name: /^camera/i }).click();
  await expect(page).toHaveURL(/cat=camera/);
  await page.getByRole("checkbox", { name: "Add Camera base to the set" }).check();
  await expect(page.getByRole("button", { name: /Install/ }).last()).toBeVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(wide).toBeLessThanOrEqual(0);
  await page.goto("/mods/camera-base");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  ok();
});

test("two tabs: a pick in one shows in the other", async ({ context }) => {
  await context.addInitScript((k) => localStorage.setItem(k, "1"), INTRO);
  const a = await context.newPage();
  const b = await context.newPage();
  const okA = guard(a);
  const okB = guard(b);
  await a.goto("/mods?dev=1");
  await b.goto("/mods/lock-strafe");
  await untilHydrated(
    a,
    () => a.getByRole("checkbox", { name: "Add Lock-strafe to the set" }).check(),
    () => expect(a.getByText(/1\s*mods? picked/)).toBeVisible({ timeout: 1000 }),
  );
  await expect(b.getByRole("button", { name: /In your set/ }).first()).toBeVisible();
  await b.getByRole("button", { name: /In your set/ }).first().click();
  await expect(a.getByText(/mods? picked/)).toBeHidden();
  okA();
  okB();
});

test("the window shrinks to a phone and grows back mid-visit", async ({ page }) => {
  const ok = guard(page);
  await introRead(page);
  await page.goto("/mods?cat=camera");
  await expect(status(page)).toHaveText(/^\d+ mods$/);
  for (const [w, h] of [[360, 740], [820, 1180], [1440, 900], [320, 568], [1280, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${w}px`).toBeLessThanOrEqual(0);
  }
  await expect(page).toHaveURL(/cat=camera/);
  ok();
});
