/**
 * A mod's manifest (openrac-mod.json) checked in the browser, rule for rule as the SDK checks it:
 * sdk/tools/package_mod.py's check_manifest, run without the mod's folder. The SDK's test vectors
 * (sdk/tests/manifests/cases.json, copied to mod-docs/data/manifest-cases.json) hold this port to the
 * SDK's verdicts in manifest.test.ts, quirks of Python's included, so it says what
 * `package_mod.py --check` would. The messages are the SDK's own.
 */

/** A number written with a point or an exponent ("1.0", "2e0"): a float to Python even when whole. */
export class FloatNum {
  readonly value: number;
  constructor(value: number) {
    this.value = value;
  }
}

/**
 * JSON.parse that keeps what Python keeps: whether a whole number was written as a float. Browsers
 * that do not pass the number's text to the reviver (older Safari, Firefox) read every whole
 * number as an integer.
 */
export function parseManifestJson(text: string): unknown {
  // The third argument (the value's source text) is recent: JSON.parse source text access.
  const reviver = function (this: unknown, _key: string, value: unknown, context?: { source?: string }) {
    if (typeof value === "number" && Number.isInteger(value) && context?.source && /[.eE]/.test(context.source)) return new FloatNum(value);
    return value;
  };
  return JSON.parse(text, reviver as (this: unknown, key: string, value: unknown) => unknown);
}

/** A value as plain JSON again (for the editor): a FloatNum is its number. */
export function plain(value: unknown): unknown {
  if (value instanceof FloatNum) return value.value;
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  return value;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) && !(v instanceof FloatNum);
const isStr = (v: unknown): v is string => typeof v === "string";
/** Python's isinstance(v, int) and not bool. */
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
/** Python's isinstance(v, (int, float)) and not bool. */
const isNum = (v: unknown): boolean => typeof v === "number" || v instanceof FloatNum;
const num = (v: unknown): number => (v instanceof FloatNum ? v.value : (v as number));
/** Python's len(): code points, not UTF-16 units. */
const len = (s: string) => [...s].length;

/** re.match(pattern, s) with Python's `$`, which also matches before a final newline. */
function pyMatch(re: RegExp, s: string): boolean {
  return re.test(s) || (s.endsWith("\n") && re.test(s.slice(0, -1)));
}

/** int() of a run of digits that may be any script's (Python's \d is every Unicode digit). */
function pyInt(s: string): number {
  let n = 0;
  for (const ch of s.trim()) {
    let cp = ch.codePointAt(0)!;
    if (cp >= 48 && cp <= 57) {
      n = n * 10 + cp - 48;
      continue;
    }
    // Unicode's digits come in runs of ten from a zero: count back to the run's start.
    let zero = cp;
    while (/\p{Nd}/u.test(String.fromCodePoint(zero - 1)) && cp - zero < 9) zero--;
    cp -= zero;
    n = n * 10 + (cp % 10);
  }
  return n;
}

/** PurePosixPath(path): absolute, and its parts ("." and empty ones dropped, as Python does). */
function posix(path: string): { absolute: boolean; parts: string[] } {
  const absolute = path.startsWith("/");
  return { absolute, parts: path.split("/").filter((p) => p && p !== ".") };
}

export const FORMAT = 2;
export const API_MAJORS = [1];
export const SCRIPT_API: [number, number] = [1, 1];
export const PLATFORMS = ["macos-arm64", "macos-x86_64", "linux-x86_64", "linux-aarch64", "windows-x86_64", "windows-arm64", "android-arm64"];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\p{Nd}*)\.(0|[1-9]\p{Nd}*)\.(0|[1-9]\p{Nd}*)(-[0-9A-Za-z.-]+)?$/u;
const API = /^(0|[1-9]\p{Nd}*)\.(0|[1-9]\p{Nd}*)$/u;
const REQUIREMENT = /^(>=|=)(0|[1-9]\p{Nd}*)\.(0|[1-9]\p{Nd}*)\.(0|[1-9]\p{Nd}*)$/u;
const KEY = /^[a-z0-9_]+$/;
const GAME = /^[a-z0-9]+$/;
const HOOK_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HOOK_ID = /^[a-z0-9]+(\.[a-z0-9_]+)+$/;
export const SETTING_TYPES = ["bool", "int", "float", "choice", "string", "keybind"];

/** What the check knows of the SDK release it stands for: its keys.h names and its games' hook names. */
export type Tables = { keys: readonly string[]; hookNames: Readonly<Record<string, readonly string[]>> };

function bindProblem(value: unknown, most: number, keys: ReadonlySet<string>): string | null {
  if (!isStr(value)) return "is not text";
  const names = value.split(/[,\s]+/).filter(Boolean);
  const unknown = names.filter((n) => !keys.has(n));
  if (unknown.length) return `names no key, button or wheel direction: ${unknown.join(", ")}`;
  if (new Set(names).size !== names.length) return "names one input twice";
  if (names.length > most) return `has ${names.length} binds, more than ${most}`;
  return null;
}

