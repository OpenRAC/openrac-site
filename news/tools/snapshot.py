#!/usr/bin/env python3
"""
Records what happened on each tracked project on a finished UTC day, in data/days/<day>/facts.json.

A commit belongs to the day it landed: the commit date of the branch's first-parent line, whatever
date its side branch carried. Pull requests and issues count on the day they were opened, merged or
closed. Nothing here uses AI. Output has no timestamps, so a second run over the same data changes nothing.

Usage: snapshot.py                 the last finished week
       snapshot.py --since YYYY-MM-DD [--last YYYY-MM-DD]
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable

from common import FORMAT, ROOT, build_index, day_of, days_back, dump, is_day, last_finished_day, last_finished_week, load_tracking, week_days, write_if_changed

API = "https://api.github.com"
RAW = "https://raw.githubusercontent.com"
BODY_LIMIT = 1000  # characters of a pull request's description kept for the people writing reports
USER_AGENT = "openrac-news-snapshot"
MAX_WAIT = 120  # seconds worth waiting out a rate limit; past that the run fails, and the next one catches up


def token() -> str | None:
    found = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if found:
        return found.strip()
    try:
        return subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, check=True).stdout.strip() or None
    except (OSError, subprocess.CalledProcessError):
        return None


def rate_limit_wait(status: int, headers: Any, now: float) -> float | None:
    """How long GitHub asks us to wait before retrying, or None when this is not a rate limit."""
    if status not in (403, 429):
        return None
    after = headers.get("Retry-After")
    if after and str(after).isdigit():
        return float(after)
    if headers.get("X-RateLimit-Remaining") == "0" and str(headers.get("X-RateLimit-Reset", "")).isdigit():
        return max(0.0, float(headers["X-RateLimit-Reset"]) - now)
    return None


class GitHub:
    """Small, memoising GitHub client. `fetch(url, headers)` returns (status, bytes, link header)."""

    def __init__(self, fetch: Callable[[str, dict[str, str]], tuple[int, bytes, str]] | None = None, auth: str | None = None):
        self.fetch = fetch or self._fetch
        self.headers = {"Accept": "application/vnd.github+json", "User-Agent": USER_AGENT, "X-GitHub-Api-Version": "2022-11-28"}
        if auth:
            self.headers["Authorization"] = f"Bearer {auth}"
        self.memo: dict[str, Any] = {}

    @staticmethod
    def _fetch(url: str, headers: dict[str, str]) -> tuple[int, bytes, str]:
        for attempt in range(4):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as res:
                    return res.status, res.read(), res.headers.get("Link", "")
            except urllib.error.HTTPError as err:
                wait = rate_limit_wait(err.code, err.headers, time.time())
                if wait is not None and wait <= MAX_WAIT and attempt < 3:
                    time.sleep(wait + 1)
                    continue
                if err.code in (500, 502, 503, 504) and attempt < 3:
                    time.sleep(2 ** attempt)
                    continue
                return err.code, err.read(), ""
            except (urllib.error.URLError, TimeoutError):
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        raise RuntimeError(f"unreachable: {url}")

    def pages(self, path: str) -> list[dict]:
        """Every page of a list."""
        url: str | None = f"{API}{path}"
        out: list[dict] = []
        while url:
            status, body, link = self.fetch(url, self.headers)
            if status != 200:
                raise RuntimeError(f"{url} -> HTTP {status}: {body[:200]!r}")
            page = json.loads(body)
            out.extend(page)
            url = next((p.split(";")[0].strip(" <>") for p in link.split(",") if 'rel="next"' in p), None)
        return out

    def commits(self, org: str, repo: str, branch: str, since: str) -> list[dict]:
        key = f"commits:{repo}:{branch}:{since}"
        if key not in self.memo:
            q = urllib.parse.urlencode({"sha": branch, "since": f"{since}T00:00:00Z", "per_page": 100})
            self.memo[key] = self.pages(f"/repos/{org}/{repo}/commits?{q}")
        return self.memo[key]

    def issues(self, org: str, repo: str, since: str) -> list[dict]:
        """Issues and pull requests touched since a day: anything opened, merged or closed since is among them."""
        key = f"issues:{repo}:{since}"
        if key not in self.memo:
            q = urllib.parse.urlencode({"state": "all", "since": f"{since}T00:00:00Z", "sort": "updated", "direction": "desc", "per_page": 100})
            self.memo[key] = self.pages(f"/repos/{org}/{repo}/issues?{q}")
        return self.memo[key]

    def releases(self, org: str, repo: str) -> list[dict]:
        # All of them: the list is not in date order, as a build channel's release is republished in place.
        key = f"releases:{repo}"
        if key not in self.memo:
            self.memo[key] = self.pages(f"/repos/{org}/{repo}/releases?per_page=100")
        return self.memo[key]

    def measures(self, org: str, repo: str, sha: str, path: str) -> dict | None:
        """A project's own progress report as it stood at a commit, or None where it had none."""
        key = f"measures:{repo}:{sha}:{path}"
        if key not in self.memo:
            status, body, _ = self.fetch(f"{RAW}/{org}/{repo}/{sha}/{path}", {"User-Agent": USER_AGENT})
            if status == 404:
                self.memo[key] = None
            elif status != 200:
                raise RuntimeError(f"{repo}@{sha}/{path} -> HTTP {status}")
            else:
                try:
                    self.memo[key] = progress_of(json.loads(body))
                except ValueError:
                    # A project's own broken file costs that figure, not the whole day's facts.
                    print(f"warning: {repo}@{sha}/{path} is not valid JSON; no progress recorded", file=sys.stderr)
                    self.memo[key] = None
        return self.memo[key]


