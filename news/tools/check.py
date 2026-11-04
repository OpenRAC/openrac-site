#!/usr/bin/env python3
"""
Checks news/reports/<week>/ against that week's facts. It checks what a machine can: the shape, that
every cited pull request or issue is in the facts, and that percentages come from them. It cannot tell whether a sentence is true, which is why a person reads each report
before merging it.

Usage:
  check.py                                   check every report
  check.py --changed FILE [--author LOGIN]   also apply the pull request rules; FILE lists changed paths
  check.py --root DIR                        check another copy of news/ (CI runs the base branch's checker on the PR)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from common import FORMAT, ROOT, day_path, is_week, report_path, week_days

TITLE_MAX = 55
DESCRIPTION_MIN = 70
DESCRIPTION_MAX = 155
HEADLINE_MAX = 120
SUMMARY_MAX = 1200
PROJECT_SUMMARY_MAX = 800
HIGHLIGHTS_MAX = 8
HIGHLIGHT_MAX = 300
LOGIN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")
TOOL = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 .+_-]{0,39}$")
REF = re.compile(r"(?<![\w/#])(?:([A-Za-z0-9._-]+))?#(\d+)\b")
PERCENT = re.compile(r"(?<![\w.])(\d+(?:\.\d+)?)\s?%")
URL = re.compile(r"(?:https?://|www\.|\]\()", re.I)
REPORT_PATH = re.compile(r"^news/reports/(\d{4}-W\d{2})/report\.json$")


def refs_of(project: dict) -> set[int]:
    return {x["number"] for group in (*project["pullRequests"].values(), *project["issues"].values()) for x in group}


def text_fields(report: dict) -> list[tuple[str, str, str | None]]:
    """Every sentence-bearing field as (where, text, the project a bare #n belongs to)."""
    out = [("title", report.get("title", ""), None), ("description", report.get("description", ""), None), ("headline", report.get("headline", ""), None), ("summary", report.get("summary", ""), None)]
    projects = report.get("projects")
    for repo, section in (projects.items() if isinstance(projects, dict) else ()):
        if not isinstance(section, dict):
            continue
        out += [(f"{repo}.headline", section.get("headline", ""), repo), (f"{repo}.summary", section.get("summary", ""), repo)]
        for i, line in enumerate(section.get("highlights", []) if isinstance(section.get("highlights"), list) else []):
            out.append((f"{repo}.highlights[{i}]", line, repo))
    return out


def percent_options(progress: dict | None) -> set[float]:
    """Percentages the progress figures support, and the change between them."""
    if not progress or not progress.get("after"):
        return set()
    out: set[float] = set()
    for name, after in progress["after"].items():
        now = after["done"] / after["total"] * 100
        out.add(now)
        before = (progress.get("before") or {}).get(name)
        if before:
            was = before["done"] / before["total"] * 100
            # The exact change, and the one a reader gets from the two-decimal figures on the page.
            out |= {was, abs(now - was), abs(round(now, 2) - round(was, 2))}
    return out


def percent_found(figure: str, supported: set[float], factual_text: str) -> bool:
    decimals = len(figure.split(".")[1]) if "." in figure else 0
    value = float(figure)
    if any(round(option, decimals) == value for option in supported):
        return True
    # A figure a pull request or commit states itself, such as a slider's "120%".
    return re.search(rf"(?<![\w.]){re.escape(figure)}\s?%", factual_text) is not None


def all_text(value: object) -> str:
    if isinstance(value, dict):
        return "\n".join(all_text(v) for v in value.values())
    if isinstance(value, list):
        return "\n".join(all_text(v) for v in value)
    return value if isinstance(value, str) else ""


def check_report(report: object, facts: dict, week: str, day_text: str = "") -> list[str]:
    if not isinstance(report, dict):
        return ["a report must be a JSON object"]
    errors: list[str] = []
    allowed = {"format", "week", "author", "tool", "title", "description", "headline", "summary", "projects"}
    errors += [f"unknown field: {k}" for k in report if k not in allowed]
    if report.get("format") != FORMAT:
        errors.append(f"format must be {FORMAT}")
    if report.get("week") != week:
        errors.append(f"week must be {week}")
    if not (isinstance(report.get("author"), str) and LOGIN.match(report["author"])):
        errors.append("author must be a GitHub login")
    if not (isinstance(report.get("tool"), str) and TOOL.match(report["tool"])):
        errors.append("tool must name the AI tool used, in up to 40 plain characters")
    for key, limit in (("headline", HEADLINE_MAX), ("summary", SUMMARY_MAX)):
        value = report.get(key)
        if not (isinstance(value, str) and value.strip()):
            errors.append(f"{key} is required")
        elif len(value) > limit:
            errors.append(f"{key} is over {limit} characters")

    # What search results and link previews show. Written for that, so a page never shows text cut off mid-sentence.
    title, description = report.get("title"), report.get("description")
    if not (isinstance(title, str) and title.strip()):
        errors.append("title is required: the page's title in search results and link previews")
    elif len(title) > TITLE_MAX:
        errors.append(f"title is over {TITLE_MAX} characters, so search results would cut it off")
    if not (isinstance(description, str) and description.strip()):
        errors.append("description is required: the sentence shown in search results and link previews")
    elif not DESCRIPTION_MIN <= len(description) <= DESCRIPTION_MAX:
        errors.append(f"description must be {DESCRIPTION_MIN} to {DESCRIPTION_MAX} characters, and is {len(description)}")
    for key, value in (("title", title), ("description", description)):
        if isinstance(value, str) and "#" in value:
            errors.append(f"{key}: no citations here; it is shown outside the page, where they would not be links")

    by_repo = {p["repo"]: p for p in facts["projects"]}
    sections = report.get("projects")
    if not isinstance(sections, dict):
        errors.append("projects must be an object keyed by repository")
        sections = {}
    for repo, section in sections.items():
        project = by_repo.get(repo)
        if project is None:
            errors.append(f"projects.{repo}: not a tracked project")
            continue
        if not (project["commitCount"] or refs_of(project) or project["releases"]):
            errors.append(f"projects.{repo}: nothing happened there in {week}")
        if not isinstance(section, dict):
            errors.append(f"projects.{repo}: must be an object")
            continue
        errors += [f"projects.{repo}: unknown field: {k}" for k in section if k not in {"headline", "summary", "highlights"}]
        for key, limit in (("headline", HEADLINE_MAX), ("summary", PROJECT_SUMMARY_MAX)):
            value = section.get(key)
            if not (isinstance(value, str) and value.strip()):
                errors.append(f"projects.{repo}.{key} is required")
            elif len(value) > limit:
                errors.append(f"projects.{repo}.{key} is over {limit} characters")
        lines = section.get("highlights", [])
        if not isinstance(lines, list) or not all(isinstance(x, str) and x.strip() for x in lines):
            errors.append(f"projects.{repo}.highlights must be a list of sentences")
        else:
            if len(lines) > HIGHLIGHTS_MAX:
                errors.append(f"projects.{repo}.highlights has more than {HIGHLIGHTS_MAX} lines")
            errors += [f"projects.{repo}.highlights[{i}] is over {HIGHLIGHT_MAX} characters" for i, x in enumerate(lines) if len(x) > HIGHLIGHT_MAX]

    sources = {p["repo"]: all_text([p["pullRequests"], p["issues"], p["releases"]]) for p in facts["projects"]}
    every_figure = {x for p in facts["projects"] for x in percent_options(p.get("progress"))}
    for where, text, owner in text_fields(report):
        if not isinstance(text, str):
            continue
        if "<" in text or ">" in text:
            errors.append(f"{where}: no HTML or angle brackets")
        if URL.search(text):
            errors.append(f"{where}: no links; cite OpenRAC#123 and the site links it")
        for repo, number in REF.findall(text):
            target = repo or owner
            if target is None:
                errors.append(f"{where}: #{number} needs its repository here, as in OpenRAC#{number}")
            elif target not in by_repo:
                errors.append(f"{where}: {target}#{number}: not a tracked project")
            elif int(number) not in refs_of(by_repo[target]):
                errors.append(f"{where}: {target}#{number} is not in the facts for {week}")
        # A project's section answers to that project's facts; the week's text to all of them.
        supported = percent_options(by_repo[owner].get("progress")) if owner in by_repo else every_figure
        factual = (sources[owner] if owner in sources else "\n".join(sources.values())) + "\n" + day_text
        errors += [f"{where}: {figure}% is not in the facts for {week}" for figure in PERCENT.findall(text) if not percent_found(figure, supported, factual)]
    return errors


def check_week(root: Path, week: str) -> list[str]:
    path = report_path(root, week)
    if not is_week(week):
        return [f"{path}: {week} is not an ISO week"]
    facts_path = root / "data" / "weeks" / f"{week}.json"
    if not facts_path.is_file():
        return [f"{path}: there are no facts for {week}"]
    days = week_days(week)
    if not day_path(root, days[-1]).is_file():
        return [f"{path}: {week} has not finished: its Sunday has no facts yet"]
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        return [f"{path}: {err}"]
    day_text = ""
    for day in days:
        if day_path(root, day).is_file():
            facts = json.loads(day_path(root, day).read_text(encoding="utf-8"))
            day_text += all_text([[p["pullRequests"], p["branches"]] for p in facts["projects"]]) + "\n"
    errors = check_report(report, json.loads(facts_path.read_text(encoding="utf-8")), week, day_text)
    return [f"{week}: {e}" for e in errors]


def check_changes(root: Path, changed: list[str], author: str | None) -> list[str]:
    """A report pull request changes one week's report and nothing else. `changed` is from the repository's root."""
    errors = [f"{p}: generated; only the weekly job changes news/data/" for p in changed if p.startswith("news/data/")]
    report_paths = [p for p in changed if p.startswith("news/reports/")]
    if not report_paths:
        return errors
    errors += [f"{p}: a report pull request changes only news/reports/<week>/report.json" for p in changed if not p.startswith(("news/reports/", "news/data/"))]
    weeks = set()
    for p in report_paths:
        m = REPORT_PATH.match(p)
        if m:
            weeks.add(m.group(1))
        else:
            errors.append(f"{p}: only a report.json belongs in news/reports/<week>/")
    if len(weeks) > 1:
        errors.append(f"one report per pull request, please: this changes {', '.join(sorted(weeks))}")
    for week in weeks:
        path = report_path(root, week)
        if not path.is_file() or check_week(root, week):
            continue  # missing or invalid: reported on its own
        report_author = json.loads(path.read_text(encoding="utf-8")).get("author", "")
        if author and report_author.lower() != author.lower():
            errors.append(f"{path.name} in {week}: author is {report_author}, but this pull request is from {author}")
    return errors


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", type=Path, default=ROOT)
    ap.add_argument("--changed", type=Path, help="a file listing the paths this pull request changes, one per line")
    ap.add_argument("--author", help="the pull request's author")
    args = ap.parse_args(argv)
    errors: list[str] = []
    reports = args.root / "reports"
    weeks = sorted(p.name for p in reports.iterdir() if (p / "report.json").is_file()) if reports.is_dir() else []
    for week in weeks:
        errors += check_week(args.root, week)
    if args.changed:
        errors += check_changes(args.root, [x.strip() for x in args.changed.read_text(encoding="utf-8").splitlines() if x.strip()], args.author)
    for e in errors:
        print(f"error: {e}", file=sys.stderr)
    print(f"{len(weeks)} report(s) checked, {len(errors)} problem(s)")
    if weeks and not errors:
        print("This covers shape, citations and percentages. It can't tell whether a sentence is true: a person still has to read the report.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