function checkHooks(hooks: unknown, games: unknown, errors: string[], t: Tables) {
  if (hooks === undefined || hooks === null) return;
  if (!Array.isArray(hooks) || !hooks.every((h) => isStr(h) && (pyMatch(HOOK_NAME, h) || pyMatch(HOOK_ID, h)))) {
    errors.push("hooks: a list of hook points, by id (rac1.player.take_damage) or alias (Hero_TakeDamage)");
    return;
  }
  const gameIds = isObj(games) ? Object.keys(games) : [];
  const known = gameIds.map((g) => (pyMatch(GAME, g) && t.hookNames[g] ? new Set(t.hookNames[g]) : null)).filter((x): x is Set<string> => !!x);
  if (!known.length) return;
  for (const h of hooks as string[]) {
    if (!known.some((k) => k.has(h))) errors.push(`hooks: ${h} is not a hook point of ${[...gameIds].sort().join(", ")} (docs/reference/hooks-<game>.md)`);
  }
}

function checkSetting(i: number, s: unknown, errors: string[], keys: ReadonlySet<string>) {
  let where = `settings[${i}]`;
  if (!isObj(s)) {
    errors.push(`${where}: not an object`);
    return;
  }
  const key = s.key;
  if (!isStr(key) || !pyMatch(KEY, key)) errors.push(`${where}: key must be lower case letters, digits and _`);
  else where = `setting ${key}`;
  if (!isStr(s.name) || !s.name) errors.push(`${where}: no name`);
  if ("description" in s && !isStr(s.description)) errors.push(`${where}: description is not text`);
  const kind = s.type;
  if (!isStr(kind) || !SETTING_TYPES.includes(kind)) {
    errors.push(`${where}: type must be one of ${[...SETTING_TYPES].sort().join(", ")}`);
    return;
  }
  if (!("default" in s)) {
    errors.push(`${where}: no default`);
    return;
  }
  const d = s.default;
  if (kind === "bool") {
    if (typeof d !== "boolean") errors.push(`${where}: the default is not true or false`);
  } else if (kind === "int" || kind === "float") {
    const what = kind === "int" ? "an integer" : "a number";
    if (!(kind === "int" ? isInt(d) : isNum(d))) {
      errors.push(`${where}: the default is not ${what}`);
      return;
    }
    const lo = s.min ?? null;
    const hi = s.max ?? null;
    for (const [name, v] of [["min", lo], ["max", hi]] as const) {
      if (v !== null && !(isNum(v) && (kind === "float" || isInt(v)))) {
        errors.push(`${where}: ${name} is not ${what}`);
        return;
      }
    }
    if (lo !== null && hi !== null && num(lo) > num(hi)) errors.push(`${where}: min is above max`);
    if ((lo !== null && num(d) < num(lo)) || (hi !== null && num(d) > num(hi))) errors.push(`${where}: the default is out of range`);
    if (kind === "float" && "step" in s && !(isNum(s.step) && num(s.step) > 0)) errors.push(`${where}: step must be a positive number`);
  } else if (kind === "choice") {
    const choices = s.choices;
    if (!Array.isArray(choices) || choices.length < 2) {
      errors.push(`${where}: a choice needs two choices or more`);
      return;
    }
    const values: string[] = [];
    for (const c of choices) {
      if (!(isObj(c) && isStr(c.value) && isStr(c.name))) {
        errors.push(`${where}: each choice is {value, name}, both text`);
        return;
      }
      values.push(c.value);
    }
    if (new Set(values).size !== values.length) errors.push(`${where}: a value twice among the choices`);
    if (!values.some((v) => v === d)) errors.push(`${where}: the default is not one of the choices`);
  } else if (kind === "keybind") {
    const most = "binds" in s ? s.binds : 2;
    if (!(isInt(most) && (most === 1 || most === 2))) {
      errors.push(`${where}: binds must be 1 or 2`);
      return;
    }
    const why = bindProblem(d, most, keys);
    if (why) errors.push(`${where}: the default ${why}`);
  } else if (kind === "string") {
    if (!isStr(d)) errors.push(`${where}: the default is not text`);
    const m = s.max_length ?? null;
    if (m !== null && !(isInt(m) && m > 0)) errors.push(`${where}: max_length must be a positive integer`);
    else if (m !== null && isStr(d) && len(d) > (m as number)) errors.push(`${where}: the default is longer than max_length`);
  }
}

