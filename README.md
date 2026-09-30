# OpenRAC website

The website of [OpenRAC](https://openrac.dev), an unofficial hub for community decompilation projects of the
*Ratchet & Clank* series. It shows, for every title, how far its decompilation has come.

Next.js (App Router) · TypeScript · Tailwind CSS 4 · everything is rendered on the server.

## How it works

The page is a server component. On the server it reads the state of each project from GitHub, renders plain
HTML and caches it; the browser gets finished HTML plus a few small scripts for the menu and animations.
No visitor ever calls GitHub. The page is rebuilt in the background at most every 5 minutes, the numbers are
cached for 10 minutes.

### How progress is counted

Every project is measured the same way, so the bars can be compared:

| Number | Meaning |
|---|---|
| **Functions matched** | functions whose code is verified identical to the retail build, out of all functions |
| **Code matched** | the same, weighted by size in bytes. The honest figure, because small functions are matched first |

Sources (see `src/lib/progress.ts`):

- **Ratchet & Clank**: `progress/report.json` (objdiff report) of [`Lynder063/rac1-decomp`](https://github.com/Lynder063/rac1-decomp).
- **Up Your Arsenal**: no report is published, so the numbers are derived from the sources of
  [`vetusmagnus/ratchet-uya-decomp`](https://github.com/vetusmagnus/ratchet-uya-decomp) (`src/lib/uya.ts`):
  `src/text.c` lists every function once as C, verified hand-written assembly, or `INCLUDE_ASM` (not done),
  and `tools/remaining_functions.tsv` gives the size of each function not done. Done = C + verified assembly,
  the same way objdiff counts it and the same headline as that project's README; the C-only count is shown
  underneath. The parser refuses input it does not recognise and the page then shows a clearly marked snapshot
  instead of a wrong number.

If GitHub cannot be reached, the last known snapshot (in `progress.ts`) is shown and labelled as such.

## Develop

```sh
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests of the progress parser
npm run lint
npm run build
```

Copy `.env.example` to `.env.local` to change settings. `GITHUB_TOKEN` is optional and only raises the GitHub API
rate limit for the activity feed; it stays on the server.

### Card backdrops

The title cards can show a backdrop from `public/img/` (`rac1-bg.webp`, `gc-bg.webp`, `uya-bg.webp`). Those
would be screenshots from the games, which are copyrighted, so **they are not part of this repository**
(`public/img/` is git-ignored). Without them the cards use a colour gradient. To use your own images, put
WebP files with those names (about 1600 px wide) in `public/img/` before building.

### Adding a title

Add an entry to `PROJECTS` in `src/lib/projects.ts`. If the project publishes progress, add a loader to
`src/lib/progress.ts`; a title without one is shown as "Not started".

## Deploy with Podman and Quadlet

```sh
# 1. put this repository (and your backdrops in public/img/) on the server, then build the image
podman build -t localhost/openrac:latest .

# 2. install the unit (rootless shown; rootful: /etc/containers/systemd/)
mkdir -p ~/.config/containers/systemd
cp deploy/openrac.container ~/.config/containers/systemd/

# 3. start it
systemctl --user daemon-reload
systemctl --user start openrac.service
loginctl enable-linger "$USER"      # once, so it starts at boot without a login
```

The container listens on `127.0.0.1:3000`; put your reverse proxy in front of it. It runs as a non-root user with
a read-only filesystem and all capabilities dropped; only the page cache (`/app/.next/cache`) is a writable
volume. A health check polls `/healthz`. Edit `SITE_URL` in the unit to match your domain.

To update: `git pull && podman build -t localhost/openrac:latest . && systemctl --user restart openrac.service`.

## Legal

OpenRAC is an independent fan project, not affiliated with or endorsed by Sony Interactive Entertainment or
Insomniac Games. "Ratchet & Clank" and related names are trademarks of their owners and are used only to
identify the games the linked projects study. This repository contains no game assets, code or binaries.

## License

[MIT](LICENSE)