def progress_of(report: Any) -> dict | None:
    """Code, functions and data from an objdiff report's measures; None when they do not add up."""
    m = report.get("measures") if isinstance(report, dict) else None
    if not isinstance(m, dict):
        return None
    out: dict[str, dict[str, int]] = {}
    for name in ("code", "functions", "data"):
        done, total = m.get(f"matched_{name}", 0), m.get(f"total_{name}")
        try:
            done, total = int(done), int(total)
        except (TypeError, ValueError):
            continue
        if 0 <= done <= total and total > 0:
            out[name] = {"done": done, "total": total}
    return out if "code" in out else None


def first_parent_line(commits: list[dict]) -> list[dict]:
    """The branch's own line, newest first: from its head (no listed commit's parent), following each first parent."""
    parents_of_any = {p["sha"] for c in commits for p in c.get("parents") or []}
    head = next((c["sha"] for c in commits if c["sha"] not in parents_of_any), None)
    by_sha = {c["sha"]: c for c in commits}
    line, sha = [], head
    while sha in by_sha:
        c = by_sha.pop(sha)
        line.append(c)
        parents = c.get("parents") or []
        sha = parents[0]["sha"] if parents else ""
    return line


def commit_date(c: dict) -> str:
    return c["commit"]["committer"]["date"]


def commit_record(c: dict) -> dict:
    author = (c.get("author") or {}).get("login") or c["commit"]["author"]["name"]
    return {"sha": c["sha"], "title": c["commit"]["message"].split("\n", 1)[0].strip(), "author": author, "date": commit_date(c)}


def login(item: dict) -> str:
    return (item.get("user") or {}).get("login") or "ghost"


def pr_record(item: dict) -> dict:
    # The description stays for writers, capped; it is untrusted, and the website never reads it.
    body = (item.get("body") or "").strip()
    record = {"number": item["number"], "title": item["title"].strip(), "author": login(item), "untrustedBody": body[:BODY_LIMIT]}
    merged_at = (item.get("pull_request") or {}).get("merged_at")
    return {**record, "mergedAt": merged_at} if merged_at else record


def issue_record(item: dict) -> dict:
    return {"number": item["number"], "title": item["title"].strip(), "author": login(item)}


def is_bot(name: str) -> bool:
    return name.endswith("[bot]")


