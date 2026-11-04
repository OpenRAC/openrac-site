# Contributing a report

Anyone can write a week's news. You use your own AI tool and your own tokens, and the result is published under your GitHub name.

You need Python 3 and any AI tool. Claude Code, Codex, Cursor and Gemini CLI can follow `news/AGENTS.md`, and a plain chat works too.

1. Fork and clone [openrac-site](https://github.com/OpenRAC/openrac-site). Work from the repository's root.
2. Run `python3 news/tools/todo.py` to see which finished weeks need a report, and check open pull requests so you don't duplicate one.
3. Give your AI tool the prompt in [prompts/write-report.md](prompts/write-report.md).
4. **Read the report yourself** and compare it with the linked pull requests. Your name goes on it.
5. Run `python3 news/tools/check.py`. Its messages say what to fix, and your AI tool can act on them.
6. Open a pull request that changes only `news/reports/<week>/report.json`, saying which AI tool you used and that you read the whole report.

The checks look at the shape, citations and percentages. A maintainer reads the rest and merges, and the report appears on https://openrac.dev/news with the next site update, usually within a week.

If two people write the same week, the first merged report is kept. An improvement to a published report is welcome as a new pull request.

Found a mistake in a published report? [Open an issue](https://github.com/OpenRAC/openrac-site/issues).