function valueProblem(s: Record<string, unknown>, value: unknown, keys: ReadonlySet<string>): string | null {
  const kind = s.type;
  if (kind === "bool") return typeof value === "boolean" ? null : "is not true or false";
  if (kind === "int" || kind === "float") {
    if (!(kind === "int" ? isInt(value) : isNum(value))) return `is not ${kind === "int" ? "an integer" : "a number"}`;
    const lo = s.min ?? null;
    const hi = s.max ?? null;
    if ((lo !== null && num(value) < num(lo)) || (hi !== null && num(value) > num(hi))) return "is out of range";
    return null;
  }
  if (kind === "choice") {
    const values = (Array.isArray(s.choices) ? s.choices : []).filter(isObj).map((c) => c.value);
    return isStr(value) && values.includes(value) ? null : "is not one of the choices";
  }
  if (kind === "string") {
    if (!isStr(value)) return "is not text";
    return isInt(s.max_length) && len(value) > s.max_length ? "is longer than max_length" : null;
  }
  if (kind === "keybind") return bindProblem(value, isInt(s.binds) ? s.binds : 2, keys);
  return "is of no setting type";
}

function checkPresets(presets: unknown, settings: Map<unknown, Record<string, unknown>>, errors: string[], keys: ReadonlySet<string>) {
  if (presets === undefined || presets === null) return;
  if (!Array.isArray(presets)) {
    errors.push("presets: a list");
    return;
  }
  const ids: string[] = [];
  presets.forEach((p, i) => {
    if (!(isObj(p) && isStr(p.id) && pyMatch(KEY, p.id) && isStr(p.name) && p.name && isObj(p.values))) {
      errors.push(`presets[${i}]: {id (a-z, 0-9, _), name, values}`);
      return;
    }
    ids.push(p.id);
    for (const [key, value] of Object.entries(p.values)) {
      const s = settings.get(key);
      if (!s) {
        errors.push(`preset ${p.id}: ${key} is not a setting of the mod`);
        continue;
      }
      const why = valueProblem(s, value, keys);
      if (why) errors.push(`preset ${p.id}: ${key} ${why}`);
    }
  });
  if (new Set(ids).size !== ids.length) errors.push("presets: an id twice");
}

function checkRefs(name: string, refs: unknown, errors: string[], version: boolean) {
  if (!Array.isArray(refs)) {
    errors.push(`${name}: not a list`);
    return;
  }
  for (const r of refs) {
    if (!isObj(r) || !isStr(r.id) || !pyMatch(ID, r.id)) {
      errors.push(`${name}: each entry is {id, ...} with a mod's id`);
      continue;
    }
    if (version && "version" in r && !(isStr(r.version) && pyMatch(REQUIREMENT, r.version))) errors.push(`${name} ${r.id}: version must be >=X.Y.Z or =X.Y.Z`);
    if (!version && "reason" in r && !isStr(r.reason)) errors.push(`${name} ${r.id}: reason is not text`);
  }
}

const get = (m: Record<string, unknown>, k: string, fallback: unknown) => (k in m ? m[k] : fallback);

