# OpenRAC News

The data behind [openrac.dev/news](https://openrac.dev/news). A GitHub job collects each finished week's facts with no AI, people write the reports with their own AI tools, and the site builds its pages from these files.

- Writing a report: [CONTRIBUTING.md](CONTRIBUTING.md)
- Instructions for AI tools: [AGENTS.md](AGENTS.md)

```sh
python3 news/tools/todo.py                       # finished weeks waiting for a report
python3 news/tools/brief.py 2026-W44 --template  # that week's facts, and a report to fill in
python3 news/tools/check.py                      # check every report
python3 news/tools/snapshot.py                   # collect the last finished week (needs a GitHub token or gh)
python3 news/tools/build_index.py                # rebuild the weekly files and the index
python3 -m unittest discover -s news/tools/tests
```

The idea comes from [bigbeno37's OpenRAC News](https://github.com/bigbeno37/OpenRACNews). This folder shares no code or data with it.
