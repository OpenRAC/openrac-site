import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests against the production build, fed by the shared fixture index (the same file the
 * launcher and openrac-mods test with) plus a second, hostile index. `file:` indexes are only read when
 * MODS_ALLOW_FILE is set, as here.
 */
const PORT = 3200;
const fixture = pathToFileURL(resolve("src/lib/mods/__fixtures__/index.json")).href;
const second = pathToFileURL(resolve("e2e/fixtures/second-index.json")).href;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } }, grepInvert: /@mobile/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" }, grep: /@mobile/ },
    { name: "tablet", use: { ...devices["iPad Mini"], browserName: "chromium" }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/healthz`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { MOD_INDEXES: `${fixture},${second}`, MODS_ALLOW_FILE: "1" },
  },
});
