import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform } from "./platform.ts";
import { classify, pickLatest, toLauncherRelease, type GithubRelease } from "./releases.ts";

// The files of a launcher build, as its workflow names them.
const NAMES = [
  "latest.json",
  "OpenRAC.Launcher-0.9.1-1.aarch64.rpm",
  "OpenRAC.Launcher-0.9.1-1.aarch64.rpm.sig",
  "OpenRAC.Launcher-0.9.1-1.fc44.x86_64.rpm",
  "OpenRAC.Launcher-0.9.1-1.x86_64.rpm",
  "OpenRAC.Launcher_0.9.1_android-arm64-debug.apk",
  "OpenRAC.Launcher_0.9.1_android-arm64-debug.apk.sig",
  "OpenRAC.Launcher_0.9.1_aarch64.AppImage",
  "OpenRAC.Launcher_0.9.1_amd64.AppImage",
  "OpenRAC.Launcher_0.9.1_amd64.AppImage.tar.gz",
  "OpenRAC.Launcher_0.9.1_amd64.deb",
  "OpenRAC.Launcher_0.9.1_arm64.deb",
  "OpenRAC.Launcher_0.9.1_universal.dmg",
  "OpenRAC.Launcher_universal.app.tar.gz",
  "OpenRAC.Launcher_0.9.1_x64-setup.exe",
  "OpenRAC.Launcher_0.9.1_x64-setup.nsis.zip",
  "OpenRAC.Launcher_0.9.1_x64_en-US.msi",
];

const release = (over: Partial<GithubRelease> = {}): GithubRelease => ({
  tag_name: "launcher-v0.9.1",
  html_url: "https://github.com/OpenRAC/OpenRAC/releases/tag/launcher-v0.9.1",
  published_at: "2026-10-25T15:00:00Z",
  draft: false,
  prerelease: false,
  assets: NAMES.map((name, i) => ({ name, browser_download_url: `https://example.test/${name}`, size: 1000 + i })),
  ...over,
});

test("classify skips signatures, the manifest and the updater's archives", () => {
  for (const n of ["latest.json", "a.apk.sig", "x.AppImage.tar.gz", "x.app.tar.gz", "x-setup.nsis.zip", "README.md"]) assert.equal(classify(n), null, n);
});

test("every system gets its main installer first", () => {
  const r = toLauncherRelease(release());
  assert.equal(r.version, "0.9.1");
  assert.deepEqual(r.platforms.map((p) => p.id), ["windows", "linux", "macos", "android"]);
  const main = Object.fromEntries(r.platforms.map((p) => [p.id, p.main?.url.split("/").pop()]));
  assert.deepEqual(main, {
    windows: "OpenRAC.Launcher_0.9.1_x64-setup.exe",
    linux: "OpenRAC.Launcher_0.9.1_amd64.AppImage",
    macos: "OpenRAC.Launcher_0.9.1_universal.dmg",
    android: "OpenRAC.Launcher_0.9.1_android-arm64-debug.apk",
  });
  const linux = r.platforms.find((p) => p.id === "linux")!;
  assert.deepEqual(linux.others.map((d) => d.label), [
    ".deb (Debian, Ubuntu) · x86-64",
    ".rpm for Fedora · x86-64",
    ".rpm · x86-64",
    "AppImage · ARM64",
    ".deb (Debian, Ubuntu) · ARM64",
    ".rpm · ARM64",
  ]);
  assert.deepEqual(r.platforms[0].others.map((d) => d.label), ["Windows Installer (.msi)"]);
  assert.equal(r.platforms[3].supports[0], "Android 9 or newer");
});

test("a system without files in the release still has its entry", () => {
  const r = toLauncherRelease(release({ assets: [] }));
  assert.equal(r.platforms.length, 4);
  assert.ok(r.platforms.every((p) => p.main === null && p.others.length === 0));
});

test("pickLatest takes the newest published launcher release", () => {
  const list = [
    release({ tag_name: "launcher-dev-master", prerelease: true }),
    release({ tag_name: "launcher-v1.0.0", draft: true }),
    release({ tag_name: "sdk-v1.3.0" }),
    release({ tag_name: "launcher-v0.9.0" }),
    release({ tag_name: "launcher-v0.8.4" }),
  ];
  assert.equal(pickLatest(list)?.tag_name, "launcher-v0.9.0");
  assert.equal(pickLatest([]), null);
});

test("detectPlatform", () => {
  assert.equal(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"), "windows");
  assert.equal(detectPlatform("Mozilla/5.0 (Linux; Android 14; AYN Odin3) AppleWebKit/537.36"), "android");
  assert.equal(detectPlatform("Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0"), "linux");
  assert.equal(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"), "macos");
  assert.equal(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), null);
  assert.equal(detectPlatform("", "Windows"), "windows");
  assert.equal(detectPlatform("curl/8.0"), null);
});
