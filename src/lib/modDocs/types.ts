/**
 * The mod SDK's docs as mod-docs/tools/build.py writes them: one file per SDK release
 * (mod-docs/data/<version>.json) and a list of the releases (index.json). Read with fs at build.
 */

export const SCHEMA = 1;

export type Lang = "c" | "cpp" | "luau" | "json";

/** Real code of the release that uses a name: a guide's block, or the SDK's example and template mods. */
export type Example = { lang: Lang; code: string; from: string };

export type CParam = { type: string; name: string };

export type CConstant = { name: string; values: string[]; about: string; since: string | null; examples?: Example[] };

export type CMember =
  | { kind: "function"; name: string; decl: string; returns: string; params: CParam[]; signature: string; examples?: Example[] }
  | { kind: "field"; name: string; decl: string; type: string; examples?: Example[] };

export type CGroup = { about: string; since: string | null; members: CMember[] };

export type CItem =
  | { kind: "constants"; about: string; since: string | null; items: CConstant[] }
  | { kind: "struct"; name: string; about: string; since: string | null; groups: CGroup[] }
  | { kind: "callback"; name: string; decl: string; returns: string; params: CParam[]; about: string; since: string | null; examples?: Example[] }
  | { kind: "type"; name: string; decl: string; about: string; since: string | null; examples?: Example[] }
  | { kind: "macro"; name: string; params: string[]; body: string; about: string; since: string | null; examples?: Example[] };

export type CSection = { title: string; about: string; since: string | null; items: CItem[] };

export type CppMember = { decl: string; about: string; since: string | null; name: string; examples?: Example[] };
export type CppClass = { name: string; template: string; about: string; members: CppMember[] };
export type CppDoc = { intro: string; classes: CppClass[]; macros: { name: string; about: string; examples?: Example[] }[] };

export type LuauMember = { name: string; type: string; about: string; usage: string; since: string | null; global?: boolean; examples?: Example[] };
export type LuauDoc = { file: string; /** Every game's types file (older data: only `file`). */ files?: string[]; members: LuauMember[]; types: { name: string; text: string; about: string }[] };

export type Hook = {
  id: string;
  name: string;
  aliases: string[];
  symbols: Record<string, string>;
  signature: string;
  params: string[];
  about: string;
  experimental: boolean;
  classes: number[];
  /** The hook point's own C type and macro (games/<game>.h), when it has them. */
  c: { type: string; macro: string; params: CParam[] } | null;
  /** Whether games/<game>.hpp has a C++ type for it (openrac::<game>::<name>). */
  cpp: boolean;
};

export type GameHooks = {
  game: string;
  discs: string[];
  hooks: Hook[];
  fields: { name: string; type: string; readonly: boolean; about: string }[];
};

export type PartDiff = { added: string[]; removed: string[]; changed: { name: string; from: string; to: string }[] };
export type Commit = { sha: string; date: string; subject: string; pr: number | null };

export type Release = {
  schema: number;
  version: string;
  tag: string;
  commit: string;
  date: string;
  /** The mod interface this release describes, "1.11" (OPENRAC_MOD_API_MAJOR.MINOR). */
  interface: string;
  overview: string;
  guides: { slug: string; title: string; markdown: string }[];
  c: { intro: string; sections: CSection[] };
  cpp: CppDoc | null;
  luau: LuauDoc | null;
  hooks: GameHooks[];
  keys: string[];
  /** Every name each game's hook points answer to (bindings/<game>.ids.lock): what a manifest's "hooks" may say. */
  hookNames: Record<string, string[]>;
  changes: { since: string | null; api: Record<"c" | "cpp" | "luau" | "hooks" | "fields", PartDiff>; commits: Commit[] };
};

export type ReleaseSummary = { version: string; tag: string; date: string; interface: string; commit: string; added: number; removed: number };
export type ReleaseIndex = { schema: number; source: string; latest: string; versions: ReleaseSummary[] };
