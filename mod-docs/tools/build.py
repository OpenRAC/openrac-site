#!/usr/bin/env python3
"""The mod SDK's docs for /mods/docs, one file per SDK release, from OpenRAC's own sources.

    python3 mod-docs/tools/build.py [--source PATH_OR_URL] [--only 1.11.0] [--check]

Each SDK release is a tag `sdk-v<version>` of OpenRAC/OpenRAC. For every tag this reads what that
release shipped under sdk/ (the headers, the Luau types, the hook tables, the guides) and writes
mod-docs/data/<version>.json; mod-docs/data/index.json lists the releases, newest first, with what
each one changed. Nothing here is written by hand, so the docs never drift from the SDK: a new tag
is a new version on the site the next time this runs (.github/workflows/mod-docs-sync.yml, daily).

The C header is read by cheader.py; the C++ header and the Luau types by the SDK's own
sdk/tools/gen_reference.py (taken from the newest release); the hook points by each release's own
sdk/tools/gen_binding.py, as the SDK's reference pages are. Stdlib and git only.

--check writes nothing and fails when a file is not what the sources give.
"""

from __future__ import annotations

import argparse
import importlib.util
import io
import json
import re
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cheader  # noqa: E402

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
UPSTREAM = "https://github.com/OpenRAC/OpenRAC"
TAG = re.compile(r"^sdk-v(\d+)\.(\d+)\.(\d+)$")
# The shape of the files; the site refuses files of another (src/lib/modDocs).
SCHEMA = 1

# The guides in reading order (sdk/docs/README.md's list); a guide a release adds goes after them.
GUIDE_ORDER = ["getting-started", "manifest", "settings", "hooks", "scripts", "native-c", "native-cpp",
               "packaging-and-releases", "install-from-link", "where-mods-live", "troubleshooting", "views"]


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True).stdout


def checkout(source: str, cache: Path) -> Path:
    """A clone of OpenRAC with its sdk-v* tags: `source` itself when it is a folder, else a
    blob-less clone in `cache` (blobs come only for the files read)."""
    if Path(source).is_dir():
        return Path(source)
    repo = cache / "openrac"
    if not (repo / ".git").exists() and not (repo / "HEAD").exists():
        subprocess.run(["git", "clone", "--quiet", "--filter=blob:none", "--no-checkout", source, str(repo)], check=True)
    else:
        subprocess.run(["git", "-C", str(repo), "fetch", "--quiet", "--tags", "--force", source], check=True)
    return repo


def releases(repo: Path) -> list[tuple[tuple[int, int, int], str]]:
    out = []
    for tag in git(repo, "tag", "--list", "sdk-v*").split():
        m = TAG.match(tag)
        if m:
            out.append(((int(m[1]), int(m[2]), int(m[3])), tag))
    return sorted(out)


def extract(repo: Path, tag: str, into: Path) -> Path:
    """The tag's sdk/ folder (and docs/port/MODS.md), as files."""
    data = subprocess.run(["git", "-C", str(repo), "archive", "--format=tar", tag, "sdk"],
                          check=True, capture_output=True).stdout
    with tarfile.open(fileobj=io.BytesIO(data)) as tar:
        tar.extractall(into, filter="data")
    return into / "sdk"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(path.parent))
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.path.remove(str(path.parent))
    return mod


# ---- Each part of a release ----

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def title_of(markdown: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+)$", markdown, re.M)
    return m.group(1).strip().strip("`") if m else fallback


def guides(sdk: Path) -> list[dict]:
    folder = sdk / "docs"
    found = {p.stem: p for p in folder.glob("*.md") if p.stem != "README"} if folder.is_dir() else {}
    order = [g for g in GUIDE_ORDER if g in found] + sorted(set(found) - set(GUIDE_ORDER))
    return [{"slug": g, "title": title_of(read(found[g]), g), "markdown": read(found[g])} for g in order]


def overview(sdk: Path) -> str:
    """The docs' front page: sdk/docs/README.md, or the SDK's README for a release with no guides."""
    return read(sdk / "docs" / "README.md") or read(sdk / "README.md")


def interface(header: str) -> str:
    major = re.search(r"#define OPENRAC_MOD_API_MAJOR (\d+)", header)
    minor = re.search(r"#define OPENRAC_MOD_API_MINOR (\d+)", header)
    return f"{major.group(1)}.{minor.group(1)}" if major and minor else ""


