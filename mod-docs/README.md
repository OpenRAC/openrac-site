# Mod SDK docs

`/mods/docs` is the documentation of OpenRAC's mod SDK: the guides, the full API reference (the C
interface, the C++ layer, the Luau API, every hook point), a changelog, and tools to learn with (a
hook explorer that writes a starting mod, a manifest builder that checks as you type).

Nothing here is written by hand. The SDK lives in [OpenRAC/OpenRAC](https://github.com/OpenRAC/OpenRAC)
under `sdk/`, and each SDK release is a tag `sdk-v<version>` there. `tools/build.py` reads every such
tag and writes one file per release:

| File | What |
|---|---|
| `data/index.json` | the releases, newest first: version, tag, date, interface version |
| `data/<version>.json` | that release's docs: guides (`sdk/docs/*.md`), the C header read item by item, the C++ and Luau API, the hook points and fields, the keys, and what changed since the release before |
| `data/manifest-cases.json` | the newest release's manifest test vectors (`sdk/tests/manifests/cases.json`) |

The site builds every page from these files ahead of time. The version menu lists every release;
the newest one's pages have no version in their address (`/mods/docs/hooks`), older ones do
(`/mods/docs/1.10.0/hooks`).

## A new SDK release

Nothing to do. `.github/workflows/mod-docs-sync.yml` runs every day: it rebuilds `data/`, runs the
docs' tests against it, and commits it when a release was added. The next deploy shows it. To do it
by hand:

```sh
python3 mod-docs/tools/build.py                       # clones OpenRAC (blobs only), writes data/
python3 mod-docs/tools/build.py --source ../OpenRAC   # or from a clone you have, with its sdk-v* tags
python3 mod-docs/tools/build.py --check               # writes nothing, fails when data/ is stale
```

## How each part is read

- **C** (`sdk/include/openrac/openrac_mod.h`): `tools/cheader.py`. It keeps the header's sections (its
  banner comments), runs of constants, and the comment before each member. A member with no comment
  shares the one above it. "Since X.Y" in a comment is the badge.
- **C++ and Luau**: the SDK's own `sdk/tools/gen_reference.py`, from the newest release. The Luau
  members' text comes from the table in `sdk/docs/scripts.md`.
- **Hook points**: each release's own `sdk/tools/gen_binding.py`, as the SDK's reference pages are.
  The first releases (1.0.x) had no table yet: their `games/rac1.h` is read instead.
- **Examples**: real code only. For each name, the guides' code blocks and the SDK's example and
  template mods that use it.
- **Changelog**: the names each release added, changed or removed against the one before, and the
  commits that touched `sdk/` between the two tags.

The manifest builder checks in the browser with `src/lib/modDocs/manifest.ts`, a port of the SDK's
`check_manifest` (`sdk/tools/package_mod.py`). `src/lib/modDocs/manifest.test.ts` holds it to the
SDK's verdict on every case of `data/manifest-cases.json`, so a release that changes a rule fails
the daily sync until the port follows.
