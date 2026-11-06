# Style rules

How the site looks, in short rules. Follow them on every page so the home page, news, mods and docs look like
one site. The shared pieces live in `src/app/globals.css` (`.btn`, `.field`, `.chip`, `.seg`, `.surface` and
the `d-*` classes for the mod docs). Use them before writing new classes.

## Colour

- One accent: gold. `amber` (#f5c040) for actions, gold text and things that are on, `gold` (#ffe08f) for
  numbers and highlights, `brand` (#d6a020) for small labels and notes. No second accent colour (no mint,
  copper, blue or red). Discord's blue is used only for Discord.
- No grey, no brown, no white mix anywhere: never `bg-white/…`, `rgb(255 255 255 / …)` or a mid grey as a
  fill, and no brown control (`umber` and every brown tried were rejected). The only neutrals are the blacks
  and coals below. The one exception is the thin dividing line (`border-line`, `w-px` dividers).
- Text: `hi` for headings, `body` for reading text, `soft` for secondary text, `dim` for the quietest text.
  Gold text sits on dark only. On a gold fill, the text is dark (`#1b1206`).

### The page

- The page is black, never navy: `ink` #0a0a0a, `ink-deep` #050505 for the darkest parts (code blocks,
  inline code, badges). Every shade made from the page colour (the hero's gradients, halos) uses the same
  black.
- Home sections alternate so they read apart. The hero melts into a dark Progress; after it every second
  section (Get involved, Recent activity, Resources, Our view on AI…) sits on a full-width band a little
  lighter than the page: `--color-band` #111111, drawn by `main.bands > section:nth-of-type(odd):not(:first-of-type)`.
  The band has hard edges, no gradient.

### Cards and panels

- Every card and panel (`.surface`, `.d-card`, `bg-panel`: FAQ, Resources, How it works, Legal, Get involved,
  news, mods, docs, the day calendar) wears faint dark diagonal stripes, the same pattern as the bar's search
  field: `--stripes` = 35deg, 20 px bands, #151515 on #121212. Hover or open: `--stripes-hi` (#1c1c1c on
  #191919). They are a light background, never loud. No flat lighter panels, no border.
- On a lighter home band the card stripes turn darker than the band, so cards still stand out:
  #0a0a0a on #070707 (hover #161616 on #131313). The band section sets `--stripes` itself.
- Card stripes scroll with the card (no `fixed`); only the bar's stripes are fixed to the window.

### Controls

- Controls (`.btn`, `.field`, `.chip`, `.seg`, the `d-*` controls, anything `bg-coal`, the hero's
  "Launcher … is out" pill) are filled with `coal` #121212 (`coal-hi` #1e1e1e on hover) and have a 1 px gold
  edge: `--color-edge`, amber at 35 % (half strength; full gold is too loud).
- No edge on: the gold main button (`.btn-primary`), ghost buttons, the bar's striped buttons and search
  (the gold bar is their edge), the two search dialogs, and the corner dock with the News, GitHub and
  Discord icons.
- Contrast rule (also for the launcher and the game's menu, where themes change the background): on a
  black or navy background a control is #121212; on a #121212 background it is navy `navy` #1d1b2a
  (`navy-hi` #29253b on hover). So controls inside a coal dialog or sheet turn navy; the edge stays.
- On or picked: a gold tint on the page's black (`color-mix(amber 22 %, ink)`) with gold text
  (`aria-pressed="true"`, `aria-checked="true"` or `data-on` on `.btn`/`.chip`). The edge stays.
  A picked row in a list (search results, docs menu, hook explorer) is `bg-amber/12`.
- Hover on a list row, menu line, calendar day or icon button is `hover:bg-coal` (no edge).
- The "/" key hint is a small navy cap (`bg-navy`).

## Corners

- Buttons, fields, chips, tabs, small boxes: `rounded-md` (6 px). These corners stay whatever the look.
- Badges and tags inside text: `rounded` (4 px).
- Cards, panels, pictures, dialogs: `rounded-xl` (12 px). Nothing bigger.
- Round (`rounded-full`) only for things that are really round: avatars, dots, icon-only circle buttons,
  count bubbles, the hero's news pill.

## Lines and boxes

- Badges, tags (platform, region, "research"), progress-bar tracks and small icon tiles sit on `ink-deep`,
  never a white mix. Badges have no border.
- Inline code sits on `ink-deep` with gold text.
- Dialogs and sheets (site search, docs search, the mods sheet) are `coal`. The two search dialogs have no
  edge; the mods sheet keeps it. Their field is navy.
- Focus on a field: a 2 px gold ring inside it (`.field` does it). Other elements use the browser's focus
  outline.
- A thin 1 px line (`border-line`) is fine only to split things: table rows, a list, a bar from the page,
  a code block's head.
- Notes and warnings are a tinted box (`rounded-xl bg-amber/10 px-4 py-3`), with no coloured stripe.
- Two decorations stay: the gold corner brackets on the download cards (a game's target frame) and the
  gold bar beside a pull quote. Do not copy them onto other things.

## Buttons

- Main action (one per view): `.btn btn-primary`, a flat gold fill with dark text, no edge.
- Other actions: `.btn`, coal with the gold edge and light text. `.btn-ghost` has no fill until hovered
  (then coal).
- `.btn-sm` for buttons inside cards and rows.
- On hover a button lifts 2 px and gets a little lighter. No colour changes besides that.
- A link that reads as text stays text: no fill.

## Header bar

- At the very top of a page the bar floats: inset 12 px, `rounded-xl`, as wide as the content. Once the page
  scrolls it docks to the top edge, full width (an IntersectionObserver on a 12 px strip at the top, no
  scroll handler; 300 ms ease-out, none for "reduce motion"). The home page's clip runs behind the floating bar.
- The bar is gold stripes (`bar-stripes`: 35deg, 20 px, #c99222 and #bd8619). The logo is dark.
- Its buttons (Mods, Download) and search field continue the bar's stripes in coal (`coal-stripes`: #181818
  on #121212, faint; `coal-stripes-hi` #252525 on #1f1f1f on hover) with gold text and no edge. Both stripe
  sets are laid on the window (`background-attachment: fixed`), so a button's stripes continue the bar's
  exactly; keep angle and width the same in both.
- Mods and Download are two separate buttons, `rounded-md`, `h-8.5` (34 px tall). The open page has the
  lighter stripes with light gold text.
- The search field matches them: same height, stripes and corners, gold text, a navy "/" cap.
- Phone bar icons (search, menu) stay bare dark marks on the stripes.
- The corner dock (News, GitHub, Discord) sits bottom right, coal, with no edge. It rises over a mod
  page's install bar.

## Home first screen

- Title: "Ratchet & Clank" in plain `text-amber` (no shimmer), then "series, rebuilt from the original
  bytes" with no full stop. "original bytes" never breaks.
- Intro: "A hub for the community decompilations of Ratchet & Clank: readable source code that compiles to
  the original games' exact bytes". The gold phrases "readable source code" and "exact bytes" never break
  across lines; the paragraph is 660 px wide so it is two lines on a desktop.
- Buttons: the gold download for the visitor's system, then "See progress ↓" (`.btn`, scrolls smoothly to
  the progress cards, jumps for "reduce motion"), then the version and date.
- The stats HUD (top right, under the bar, hidden on phones): the big number in `text-amber`, labels in
  `text-body`, counts in amber. No hard text shadow; only a soft halo behind the letters so it reads on
  bright clips.
- The clips are served from the server (`IMAGE_DIR` through `/img/…`), like the card pictures; never from
  git. A clip that is not on the server drops out; with none at all the first screen is plain black.
- The clip melts into the page with an eased mask, never a hard line. The galaxies easter egg (Konami
  code) draws only to the right of the text on wide screens.

## Footer

- The footer's progress line ("Progress is read from the projects' repositories … progress.json · llms.txt")
  is one line on a desktop (`whitespace-nowrap` from 1080 px); it wraps only on narrower screens.

## Sizes and touch

- Anything you can tap is at least 40 x 40 px, even if it draws smaller (pad the hit area).
- Buttons and fields are 44 px tall (`.btn-sm` 40 px).
- Inputs use 16 px text or more, so phones do not zoom in.

## Phones (up to 700 px)

- Centre the first screen's text and buttons. Give it wider side margins (`px-7`) and more room between
  blocks.
- Hide extras that do not fit (the corner stats).
- No sideways scrolling. Check at 375 px.

## Pictures and video

- Text over a picture or video gets a dark gradient under it, and a soft text shadow
  (`[text-shadow:0_2px_24px_rgb(0_0_0/0.6)]`). Small text over video gets a soft dark glow behind it.
- Video is muted, plays inline, has a poster, and stops for "reduce motion".
- No game assets in git: no screenshots, video, logos or art from the games. They are served from
  `IMAGE_DIR`.

## Motion

- Short and calm: 0.2 s for hover, about 1.6 s for big fades.
- Text never shimmers or cycles colours: gold words are a plain `text-amber`.
- A full-bleed video or picture melts into the page at the bottom (an eased mask), never a hard edge.
- Everything that moves on its own respects `prefers-reduced-motion`.

## Writing on the page

- Plain, short English. Say what something does, not how great it is.