/** The rules a manifest breaks, in the SDK's words; none is an empty list. */
export function checkManifest(m: unknown, t: Tables): string[] {
  const keys = new Set(t.keys);
  const errors: string[] = [];
  if (!isObj(m)) return ["the manifest is not a JSON object"];
  if (!isNum(m.format) || num(m.format) !== FORMAT) {
    if (isNum(m.format) && num(m.format) === 1) return ["format 1 is a data pack (editor/MODDING.md): it is added as a pack, not packaged here"];
    return [`format must be ${FORMAT}`];
  }
  const mid = m.id;
  if (!isStr(mid) || !pyMatch(ID, mid) || len(mid) > 64) errors.push("id: lower case letters and digits joined by single hyphens, at most 64 characters");
  if (!isStr(m.name) || !m.name.trim()) errors.push("name: required");
  if (!isStr(m.version) || !pyMatch(SEMVER, m.version)) errors.push("version: MAJOR.MINOR.PATCH, with an optional -suffix");
  for (const f of ["author", "description", "license"]) if (f in m && !isStr(m[f])) errors.push(`${f}: not text`);
  if ("homepage" in m && !(isStr(m.homepage) && m.homepage.startsWith("https://"))) errors.push("homepage: an https:// address");
  const games = m.games;
  if (!isObj(games) || !Object.keys(games).length) errors.push("games: at least one game, with its discs");
  else {
    for (const [g, versions] of Object.entries(games)) {
      if (!pyMatch(GAME, g)) errors.push(`games: '${g}' is not a game's id`);
      if (!Array.isArray(versions) || !versions.length || !versions.every((v) => isStr(v) && pyMatch(GAME, v))) errors.push(`games ${g}: a list of at least one disc version (pal, ntsc)`);
    }
  }
  const kind = get(m, "type", "native");
  if (kind !== "native" && kind !== "script") errors.push("type: native (the default) or script");
  const scripts = m.scripts;
  const majors = API_MAJORS.map((x) => `${x}.x`).join(", ");
  if (kind === "script") {
    if ("plugin" in m) errors.push("plugin: a script mod carries no library");
    const api = m.api;
    if (!isStr(api) || !pyMatch(API, api)) errors.push("api: MAJOR.MINOR, the interface the scripts are written for (required)");
    else {
      const [major, minor] = api.split(".").map(pyInt);
      if (!API_MAJORS.includes(major)) errors.push(`api: ${api}: this SDK knows interface ${majors}`);
      else if (major < SCRIPT_API[0] || (major === SCRIPT_API[0] && minor < SCRIPT_API[1])) errors.push(`api: ${api}: script mods need interface ${SCRIPT_API[0]}.${SCRIPT_API[1]} or later`);
    }
    if (!Array.isArray(scripts) || !scripts.length) errors.push("scripts: the .luau files to run, at least one");
    else {
      for (const path of scripts) {
        const p = isStr(path) ? posix(path) : null;
        if (!p || !path || p.absolute || p.parts.includes("..") || (path as string).includes("\\") || !(path as string).endsWith(".luau")) errors.push(`scripts: ${JSON.stringify(path)} is not a .luau file inside the mod`);
      }
    }
  } else if (scripts !== undefined && scripts !== null) {
    errors.push('scripts: only a script mod ("type": "script") has scripts');
  }
  const plugin = m.plugin;
  if (kind === "script") {
    // checked above
  } else if (plugin !== undefined && plugin !== null) {
    const api = m.api;
    if (!isStr(api) || !pyMatch(API, api)) errors.push("api: MAJOR.MINOR, the interface the mod was built for (required with a plugin)");
    else if (!API_MAJORS.includes(pyInt(api.split(".")[0]))) errors.push(`api: ${api}: this SDK knows interface ${majors}`);
    if (!isObj(plugin) || !Object.keys(plugin).length) errors.push("plugin: an object of platform: path, with at least one platform");
    else {
      for (const [platform, path] of Object.entries(plugin)) {
        if (!PLATFORMS.includes(platform)) {
          errors.push(`plugin: '${platform}' is not a platform (${PLATFORMS.join(", ")})`);
          continue;
        }
        const p = isStr(path) ? posix(path) : null;
        if (!p || !path || p.absolute || p.parts.includes("..") || (path as string).includes("\\")) errors.push(`plugin ${platform}: a relative path inside the mod`);
      }
    }
  } else if ("api" in m && !(isStr(m.api) && pyMatch(API, m.api))) {
    errors.push("api: MAJOR.MINOR");
  }
  checkHooks(m.hooks, games, errors, t);
  const settings = get(m, "settings", []);
  if (!Array.isArray(settings)) errors.push("settings: a list");
  else {
    settings.forEach((s, i) => checkSetting(i, s, errors, keys));
    const keyList = settings.filter(isObj).map((s) => s.key);
    const dup = [...new Set(keyList.filter((k, i) => keyList.indexOf(k) !== i))].map(String).sort();
    if (dup.length) errors.push(`settings: a key twice (${dup.join(", ")})`);
    const byKey = new Map<unknown, Record<string, unknown>>();
    for (const s of settings) if (isObj(s) && "key" in s) byKey.set(s.key, s);
    checkPresets(m.presets, byKey, errors, keys);
  }
  checkRefs("requires", get(m, "requires", []), errors, true);
  checkRefs("conflicts", get(m, "conflicts", []), errors, false);
  const load = get(m, "load", {});
  if (!isObj(load) || Object.entries(load).some(([k, v]) => (k !== "after" && k !== "before") || !Array.isArray(v) || !v.every((x) => isStr(x) && pyMatch(ID, x)))) {
    errors.push("load: {after: [ids], before: [ids]}");
  }
  const assets = m.assets;
  if (assets !== undefined && assets !== null) {
    const ok = isStr(assets) && assets && !assets.includes("\\") && !assets.includes(":");
    if (!ok || (assets as string).startsWith("/") || (assets as string).split("/").some((part) => part === "" || part === "." || part === "..")) errors.push('assets: a folder inside the mod, with / ("assets")');
  }
  if (isStr(mid)) {
    for (const name of ["requires", "conflicts"]) {
      const refs = m[name];
      if (Array.isArray(refs) && refs.some((r) => isObj(r) && r.id === mid)) errors.push(`${name}: the mod names itself`);
    }
  }
  return errors;
}

/** Which field an error is about, to show it beside that field: "setting jump: ..." is settings. */
export function fieldOf(error: string): string {
  const m = error.match(/^(\w+)/);
  const word = m ? m[1] : "";
  if (word === "setting" || word === "settings") return "settings";
  if (word === "preset" || word === "presets") return "presets";
  return word;
}
