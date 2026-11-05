import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// The releases the build read (mod-docs/data/index.json): the tests follow the data, not a fixed version.
const index = JSON.parse(readFileSync("mod-docs/data/index.json", "utf8")) as { latest: string; versions: { version: string }[] };
const LATEST = index.latest;
const OLDEST = index.versions[index.versions.length - 1].version;

test("the docs open on the latest release, and the version menu moves to the same page of another", async ({ page }) => {
  await page.goto("/mods/docs/reference/c-api");
  await expect(page.locator("h1")).toHaveText("The C interface");
  await expect(page.getByText(`Reference · SDK ${LATEST}`)).toBeVisible();
  await page.getByLabel("SDK version").first().selectOption(OLDEST);
  await expect(page).toHaveURL(new RegExp(`/mods/docs/${OLDEST.replace(/\./g, "\\.")}/reference/c-api$`));
  await expect(page.getByText(`You are reading the docs of SDK ${OLDEST}, an older release.`)).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
  await page.getByRole("link", { name: `See the latest (${LATEST})` }).click();
  await expect(page).toHaveURL(/\/mods\/docs\/reference\/c-api$/);
});

test("a guide's links lead to this site's pages, and its code can be copied", async ({ page }) => {
  await page.goto("/mods/docs/getting-started");
  await expect(page.locator("main").getByRole("link", { name: "the manifest" }).first()).toHaveAttribute("href", "/mods/docs/manifest");
  await expect(page.locator("main pre").first()).toBeVisible();
  await expect(page.locator("main").getByRole("button", { name: "Copy" }).first()).toBeVisible();
});

test("search finds a call of the table and goes to it", async ({ page }) => {
  await page.goto("/mods/docs");
  const box = page.getByPlaceholder("hook, setting_int, on_pad, rac1.player...");
  // The key only works once the page has hydrated; press it until the search opens.
  await expect(async () => {
    await page.keyboard.press("/");
    await expect(box).toBeVisible({ timeout: 1000 });
  }).toPass();
  await box.fill("setting_int");
  await expect(page.getByRole("listbox").getByRole("option").first()).toContainText("api->setting_int");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/mods\/docs\/reference\/c-api#openrac_api\.setting_int$/);
  await expect(page.locator('[id="openrac_api.setting_int"]')).toBeAttached();
});

test("the hook explorer writes a mod for the hook point picked", async ({ page }) => {
  await page.goto("/mods/docs/reference/hooks-rac1#rac1.player.set_planar_velocity");
  const detail = page.locator("#hook-detail");
  await expect(detail.locator("h3")).toHaveText("rac1.player.set_planar_velocity");
  await expect(detail.locator("pre")).toContainText('openrac.hook("rac1.player.set_planar_velocity", function(original, angle)');
  await detail.getByRole("radio", { name: "After" }).click();
  await expect(detail.locator("pre")).toContainText('openrac.after("rac1.player.set_planar_velocity"');
  await detail.getByRole("radio", { name: "C", exact: true }).click();
  await expect(detail.locator("pre")).toContainText("OPENRAC_RAC1_HOOK(api, mod, Hero_SetPlanarVelocity, my_set_planar_velocity, &s_original)");
  await detail.getByRole("radio", { name: "C++" }).click();
  await expect(detail.locator("pre")).toContainText("mod.hook<openrac::rac1::Hero_SetPlanarVelocity>(");
  await page.getByPlaceholder("Search hook points").fill("take_damage");
  await page.getByRole("button", { name: /rac1\.player\.take_damage/ }).click();
  await expect(detail.locator("h3")).toHaveText("rac1.player.take_damage");
});

test("the manifest builder checks a manifest as it is typed, by the SDK's rules", async ({ page }) => {
  await page.goto("/mods/docs/tools/manifest?hooks=rac1.player.turn_to_heading&type=native");
  const json = page.getByLabel("The manifest as JSON: edit it, or paste your own");
  await expect(json).toHaveValue(/"rac1\.player\.turn_to_heading"/);
  await expect(page.getByText("The manifest passes every check.")).toBeVisible();
  await page.getByLabel("Id").fill("My Mod");
  await expect(page.getByText(/^id: lower case letters and digits/).first()).toBeVisible();
  await page.getByLabel("Id").fill("my-mod");
  await json.fill(JSON.stringify({ format: 2, id: "x", name: "X", version: "1.0.0", type: "script", api: "1.1", scripts: ["main.luau"], games: { rac1: ["pal"] }, hooks: ["rac1.nothing.here"] }));
  await expect(page.getByText("hooks: rac1.nothing.here is not a hook point of rac1").first()).toBeVisible();
  await json.fill("{ not json");
  await expect(page.getByText("This is not valid JSON yet.")).toBeVisible();
});

test("the changelog lists every release", async ({ page }) => {
  await page.goto("/mods/docs/changelog");
  for (const v of index.versions) await expect(page.locator(`#v${v.version.replace(/\./g, "\\.")}`)).toBeAttached();
});

for (const path of ["/mods/docs", "/mods/docs/reference/hooks-rac1", "/mods/docs/tools/manifest", "/mods/docs/reference/luau-api"]) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("@mobile the docs fit a phone: no page wider than the screen, the menu folds", async ({ page }) => {
  for (const path of ["/mods/docs", "/mods/docs/reference/c-api", "/mods/docs/reference/hooks-rac1", "/mods/docs/tools/manifest", "/mods/docs/changelog"]) {
    await page.goto(path);
    const [scroll, width] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(scroll, path).toBeLessThanOrEqual(width);
  }
  await page.goto("/mods/docs");
  await page.getByText("Docs menu").click();
  await expect(page.locator("details[open]").getByRole("link", { name: "Changelog" })).toBeVisible();
});
