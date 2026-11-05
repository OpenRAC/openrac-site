"""Reads the SDK's C header (sdk/include/openrac/openrac_mod.h) into items for the docs.

The header is regular: banner comments mark its sections, a comment stands before each item it
describes, and each item says which interface added it ("Since 1.2."). This keeps all of that:
the sections, the constants in runs (a blank line ends a run), the types, and each struct's
members, where a member with no comment of its own shares the one above it (setting_bool,
setting_int, ... under one comment). Stdlib only.
"""

from __future__ import annotations

import re

SINCE = re.compile(r"[Ss]ince (\d+\.\d+)")


def since(text: str) -> str | None:
    """The first "Since X.Y" in a comment: the interface that added the item."""
    m = SINCE.search(text)
    return m.group(1) if m else None


def _strip(comment: str) -> str:
    body = comment.strip()
    body = re.sub(r"^/\*+", "", body)
    body = re.sub(r"\*+/$", "", body)
    lines = [re.sub(r"^\s*\*\s?", "", line).rstrip() for line in body.splitlines()]
    return "\n".join(lines).strip()


def _banner(text: str) -> tuple[str, str] | None:
    """A section's title and the text under it, when the comment is a banner (its title between two
    lines of dashes)."""
    lines = [re.sub(r"^\*\s*", "", l.strip()).strip() for l in text.splitlines()]
    dashes = [n for n, l in enumerate(lines) if re.fullmatch(r"-{10,}\s*\*?", l)]
    if not dashes:
        return None
    end = dashes[1] if len(dashes) > 1 else len(lines)
    inner = "\n".join(lines[dashes[0] + 1:end]).strip()
    title, _, about = inner.partition("\n\n")
    about = (about + "\n\n" + "\n".join(lines[end + 1:])).strip()
    title = " ".join(title.split())
    return (title, _flat(about)) if title else None


def _flat(text: str) -> str:
    """A comment as one paragraph per blank-line-separated block."""
    paras = [" ".join(p.split()) for p in re.split(r"\n\s*\n", text)]
    return "\n\n".join(p for p in paras if p)


FUNC_PTR = re.compile(r"^(?P<ret>.+?)\(\s*\*\s*(?P<name>\w+)\s*\)\s*\((?P<params>.*)\)$", re.S)


def split_params(params: str) -> list[dict]:
    """`int a, const char* b` as [{type, name}]; `void` is none."""
    params = " ".join(params.split())
    if params in ("", "void"):
        return []
    out = []
    depth = 0
    cur = ""
    for ch in params:
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
            continue
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        cur += ch
    out.append(cur)
    result = []
    for p in out:
        p = p.strip()
        m = re.match(r"^(.*?)(\w+)(\[[^\]]*\])?$", p)
        if m and m.group(1).strip() and not p.endswith("*"):
            result.append({"type": (m.group(1).strip() + (m.group(3) or "")).replace(" *", "*"), "name": m.group(2)})
        else:
            result.append({"type": p, "name": ""})
    return result


def member(decl: str) -> dict:
    """A struct member: a function pointer (a call of the table) or a plain field."""
    decl = " ".join(decl.split())
    m = FUNC_PTR.match(decl)
    if m:
        ret = m.group("ret").strip()
        params = split_params(m.group("params"))
        sig = f"{ret} {m.group('name')}(" + ", ".join(f"{p['type']} {p['name']}".strip() for p in params) + ")"
        return {"kind": "function", "name": m.group("name"), "decl": decl, "returns": ret,
                "params": params, "signature": sig.replace("* ", "* ").replace(" *", "*")}
    m = re.match(r"^(.*?)(\w+)\s*(\[[^\]]*\])?$", decl)
    if m:
        return {"kind": "field", "name": m.group(2), "decl": decl, "type": (m.group(1).strip() + (m.group(3) or ""))}
    return {"kind": "field", "name": decl, "decl": decl, "type": ""}


