"""What the news tools share: paths, day and week arithmetic, reading and writing JSON, the generated files."""
from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORMAT = 1
DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
WEEK = re.compile(r"^(\d{4})-W(\d{2})$")


def is_day(text: str) -> bool:
    """A real calendar day written YYYY-MM-DD."""
    if not DAY.match(text):
        return False
    try:
        date.fromisoformat(text)
    except ValueError:
        return False
    return True


def last_finished_day(now: datetime | None = None) -> str:
    """Yesterday in UTC: today is not over, so it has no facts yet."""
    now = now or datetime.now(timezone.utc)
    return (now.astimezone(timezone.utc).date() - timedelta(days=1)).isoformat()


def days_back(count: int, last: str) -> list[str]:
    """The `count` days ending at `last`, oldest first."""
    end = date.fromisoformat(last)
    return [(end - timedelta(days=i)).isoformat() for i in range(count - 1, -1, -1)]


def day_of(timestamp: str) -> str:
    """The UTC day of a GitHub timestamp."""
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00")).astimezone(timezone.utc).date().isoformat()


def week_of(day: str) -> str:
    """The ISO week a day falls in, written 2026-W44. Its year can differ from the day's around New Year."""
    year, week, _ = date.fromisoformat(day).isocalendar()
    return f"{year}-W{week:02d}"


def is_week(text: str) -> bool:
    m = WEEK.match(text)
    if not m:
        return False
    try:
        date.fromisocalendar(int(m.group(1)), int(m.group(2)), 1)
    except ValueError:
        return False
    return True


def last_finished_week(now: datetime | None = None) -> str:
    """The newest ISO week whose Sunday is over, in UTC."""
    day = date.fromisoformat(last_finished_day(now))
    return week_of((day - timedelta(days=(day.weekday() + 1) % 7)).isoformat())


def week_days(week: str) -> list[str]:
    """A week's seven days, Monday first."""
    m = WEEK.match(week)
    assert m
    monday = date.fromisocalendar(int(m.group(1)), int(m.group(2)), 1)
    return [(monday + timedelta(days=i)).isoformat() for i in range(7)]


def load_tracking(root: Path = ROOT) -> dict:
    return json.loads((root / "config" / "tracking.json").read_text(encoding="utf-8"))


def dump(value: object) -> str:
    """JSON as every generated file is written, so unchanged data gives an unchanged file."""
    return json.dumps(value, indent=1, ensure_ascii=False) + "\n"


def write_if_changed(path: Path, text: str) -> bool:
    """Writes through a temporary file, so a run that dies midway never leaves half a file."""
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(temp, path)
    except BaseException:
        Path(temp).unlink(missing_ok=True)
        raise
    return True


def day_path(root: Path, day: str) -> Path:
    return root / "data" / "days" / day / "facts.json"


def report_path(root: Path, week: str) -> Path:
    return root / "reports" / week / "report.json"


def published_days(root: Path = ROOT) -> list[str]:
    """Every day with facts, newest first."""
    days = root / "data" / "days"
    if not days.is_dir():
        return []
    return sorted((p.name for p in days.iterdir() if is_day(p.name) and (p / "facts.json").is_file()), reverse=True)


def merge_items(groups: list[list[dict]]) -> list[dict]:
    """Items across days, one per number, without descriptions: writers read those in the day's facts."""
    merged: dict[int, dict] = {}
    for group in groups:
        for item in group:
            merged[item["number"]] = {k: item[k] for k in ("number", "title", "author", "mergedAt") if k in item}
    return [merged[n] for n in sorted(merged)]


def week_facts(week: str, days: list[dict]) -> dict:
    """A week's facts from its days' (oldest first): what the website shows, and what its report is checked against."""
    projects: dict[str, dict] = {}
    for facts in days:
        for p in facts["projects"]:
            projects.setdefault(p["repo"], {"repo": p["repo"], "title": p["title"], "parts": []})["parts"].append(p)
    out = []
    for entry in projects.values():
        parts = entry["parts"]
        with_progress = [p["progress"] for p in parts if p.get("progress")]
        progress = None
        if with_progress:
            # The figure before the week's first active day, and the one after its last.
            progress = {"before": with_progress[0].get("before"), "after": with_progress[-1]["after"]}
        people = {a.lower(): a for p in parts for a in p["contributors"]}
        out.append({
            "repo": entry["repo"],
            "title": entry["title"],
            "commitCount": sum(p["commitCount"] for p in parts),
            "activeDays": [days[i]["date"] for i, facts in enumerate(days) for p in facts["projects"] if p["repo"] == entry["repo"] and p["commitCount"]],
            "pullRequests": {
                "merged": merge_items([p["pullRequests"]["merged"] for p in parts]),
                "opened": merge_items([p["pullRequests"]["opened"] for p in parts]),
            },
            "issues": {
                "opened": merge_items([p["issues"]["opened"] for p in parts]),
                "closed": merge_items([p["issues"]["closed"] for p in parts]),
            },
            "releases": [r for p in parts for r in p["releases"]],
            "progress": progress,
            "contributors": sorted(people.values(), key=str.lower),
        })
    all_people = {a.lower() for p in out for a in p["contributors"]}
    dates = week_days(week)
    return {
        "format": FORMAT,
        "week": week,
        "start": dates[0],
        "end": dates[-1],
        "days": [d["date"] for d in days],
        "totals": {
            "commits": sum(p["commitCount"] for p in out),
            "pullRequestsMerged": sum(len(p["pullRequests"]["merged"]) for p in out),
            "pullRequestsOpened": sum(len(p["pullRequests"]["opened"]) for p in out),
            "contributors": len(all_people),
        },
        "projects": out,
    }


def build_index(root: Path = ROOT) -> bool:
    """Rewrites the generated files the website reads: each week's facts and data/index.json. True when any changed."""
    days = published_days(root)
    weeks: dict[str, list[str]] = {}
    for day in sorted(days):
        weeks.setdefault(week_of(day), []).append(day)
    changed = False
    entries = []
    for week in sorted(weeks, reverse=True):
        facts = [json.loads(day_path(root, d).read_text(encoding="utf-8")) for d in weeks[week]]
        changed |= write_if_changed(root / "data" / "weeks" / f"{week}.json", dump(week_facts(week, facts)))
        dates = week_days(week)
        entries.append({
            "week": week,
            "start": dates[0],
            "end": dates[-1],
            # A week is finished once its Sunday has facts, so this follows the data rather than the clock.
            "finished": dates[-1] in weeks[week],
            "report": report_path(root, week).is_file(),
        })
    index = {"format": FORMAT, "weeks": entries, "days": days}
    return write_if_changed(root / "data" / "index.json", dump(index)) or changed