def project_facts(gh: GitHub, org: str, project: dict, day: str, since: str) -> dict:
    repo = project["repo"]
    branches, shas, authors = [], set(), set()
    progress = None
    for branch in project["branches"]:
        line = first_parent_line(gh.commits(org, repo, branch, since))
        landed = [c for c in line if day_of(commit_date(c)) == day]
        if landed and project.get("progress") and progress is None:
            first = landed[-1]
            parents = first.get("parents") or []
            before = gh.measures(org, repo, parents[0]["sha"], project["progress"]) if parents else None
            after = gh.measures(org, repo, landed[0]["sha"], project["progress"])
            if after:
                progress = {"before": before, "after": after}
        records = [commit_record(c) for c in landed]
        branches.append({"name": branch, "commits": records})
        shas.update(r["sha"] for r in records)
        authors.update(r["author"] for r in records)

    merged, opened, issues_opened, issues_closed = [], [], [], []
    for item in gh.issues(org, repo, since):
        pr = item.get("pull_request")
        if pr is not None:
            if pr.get("merged_at") and day_of(pr["merged_at"]) == day:
                merged.append(pr_record(item))
            if day_of(item["created_at"]) == day:
                opened.append(pr_record(item))
        else:
            if day_of(item["created_at"]) == day:
                issues_opened.append(issue_record(item))
            # A closed issue's date is its last closing; reopened ones have none.
            if item.get("closed_at") and day_of(item["closed_at"]) == day:
                issues_closed.append(issue_record(item))
    for group in (merged, opened):
        authors.update(p["author"] for p in group)
    for group in (merged, opened, issues_opened, issues_closed):
        group.sort(key=lambda x: x["number"])

    releases = [
        {"tag": r["tag_name"], "name": (r.get("name") or r["tag_name"]).strip(), "publishedAt": r["published_at"]}
        for r in gh.releases(org, repo)
        if r.get("published_at") and not r.get("draft") and not r.get("prerelease") and day_of(r["published_at"]) == day
    ]
    releases.sort(key=lambda r: r["tag"])
    return {
        "repo": repo,
        "title": project["title"],
        "branches": branches,
        "commitCount": len(shas),
        "pullRequests": {"merged": merged, "opened": opened},
        "issues": {"opened": issues_opened, "closed": issues_closed},
        "releases": releases,
        "progress": progress,
        "contributors": sorted((a for a in authors if not is_bot(a)), key=str.lower),
    }


def day_facts(gh: GitHub, tracking: dict, day: str, since: str) -> dict:
    projects = [project_facts(gh, tracking["org"], p, day, since) for p in tracking["projects"]]
    people = {a.lower(): a for p in projects for a in p["contributors"]}
    return {
        "format": FORMAT,
        "date": day,
        "totals": {
            "commits": sum(p["commitCount"] for p in projects),
            "pullRequestsMerged": sum(len(p["pullRequests"]["merged"]) for p in projects),
            "pullRequestsOpened": sum(len(p["pullRequests"]["opened"]) for p in projects),
            "contributors": len(people),
        },
        "projects": projects,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--last", default=None, help="last day to collect, with --since (default: yesterday, UTC)")
    ap.add_argument("--since", default=None, help="collect every day from this one on, instead of the last finished week")
    args = ap.parse_args(argv)
    newest = last_finished_day()
    last = args.last or newest
    for value in (last, args.since):
        if value is not None and not is_day(value):
            ap.error(f"not a day: {value}")
    if last > newest:
        ap.error(f"{last} has not finished yet; the last finished day is {newest}")
    if args.since:
        from datetime import date
        count = (date.fromisoformat(last) - date.fromisoformat(args.since)).days + 1
        if count < 1:
            ap.error("--since is after --last")
        days = days_back(count, last)
    else:
        days = week_days(last_finished_week())
    gh = GitHub(auth=token())
    tracking = load_tracking()
    for day in days:
        facts = day_facts(gh, tracking, day, days[0])
        changed = write_if_changed(ROOT / "data" / "days" / day / "facts.json", dump(facts))
        print(f"{day}: {facts['totals']['commits']} commits, {facts['totals']['pullRequestsMerged']} merged{' (updated)' if changed else ''}", file=sys.stderr)
    build_index()
    return 0


if __name__ == "__main__":
    sys.exit(main())