def parse(text: str) -> dict:
    lines = text.splitlines()
    out: dict = {"intro": "", "sections": []}
    section = {"title": "", "about": "", "since": None, "items": []}
    out["sections"].append(section)
    pending = ""      # the comment right above the next item
    run_about = ""    # a comment above another comment: it describes the run of constants that follows
    run = None        # the constants' run being read
    struct = None
    group = None      # a struct's members under one comment
    decl = ""
    first = True
    i = 0

    def new_section(title: str, about: str) -> None:
        nonlocal section, run, pending, run_about
        title = re.sub(r"\s*\(since \d+\.\d+\)$", "", title)
        section = {"title": title, "about": about, "since": since(banner[0]), "items": []}
        out["sections"].append(section)
        run, pending, run_about = None, "", ""

    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if s.startswith("/*"):
            block = [line]
            while "*/" not in lines[i]:
                i += 1
                block.append(lines[i])
            raw = "\n".join(block)
            rest = lines[i].split("*/", 1)[1].strip()
            comment = _strip(raw[: raw.rfind("*/") + 2])
            i += 1
            if first:
                first = False
                kept = [l for l in comment.splitlines() if not l.startswith(("SPDX", "Copyright"))]
                out["intro"] = "\n".join(kept).strip()
                continue
            banner = _banner(comment) if struct is None else None
            if banner:
                new_section(*banner)
                continue
            if rest:  # a comment ahead of code on the same line (rare): treat as its own
                pending = comment
                lines[i - 1] = rest
                i -= 1
                continue
            if struct is None and pending and run is None and i < len(lines) and lines[i].strip().startswith("/*"):
                run_about = pending
            pending = comment
            continue
        if struct is not None:
            if s.startswith("}"):
                struct["name"] = s.strip("}; ").strip() or struct["name"]
                section["items"].append(struct)
                struct = None
                group = None
                pending = ""
            elif s.startswith("#"):
                pass
            elif s:
                inline = ""
                m = re.search(r"/\*(.*?)\*/", s)
                if m:
                    inline = m.group(1).strip()
                    s = (s[: m.start()] + s[m.end():]).strip()
                decl = (decl + " " + s).strip()
                if decl.endswith(";"):
                    item = member(decl[:-1].strip())
                    about = _flat(inline or pending)
                    if about or group is None:
                        group = {"about": about, "since": since(about) or struct["since"], "members": []}
                        struct["groups"].append(group)
                    group["members"].append(item)
                    decl = ""
                    pending = ""
            else:
                group = None
                pending = ""
            i += 1
            continue
        if not s:
            run = None
            run_about = "" if pending == "" else run_about
            i += 1
            continue
        if s.startswith("#define") and not re.match(r"#define\s+OPENRAC_\w*_H\b", s):
            m = re.match(r"#define\s+(\w+)(\([^)]*\))?\s*(.*)", s)
            name, args, value = m.group(1), m.group(2) or "", m.group(3)
            inline = ""
            cm = re.search(r"/\*(.*?)\*/", value)
            if cm:
                inline = cm.group(1).strip()
                value = (value[: cm.start()] + value[cm.end():]).strip()
            body = [value.rstrip("\\").rstrip()]
            while lines[i].rstrip().endswith("\\"):
                i += 1
                body.append(lines[i].rstrip().rstrip("\\").rstrip())
            about = _flat(inline or pending)
            if args:
                section["items"].append({"kind": "macro", "name": name, "params": [p.strip() for p in args[1:-1].split(",") if p.strip()],
                                         "body": "\n".join(b for b in body if b.strip()), "about": about, "since": since(about)})
                run = None
            else:
                existing = next((it for it in section["items"] if it.get("kind") == "constants"
                                 for c in it["items"] if c["name"] == name), None)
                if existing:  # a platform's own spelling (#if ... #else)
                    for c in existing["items"]:
                        if c["name"] == name:
                            c["values"].append(value)
                else:
                    if run is None:
                        run = {"kind": "constants", "about": _flat(run_about), "since": since(run_about), "items": []}
                        section["items"].append(run)
                    run["items"].append({"name": name, "values": [value] if value else [], "about": about,
                                         "since": since(about) or run["since"]})
            pending = ""
        elif re.match(r"typedef\s+struct\s+\w+\s*\{", s):
            name = re.match(r"typedef\s+struct\s+(\w+)", s).group(1)
            about = _flat(pending)
            struct = {"kind": "struct", "name": name, "about": about, "since": since(about), "groups": []}
            pending, decl, group, run = "", "", None, None
        elif s.startswith("typedef"):
            full = s
            while not full.endswith(";"):
                i += 1
                full += " " + lines[i].strip()
            full = " ".join(full.split()).replace("( ", "(").replace(" )", ")")
            about = _flat(pending)
            fp = re.match(r"typedef\s+(.+?)\(\s*\*\s*(\w+)\s*\)\s*\((.*)\);$", full)
            if fp:
                section["items"].append({"kind": "callback", "name": fp.group(2), "decl": full, "returns": fp.group(1).strip(),
                                         "params": split_params(fp.group(3)), "about": about, "since": since(about)})
            else:
                nm = re.search(r"(\w+)\s*;$", full)
                section["items"].append({"kind": "type", "name": nm.group(1) if nm else full, "decl": full,
                                         "about": about, "since": since(about)})
            pending, run = "", None
        elif s.startswith("#") or s.startswith(("extern", "}")):
            pass
        else:
            pending = ""
        i += 1
    out["sections"] = [s for s in out["sections"] if s["items"]]
    return out


HOOK_MACRO = re.compile(r'#define\s+(\w+)_HOOK_(\w+)\s+"([^"]+)"')


def game_header(text: str) -> dict:
    """A game's C header (games/<game>.h): the hook points with a C type of their own."""
    names = {}
    for m in HOOK_MACRO.finditer(text):
        names[m.group(3)] = {"macro": f"{m.group(1)}_HOOK", "type": f"{m.group(1).lower()}_{m.group(2)}"}
    for m in re.finditer(r"typedef\s+(.+?)\(\s*\*\s*(\w+)\s*\)\s*\((.*?)\);", text, re.S):
        for v in names.values():
            if v["type"] == m.group(2):
                v["returns"] = " ".join(m.group(1).split())
                v["params"] = split_params(m.group(3))
    return names
