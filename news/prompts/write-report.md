# Prompt for writing a report

Replace `<WEEK>` with a week from `python3 news/tools/todo.py`. A busy week's facts are up to about 30,000 characters, which your tool counts against your usage.

**If your tool works in this repository** (Claude Code, Codex, Cursor, Gemini CLI), paste:

```text
Write the OpenRAC News report for <WEEK>. Follow news/AGENTS.md exactly. Then show me
the report and stop, so I can read it. Do not commit, push or open a pull request.
```

**If you use a chat with no access to your files:**

1. Run `python3 news/tools/brief.py <WEEK> --for-chat` and paste its whole output into the chat. It holds the writing rules and the facts.
2. Save the reply as `news/reports/<WEEK>/report.json`, and set `author` to your GitHub login.
3. Run `python3 news/tools/check.py`, and paste any problems back into the chat to fix.
