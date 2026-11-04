import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import snapshot  # noqa: E402
from common import day_of, days_back, is_day, last_finished_day  # noqa: E402
from datetime import datetime, timezone  # noqa: E402

DAY = "2026-11-03"


def commit(sha, date, parents=(), title="work", login="alice"):
    return {
        "sha": sha,
        "parents": [{"sha": p} for p in parents],
        "author": {"login": login},
        "commit": {"message": f"{title}\n\nbody\nCo-Authored-By: x", "author": {"name": login}, "committer": {"date": date}},
    }


def report(done, total=100):
    return json.dumps({"measures": {"matched_code": str(done), "total_code": str(total), "matched_functions": done, "total_functions": total}}).encode()


class Fake:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __call__(self, url, headers):
        self.calls.append(url)
        for key, value in self.routes.items():
            if key in url:
                return value if isinstance(value, tuple) else (200, json.dumps(value).encode(), "")
        return 404, b"{}", ""


TRACKING = {"org": "O", "projects": [{"repo": "game", "title": "Game", "branches": ["main"], "progress": "progress/report.json"}]}


class RateLimits(unittest.TestCase):
    def test_retry_after(self):
        self.assertEqual(snapshot.rate_limit_wait(429, {"Retry-After": "30"}, 0), 30)
        self.assertEqual(snapshot.rate_limit_wait(403, {"Retry-After": "5"}, 0), 5)

    def test_reset_time(self):
        self.assertEqual(snapshot.rate_limit_wait(403, {"X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "160"}, 100), 60)
        self.assertEqual(snapshot.rate_limit_wait(403, {"X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "50"}, 100), 0)

    def test_other_refusals_are_not_rate_limits(self):
        self.assertIsNone(snapshot.rate_limit_wait(403, {"X-RateLimit-Remaining": "12"}, 0))
        self.assertIsNone(snapshot.rate_limit_wait(404, {"Retry-After": "5"}, 0))
        self.assertIsNone(snapshot.rate_limit_wait(500, {}, 0))


class Days(unittest.TestCase):
    def test_is_day(self):
        self.assertTrue(is_day("2026-11-03"))
        for bad in ("2026-02-30", "2026-1-3", "../etc", "2026-11-03/x"):
            self.assertFalse(is_day(bad))

    def test_day_is_utc(self):
        self.assertEqual(day_of("2026-11-03T23:59:59Z"), DAY)
        self.assertEqual(day_of("2026-11-04T00:30:00+02:00"), DAY)

    def test_today_is_never_finished(self):
        self.assertEqual(last_finished_day(datetime(2026, 11, 4, 0, 15, tzinfo=timezone.utc)), DAY)
        self.assertEqual(days_back(2, DAY), ["2026-11-02", DAY])


class FirstParent(unittest.TestCase):
    def test_side_branch_commits_are_left_out(self):
        line = snapshot.first_parent_line([
            commit("m", f"{DAY}T10:00:00Z", ["a", "side"]),
            commit("side", f"{DAY}T09:00:00Z", ["old"]),
            commit("a", f"{DAY}T08:00:00Z", ["old"]),
        ])
        self.assertEqual([c["sha"] for c in line], ["m", "a"])

    def test_empty(self):
        self.assertEqual(snapshot.first_parent_line([]), [])


class Progress(unittest.TestCase):
    def test_counts_may_be_strings(self):
        self.assertEqual(snapshot.progress_of(json.loads(report(5)))["code"], {"done": 5, "total": 100})

    def test_impossible_figures_are_dropped(self):
        self.assertIsNone(snapshot.progress_of({"measures": {"matched_code": 9, "total_code": 5}}))
        self.assertIsNone(snapshot.progress_of({}))
        self.assertIsNone(snapshot.progress_of([]))


class Facts(unittest.TestCase):
    def routes(self):
        pr = lambda n, created, merged=None, body="", **k: {"number": n, "title": f"  PR {n} ", "user": {"login": k.get("who", "alice")}, "created_at": created, "closed_at": merged, "body": body, "pull_request": {"merged_at": merged}}
        return {
            "/commits?": [commit("c2", f"{DAY}T20:00:00Z", ["c1"]), commit("c1", f"{DAY}T01:00:00Z", ["c0"]), commit("c0", "2026-11-02T22:00:00Z", ["z"], login="dependabot[bot]")],
            "/issues?": [
                pr(1, "2026-10-30T00:00:00Z", f"{DAY}T05:00:00Z", body="x" * 5000),
                pr(2, f"{DAY}T06:00:00Z", who="bob"),
                pr(3, "2026-11-02T06:00:00Z"),
                {"number": 9, "title": "bug", "user": {"login": "carol"}, "created_at": f"{DAY}T07:00:00Z", "closed_at": None},
                {"number": 8, "title": "old", "user": None, "created_at": "2026-01-01T00:00:00Z", "closed_at": f"{DAY}T07:00:00Z"},
            ],
            "/releases?": [
                {"tag_name": "v1", "name": "One", "published_at": f"{DAY}T03:00:00Z"},
                {"tag_name": "dev", "name": "dev", "published_at": f"{DAY}T03:00:00Z", "prerelease": True},
                {"tag_name": "v0", "name": None, "published_at": "2026-10-01T03:00:00Z"},
            ],
            "/c0/progress/report.json": (200, report(10), ""),
            "/c2/progress/report.json": (200, report(12), ""),
        }

    def facts(self):
        return snapshot.day_facts(snapshot.GitHub(fetch=Fake(self.routes())), TRACKING, DAY, "2026-11-02")

    def test_a_day_is_what_landed_that_day(self):
        f = self.facts()
        p = f["projects"][0]
        self.assertEqual([c["sha"] for c in p["branches"][0]["commits"]], ["c2", "c1"])
        self.assertEqual(p["branches"][0]["commits"][0]["title"], "work")
        self.assertEqual([x["number"] for x in p["pullRequests"]["merged"]], [1])
        self.assertEqual([x["number"] for x in p["pullRequests"]["opened"]], [2])
        self.assertEqual([x["number"] for x in p["issues"]["opened"]], [9])
        self.assertEqual([x["number"] for x in p["issues"]["closed"]], [8])
        self.assertEqual(p["releases"], [{"tag": "v1", "name": "One", "publishedAt": f"{DAY}T03:00:00Z"}])
        self.assertEqual(p["pullRequests"]["merged"][0]["mergedAt"], f"{DAY}T05:00:00Z")
        self.assertNotIn("mergedAt", p["pullRequests"]["opened"][0])
        self.assertEqual(f["totals"], {"commits": 2, "pullRequestsMerged": 1, "pullRequestsOpened": 1, "contributors": 2})

    def test_progress_spans_the_day(self):
        p = self.facts()["projects"][0]["progress"]
        self.assertEqual((p["before"]["code"]["done"], p["after"]["code"]["done"]), (10, 12))

    def test_quiet_day_has_no_progress_request(self):
        fake = Fake({**self.routes(), "/commits?": []})
        p = snapshot.day_facts(snapshot.GitHub(fetch=fake), TRACKING, DAY, DAY)["projects"][0]
        self.assertIsNone(p["progress"])
        self.assertFalse([u for u in fake.calls if "report.json" in u])

    def test_bodies_are_capped_and_labelled(self):
        pr = self.facts()["projects"][0]["pullRequests"]["merged"][0]
        self.assertEqual(len(pr["untrustedBody"]), snapshot.BODY_LIMIT)
        self.assertEqual(pr["title"], "PR 1")

    def test_same_data_gives_the_same_facts(self):
        self.assertEqual(self.facts(), self.facts())

    def test_errors_stop_the_run(self):
        gh = snapshot.GitHub(fetch=Fake({"/commits?": (500, b"down", "")}))
        with self.assertRaises(RuntimeError):
            snapshot.day_facts(gh, TRACKING, DAY, DAY)

    def test_a_broken_progress_file_costs_only_that_figure(self):
        fake = Fake({**self.routes(), "/c2/progress/report.json": (200, b"not json", "")})
        project = snapshot.day_facts(snapshot.GitHub(fetch=fake), TRACKING, DAY, "2026-11-02")["projects"][0]
        self.assertIsNone(project["progress"])
        self.assertEqual(project["commitCount"], 2)

    def test_every_page_is_read(self):
        routes = {"page=2": [commit("b", f"{DAY}T00:00:00Z")], "/commits?": (200, json.dumps([commit("a", f"{DAY}T01:00:00Z", ["b"])]).encode(), '<https://api.github.com/repos/O/game/commits?page=2>; rel="next"')}
        gh = snapshot.GitHub(fetch=Fake(routes))
        self.assertEqual(len(gh.commits("O", "game", "main", DAY)), 2)


if __name__ == "__main__":
    unittest.main()
