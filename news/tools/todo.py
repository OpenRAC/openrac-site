#!/usr/bin/env python3
"""Lists finished weeks that have no written report, newest first, and any being written in an open pull request."""
from __future__ import annotations

import json
import re
import subprocess
import sys

from common import ROOT, build_index


def in_progress() -> dict[str, int]:
    """Weeks with a report in an open pull request. Empty when the GitHub CLI is unavailable."""
    try:
        out = subprocess.run(["gh", "pr", "list", "-R", "OpenRAC/openrac-site", "--state", "open", "--limit", "100", "--json", "number,files"], capture_output=True, text=True, check=True, cwd=ROOT).stdout
    except (OSError, subprocess.CalledProcessError):
        print("note: could not list open pull requests here; check them on GitHub so you don't duplicate a report", file=sys.stderr)
        return {}
    found: dict[str, int] = {}
    for pr in json.loads(out):
        for f in pr.get("files") or []:
            m = re.match(r"^news/reports/(\d{4}-W\d{2})/report\.json$", f.get("path", ""))
            if m:
                found[m.group(1)] = pr["number"]
    return found


def main() -> int:
    build_index()
    taken = in_progress()
    missing = 0
    for entry in json.loads((ROOT / "data" / "index.json").read_text(encoding="utf-8"))["weeks"]:
        if entry["report"] or not entry["finished"]:
            continue
        totals = json.loads((ROOT / "data" / "weeks" / f"{entry['week']}.json").read_text(encoding="utf-8"))["totals"]
        if not (totals["commits"] or totals["pullRequestsMerged"] or totals["pullRequestsOpened"]):
            continue  # a quiet week has nothing to write about
        missing += 1
        note = f"  (in pull request #{taken[entry['week']]})" if entry["week"] in taken else ""
        print(f"{entry['week']}  {entry['start']} to {entry['end']}  {totals['commits']} commits, {totals['pullRequestsMerged']} merged{note}")
    if not missing:
        print("Nothing to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