def cpp(sdk: Path, ref) -> dict | None:
    header = sdk / "include" / "openrac" / "mod.hpp"
    if not header.is_file():
        return None
    h = ref.parse_cpp_header(read(header))
    for c in h["classes"]:
        for m in c["members"]:
            m["since"] = cheader.since(m["about"]) or None
            name = re.search(r"(?:operator\s*\S+|~?\w+)\s*\(", m["decl"])
            m["name"] = name.group(0)[:-1].strip() if name else m["decl"]
    return h


LUAU_ROW = re.compile(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$")


def luau_docs(scripts_md: str) -> dict[str, dict]:
    """What scripts.md's table says of each member of `openrac` (the types file has no prose)."""
    out: dict[str, dict] = {}
    in_table = False
    for line in scripts_md.splitlines():
        if line.startswith("## The `openrac` table"):
            in_table = True
            continue
        if in_table and line.startswith("## "):
            break
        m = LUAU_ROW.match(line) if in_table else None
        if not m or set(m.group(1)) <= set("-| "):
            continue
        names = re.findall(r"`(?:openrac)?\.?(\w+)(?:\([^`]*\))?`", m.group(1))
        ver = re.search(r"\((\d+\.\d+)\)", m.group(1))
        for n in names:
            out.setdefault(n, {"about": m.group(2), "usage": m.group(1), "since": ver.group(1) if ver else None})
    return out


def luau(sdk: Path, ref) -> dict | None:
    path = next(iter(sorted((sdk / "types").glob("*.d.luau"))), None) if (sdk / "types").is_dir() else None
    if path is None:
        return None
    t = ref.parse_luau_types(read(path))
    docs = luau_docs(read(sdk / "docs" / "scripts.md"))
    since = "1.1"
    for m in t["members"]:
        tag = re.match(r"interface (\d+\.\d+)", m.get("about", ""))
        since = tag.group(1) if tag else since
        d = docs.get(m["name"], {})
        m["since"] = d.get("since") or since
        m["about"] = d.get("about", "")
        m["usage"] = d.get("usage", "")
    # A type of hook point names is a list of every id: the hook reference has them.
    t["types"] = [ty for ty in t["types"] if ty["name"] != "HookPoint"]
    for ty in t["types"]:
        if len(ty["text"]) > 4000:
            ty["text"] = ty["text"][:4000].rsplit("\n", 1)[0] + "\n    -- ... (the rest in the SDK's types file)"
    t["file"] = path.relative_to(sdk).as_posix()
    if "require" in docs:
        t["members"].append({"name": "require", "type": "(name: string) -> any", "about": docs["require"]["about"],
                             "usage": docs["require"]["usage"], "since": "1.1", "global": True})
    return t


BINDING_DUMP = """
import json, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import gen_binding
merged = gen_binding.load(sys.argv[2], table_path=Path(sys.argv[3]))
json.dump(merged, sys.stdout, default=str)
"""


def hooks(sdk: Path) -> list[dict]:
    """Each game's hook points and script fields, as the release's own generator merges them."""
    out = []
    tables = sorted((sdk / "bindings").glob("*.json")) if (sdk / "bindings").is_dir() else []
    headers = {p.stem: p for p in (sdk / "include" / "openrac" / "games").glob("*.h")}
    games = [t.stem for t in tables] or sorted(headers)
    for game in games:
        table = sdk / "bindings" / f"{game}.json"
        c_types = cheader.game_header(read(headers[game])) if game in headers else {}
        cpp_types = set(re.findall(r"^struct (\w+) \{", read(sdk / "include" / "openrac" / "games" / f"{game}.hpp"), re.M))
        if table.is_file() and (sdk / "tools" / "gen_binding.py").is_file():
            got = subprocess.run([sys.executable, "-I", "-c", BINDING_DUMP, str(sdk / "tools"), game, str(table)],
                                 check=True, capture_output=True, text=True, cwd=sdk).stdout
            merged = json.loads(got)
            discs = merged.get("discs", [])
            points = merged["hooks"]
            fields = merged.get("fields", [])
        else:  # the first releases: the game's C header is the table
            discs, fields = [], []
            points = [{"name": n, "signature": "", "params": [p["name"] for p in v.get("params", [])], "about": ""}
                      for n, v in c_types.items()]
            text = read(headers[game]) if game in headers else ""
            for p in points:
                sig = re.search(rf'_SIG_{p["name"]}\s+"([^"]+)"', text)
                p["signature"] = sig.group(1) if sig else ""
                about = re.search(rf'/\*\s*{p["name"]}\b\s*(?:\(\w+\))?:?\s*(.*?)\*/\s*#define \w+_HOOK_{p["name"]}\b', text, re.S)
                p["about"] = " ".join(re.sub(r"^\s*\*\s?", "", about.group(1), flags=re.M).split()) if about else ""
        rows = []
        for h in points:
            ct = c_types.get(h["name"])
            rows.append({
                "id": h.get("id") or "",
                "name": h["name"],
                "aliases": sorted(a for a in h.get("aliases", []) if a != h["name"] and not a.startswith(("func_", "FUN_"))),
                "symbols": h.get("symbols", {}),
                "signature": h["signature"],
                "params": h.get("params", []),
                "about": h.get("about", ""),
                "experimental": h.get("origin") == "catalogue",
                "classes": h.get("classes", []),
                "c": {"type": ct["type"], "macro": ct["macro"],
                      "params": ct.get("params", [])} if ct else None,
                "cpp": h["name"] in cpp_types,
            })
        out.append({"game": game, "discs": discs, "hooks": rows,
                    "fields": [{"name": f["name"], "type": f["type"], "readonly": bool(f.get("readonly")),
                                "about": f.get("about", "")} for f in fields]})
    return out


def hook_names(sdk: Path) -> dict[str, list[str]]:
    """Every name each game's hook points answer to, as package_mod.py reads bindings/<game>.ids.lock:
    what the manifest builder checks a manifest's "hooks" against."""
    out = {}
    for lock in sorted((sdk / "bindings").glob("*.ids.lock")) if (sdk / "bindings").is_dir() else []:
        names = set()
        for line in read(lock).splitlines():
            if line and not line.startswith("#"):
                cols = line.split("\t")
                names.add(cols[0])
                names.update(a for a in (cols[2].split(",") if len(cols) > 2 else []) if a)
        out[lock.name.split(".")[0]] = sorted(names)
    return out


def keys(sdk: Path) -> list[str]:
    return re.findall(r'\{"([A-Za-z0-9]+)", ', read(sdk / "include" / "openrac" / "keys.h"))


# ---- Examples: real code of the release that uses each name ----

FENCE = re.compile(r"^```(\w*)\n(.*?)^```", re.M | re.S)


def snippets(sdk: Path, guide_list: list[dict]) -> list[dict]:
    """Every code block of the guides, and the SDK's example and template mods, with where it is."""
    out = []
    for g in guide_list:
        for m in FENCE.finditer(g["markdown"]):
            lang = {"c": "c", "cpp": "cpp", "lua": "luau", "luau": "luau"}.get(m.group(1).lower())
            if lang:
                out.append({"lang": lang, "code": m.group(2).rstrip(), "from": f"guide:{g['slug']}"})
    for rel in ("examples", "template/src", "template-script"):
        base = sdk / rel
        if not base.is_dir():
            continue
        for p in sorted(base.rglob("*")):
            lang = {".c": "c", ".cpp": "cpp", ".luau": "luau"}.get(p.suffix)
            if lang and p.is_file():
                out.append({"lang": lang, "code": read(p).rstrip(), "from": "sdk/" + p.relative_to(sdk).as_posix(), "file": True})
    return out


def excerpt(code: str, needle: re.Pattern, around: int = 6) -> str | None:
    """The lines around the first use of a name in a file: its whole function, when short."""
    lines = code.splitlines()
    hit = next((n for n, l in enumerate(lines) if needle.search(l)), None)
    if hit is None:
        return None
    start = hit
    while start > 0 and hit - start < around and lines[start - 1].strip() and not lines[start].startswith(("static", "OPENRAC", "int ", "void ")):
        start -= 1
    end = hit
    while end + 1 < len(lines) and end - hit < around and lines[end + 1].strip():
        end += 1
    body = lines[start:end + 1]
    pad = min((len(l) - len(l.lstrip()) for l in body if l.strip()), default=0)
    return "\n".join(l[pad:] for l in body)


def examples_for(code: list[dict], patterns: list[tuple[str, str]], most: int = 3) -> list[dict]:
    out, seen = [], set()
    for lang, pattern in patterns:
        needle = re.compile(pattern)
        for s in code:
            if s["lang"] != lang or not needle.search(s["code"]):
                continue
            text = excerpt(s["code"], needle) if s.get("file") or s["code"].count("\n") > 14 else s["code"]
            if text and text not in seen:
                seen.add(text)
                out.append({"lang": lang, "code": text, "from": s["from"]})
            if len(out) >= most:
                return out
    return out


def attach_examples(doc: dict, code: list[dict]) -> None:
    for section in doc["c"]["sections"] if doc.get("c") else []:
        for item in section["items"]:
            if item["kind"] == "struct":
                for g in item["groups"]:
                    for m in g["members"]:
                        if item["name"] == "openrac_api":
                            pats = [("c", rf"->\s*{m['name']}\b")]
                            if doc.get("cpp"):
                                pats.append(("cpp", rf"\bmod\.{m['name']}\b"))
                        else:
                            pats = [("c", rf"(?:->|\.)\s*{m['name']}\b")]
                        found = examples_for(code, pats, 2)
                        if found:
                            m["examples"] = found
            elif item["kind"] in ("macro", "callback", "type"):
                found = examples_for(code, [("c", rf"\b{item['name']}\b"), ("cpp", rf"\b{item['name']}\b")], 2)
                if found:
                    item["examples"] = found
            elif item["kind"] == "constants":
                for c in item["items"]:
                    found = examples_for(code, [("c", rf"\b{c['name']}\b"), ("cpp", rf"\b{c['name']}\b")], 1)
                    if found:
                        c["examples"] = found
    if doc.get("cpp"):
        for c in doc["cpp"]["classes"]:
            for m in c["members"]:
                name = re.escape(m["name"])
                found = examples_for(code, [("cpp", rf"\.\s*{name}\s*[<(]")], 2) if re.match(r"^\w+$", m["name"]) else []
                if found:
                    m["examples"] = found
        for m in doc["cpp"]["macros"]:
            found = examples_for(code, [("cpp", rf"\b{m['name'].split('(')[0]}\b")], 1)
            if found:
                m["examples"] = found
    if doc.get("luau"):
        for m in doc["luau"]["members"]:
            pat = rf"\brequire\(" if m.get("global") else rf"\bopenrac\.{m['name']}\b"
            found = examples_for(code, [("luau", pat)], 2)
            if found:
                m["examples"] = found


# ---- What changed ----

def names(doc: dict) -> dict[str, dict[str, str]]:
    """Every documented name of a release, by part, with its signature: what a diff compares."""
    out: dict[str, dict[str, str]] = {"c": {}, "cpp": {}, "luau": {}, "hooks": {}, "fields": {}}
    for section in doc["c"]["sections"] if doc.get("c") else []:
        for item in section["items"]:
            if item["kind"] == "constants":
                for c in item["items"]:
                    out["c"][c["name"]] = "constant"
            elif item["kind"] == "struct":
                out["c"][item["name"]] = "struct"
                for g in item["groups"]:
                    for m in g["members"]:
                        out["c"][f"{item['name']}.{m['name']}"] = m["decl"]
            else:
                out["c"][item["name"]] = item.get("decl") or item["kind"]
    for c in (doc.get("cpp") or {}).get("classes", []):
        out["cpp"][f"openrac::{c['name']}"] = "class"
        for m in c["members"]:
            out["cpp"][f"openrac::{c['name']}::{m['name']}"] = m["decl"] if m["name"] not in out["cpp"] else ""
    for m in (doc.get("luau") or {}).get("members", []):
        out["luau"][m["name"] if m.get("global") else f"openrac.{m['name']}"] = m["type"]
    for g in doc.get("hooks", []):
        for h in g["hooks"]:
            out["hooks"][h["id"] or h["name"]] = h["signature"]
        for f in g["fields"]:
            out["fields"][f"{g['game']}:{f['name']}"] = f["type"]
    return out


def diff(old: dict | None, new: dict) -> dict:
    a, b = names(old) if old else None, names(new)
    out = {}
    for part in b:
        if a is None:
            out[part] = {"added": [], "removed": [], "changed": []}
            continue
        added = sorted(set(b[part]) - set(a[part]))
        removed = sorted(set(a[part]) - set(b[part]))
        changed = sorted(n for n in set(a[part]) & set(b[part]) if a[part][n] != b[part][n] and a[part][n] and b[part][n])
        out[part] = {"added": added, "removed": removed, "changed": [{"name": n, "from": a[part][n], "to": b[part][n]} for n in changed]}
    return out


PR = re.compile(r"\(#(\d+)\)\s*$")


def commits(repo: Path, prev: str | None, tag: str) -> list[dict]:
    """The commits that touched sdk/ since the last release: what the release notes would say."""
    span = f"{prev}..{tag}" if prev else tag
    out = []
    for line in git(repo, "log", "--format=%H%x09%cs%x09%s", span, "--", "sdk").splitlines():
        sha, date, subject = line.split("\t", 2)
        pr = PR.search(subject)
        out.append({"sha": sha[:10], "date": date, "subject": PR.sub("", subject).strip(), "pr": int(pr.group(1)) if pr else None})
        if not prev and len(out) >= 30:
            break
    return out


# ---- All of it ----

def build_release(repo: Path, tag: str, version: str, sdk: Path, ref) -> dict:
    header = read(sdk / "include" / "openrac" / "openrac_mod.h")
    guide_list = guides(sdk)
    doc = {
        "schema": SCHEMA,
        "version": version,
        "tag": tag,
        "commit": git(repo, "rev-list", "-n", "1", tag).strip(),
        "date": git(repo, "log", "-1", "--format=%cs", tag).strip(),
        "interface": interface(header),
        "overview": overview(sdk),
        "guides": guide_list,
        "c": cheader.parse(header),
        "cpp": cpp(sdk, ref),
        "luau": luau(sdk, ref),
        "hooks": hooks(sdk),
        "keys": keys(sdk),
        "hookNames": hook_names(sdk),
    }
    attach_examples(doc, snippets(sdk, guide_list))
    return doc


def dump(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", default=UPSTREAM, help="an OpenRAC clone, or its URL (default: upstream)")
    ap.add_argument("--out", type=Path, default=DATA)
    ap.add_argument("--check", action="store_true", help="write nothing; fail when a file is stale")
    args = ap.parse_args(argv)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        repo = checkout(args.source, tmp)
        tags = releases(repo)
        if not tags:
            print("build: no sdk-v* tags found", file=sys.stderr)
            return 1
        latest_sdk = extract(repo, tags[-1][1], tmp / "latest")
        ref = load_module(latest_sdk / "tools" / "gen_reference.py", "gen_reference_latest")

        files: dict[str, str] = {}
        index = []
        prev_doc, prev_tag = None, None
        for (ver, tag) in tags:
            version = ".".join(map(str, ver))
            sdk = extract(repo, tag, tmp / tag)
            doc = build_release(repo, tag, version, sdk, ref)
            changes = diff(prev_doc, doc)
            notes = commits(repo, prev_tag, tag)
            doc["changes"] = {"since": prev_doc["version"] if prev_doc else None, "api": changes, "commits": notes}
            files[f"{version}.json"] = dump(doc)
            index.append({"version": version, "tag": tag, "date": doc["date"], "interface": doc["interface"],
                          "commit": doc["commit"],
                          "added": sum(len(p["added"]) for p in changes.values()),
                          "removed": sum(len(p["removed"]) for p in changes.values())})
            if (ver, tag) == tags[-1]:
                cases = sdk / "tests" / "manifests" / "cases.json"
                if cases.is_file():
                    files["manifest-cases.json"] = cases.read_text(encoding="utf-8")
            prev_doc, prev_tag = doc, tag
        index.reverse()
        files["index.json"] = json.dumps({"schema": SCHEMA, "source": UPSTREAM, "latest": index[0]["version"],
                                          "versions": index}, ensure_ascii=False, indent=1) + "\n"

    stale = []
    for name, text in files.items():
        path = args.out / name
        current = path.read_text(encoding="utf-8") if path.is_file() else None
        if current == text:
            continue
        if args.check:
            stale.append(name)
        else:
            args.out.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
            print(f"wrote {path}")
    known = {p.name for p in args.out.glob("*.json")} if args.out.is_dir() else set()
    for name in sorted(known - set(files)):
        if args.check:
            stale.append(name)
        else:
            (args.out / name).unlink()
            print(f"removed {args.out / name}")
    if stale:
        print("build: stale (run python3 mod-docs/tools/build.py): " + ", ".join(stale), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
