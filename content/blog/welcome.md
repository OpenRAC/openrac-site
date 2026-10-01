---
title: Welcome to the OpenRAC blog
date: 2026-09-30
summary: What this blog is for, and how the progress numbers on the front page are counted.
tags: [news, progress]
---

OpenRAC is a hub for community decompilation projects of the *Ratchet & Clank* series. The front page shows
how far each project has come. This blog is for everything that does not fit in a progress bar: what got
matched, what turned out to be hard, and how the tools work.

## How we count progress

Every project is measured the same way, so the bars can be compared:

- **Code matched** is the share of the game's code, weighted by size in bytes, that compiles to exactly the
  retail bytes. This is the headline number, and it is the same figure [decomp.dev](https://decomp.dev) shows.
- **Functions matched** is the share of functions. It always looks bigger, because small functions get
  matched first.

Where a project publishes an objdiff report, we read it. Projects like Ratchet & Clank and Up Your Arsenal
publish standard objdiff reports which are fetched directly from their repositories.

## Writing for this blog

Posts are plain Markdown files in `content/blog`, sent as pull requests like any other change. Each one starts
with a short header:

```yaml
---
title: A short title
date: 2026-09-30
summary: One or two sentences for the list page and link previews.
tags: [news]
---
```

A post with `draft: true` shows up while developing the site but is left out of the published site. Raw HTML
is ignored, and images must live in `public/blog`, so a post cannot pull in anything from another server.
