import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compareVersions } from "./logic.ts";
import { SCHEMA, type Release, type ReleaseIndex } from "./types.ts";

/**
 * The mod SDK's docs, read from mod-docs/data/ (written by mod-docs/tools/build.py from OpenRAC's
 * sdk-v* tags). Every docs page is built ahead from these files, so they are read at build time only;
 * a file that is missing or of another shape fails the build rather than a visitor's page.
 */

// Not traced: Next would otherwise copy the whole project into the server bundle. Every page is static.
const root = () => join(/* turbopackIgnore: true */ process.cwd(), "mod-docs", "data");

function readJson<T>(name: string): T {
  const value = JSON.parse(readFileSync(/* turbopackIgnore: true */ join(root(), name), "utf8")) as T & { schema?: number };
  if (value.schema !== SCHEMA) throw new Error(`mod-docs/data/${name}: schema ${value.schema}, the site reads ${SCHEMA}`);
  return value;
}

let index: ReleaseIndex | null = null;
const releases = new Map<string, Release>();

/** The SDK releases, newest first. */
export function getDocsIndex(): ReleaseIndex {
  if (!index) {
    const read = readJson<ReleaseIndex>("index.json");
    index = { ...read, versions: [...read.versions].sort((a, b) => compareVersions(b.version, a.version)) };
  }
  return index;
}

/** One release's docs. */
export function getRelease(version: string): Release {
  let r = releases.get(version);
  if (!r) {
    if (!getDocsIndex().versions.some((v) => v.version === version)) throw new Error(`no SDK release ${version}`);
    r = readJson<Release>(`${version}.json`);
    releases.set(version, r);
  }
  return r;
}
