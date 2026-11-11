# Style rules

How the site looks, in short rules. Follow them on every page so the home page, news, mods and docs look like
one site. The shared pieces live in `src/app/globals.css` (`.btn`, `.field`, `.chip`, `.seg`, `.surface` and
the `d-*` classes for the mod docs). Use them before writing new classes.

## Colour

- One accent: gold. `amber` (#f5c040) for actions, gold text and things that are on, `gold` (#ffe08f) for
  numbers and highlights, `brand` (#d6a020) for small labels and notes. No second accent colour (no mint,
  copper, blue or red). Discord's blue is used only for Discord.
- No grey, no brown, no white mix anywhere: never `bg-white/…`, `rgb(255 255 255 / …)` or a mid grey as a
  fill, and no brown control (`umber` and every brown tried were rejected). The only neutrals are the page greys
  and coals below. The exceptions are the thin dividing line (`border-line`, `w-px` dividers) and the clip progress
  bars on the home first screen: their track is `bg-white/20` (hover `bg-white/35`) so it shows on
  the dark page; the fill is gold.
- Text: `hi` for headings, `body` for reading text, `soft` for secondary text, `dim` for the quietest text.
  Gold text sits on dark only. On a gold fill, the text is dark (`#1b1206`).

### The page

- The page is dark neutral grey, never black and never navy: `ink` #131313, `ink-deep` #0e0e0e for the
  darkest parts (code blocks, inline code, badges, the footer). Every shade made from the page colour
  (the hero's gradients, halos) uses the same grey.
- Home sections alternate so they read apart. The hero melts into a dark Progress; after it every second
  section (Get involved, Recent activity, Resources, Our view on AI…) sits on a full-width band a little
  lighter than the page: `--color-band` #191919, drawn by `main.bands > section:nth-of-type(odd):not(:first-of-type)`.
  The band has hard edges, no gradient.

### Cards and panels

- Every card and panel (`.surface`, `.d-card`, `bg-panel`: FAQ, Resources, How it works, Get involved,
  news, mods, docs, the day calendar) has a flat fill, no stripes (user): `--stripes` #1e1e1e, hover or
  open `--stripes-hi` #252525. No border. Mod cards are darker (#171717, hover #1c1c1c, user).
- On a lighter home band the cards turn darker than the band, so they still stand out: #131313 (hover
  #1e1e1e). The band section sets `--stripes` itself.
- No diagonal stripes anywhere on the page; the thin strip on top of a sheet is flat gold.
- The Legal notice at the bottom of the home page has no panel (user): a gold shield by its title, three short points in columns with a faint gold rule, then the trademark line in small text.

### Controls

- Controls (`.btn`, `.field`, `.chip`, `.seg`, the `d-*` controls, anything `bg-coal`) are filled with `coal`
  #272727 (`coal-hi` #313131 on hover), lighter than the cards (#1e1e1e) and mod cards (#171717), so they
  never blend in. No edge anywhere (user): `--color-edge` is transparent, kept so borders stay 1 px.
- Contrast rule: on the page or a card a control is `coal`; on a coal background (a dialog or sheet) it is
  navy `navy` #302d42 (`navy-hi` #3a3650 on hover).
- On or picked: a gold tint on the page's grey (`color-mix(amber 22 %, ink)`) with gold text
  (`aria-pressed="true"`, `aria-checked="true"` or `data-on` on `.btn`/`.chip`).
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
- Dialogs and sheets (site search, docs search, the mods sheet) are `coal`. No dialog has an edge.
  Their field is navy.
- Focus on a field: a 2 px gold ring inside it (`.field` does it). Other elements use the browser's focus
  outline.
- A thin 1 px line (`border-line`) is fine only to split things: table rows, a list, a bar from the page,
  a code block's head.
- Notes and warnings are a tinted box (`rounded-xl bg-amber/10 px-4 py-3`), with no coloured stripe.
- Two decorations stay: the gold corner brackets on the download cards (a game's target frame) and the
  gold bar beside a pull quote. Do not copy them onto other things.

## Buttons

- Main action (one per view): `.btn btn-primary`, a flat gold fill with dark text, no edge.
- Other actions: `.btn`, coal and light text, no edge. `.btn-ghost` has no fill until hovered
  (then coal).
- `.btn-sm` for buttons inside cards and rows.
- On hover a button lifts 2 px and gets a little lighter. No colour changes besides that.
- A link that reads as text stays text: no fill.

## Header bar

- The header has no bar of its own, as the launcher's: it lies over the page, fixed at the top, 50 px tall.
  At the very top of a page it sits 12 px lower and slides up to the edge once the page scrolls (300 ms
  ease-out, none for "reduce motion").
  The logo is light (`text`) with its mark in gold.
- A haze is always behind the header (`.site-haze`, user): the launcher's `blur(18px)` under the bar,
  then four weaker, taller layers (11, 6, 3, 1.5 px, each fading out over 16 px) so the blur thins out step
  by step to 96 px, and a tint of the page colour at 30 % easing out. At the very top the layers reach
  12 px further, with the header. Neither an edge nor a shadow shows, even where a browser drops the
  masks. Without `backdrop-filter` the tint is the page colour at 90 %. The haze is a sibling of the
  header: an element with a `view-transition-name` only blurs what is inside it.
- Its buttons (Mods, Download) and the search field are plain `coal` with gold text and no edge,
  `rounded-md`, `h-8.5` (34 px tall). The open page is filled gold with dark text, as the launcher's open tab.
- Phone bar icons (search, menu) are bare light marks.
- On the home page the top of the clip has a soft dark shade (160 px, page colour from 55 % to nothing), so
  the header's buttons never blend into a bright clip. It belongs to the clip and scrolls away with it.
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
  git. A clip that is not on the server drops out; with none at all the first screen is the plain page grey.
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
- A full-width picture at the top of a page (home clips, a mod's banner, a news week's header) is
  pulled up under the bar's place (`-mt-[50px]`, with 50 px more top padding), so it reaches the top
  edge behind the header. Never a dark strip above it.
- No game assets in git: no screenshots, video, logos or art from the games. They are served from
  `IMAGE_DIR`.

## Motion

- Short and calm: 0.2 s for hover, about 1.6 s for big fades.
- Text never shimmers or cycles colours: gold words are a plain `text-amber`.
- A full-bleed video or picture melts into the page at the bottom (an eased mask), never a hard edge.
- Everything that moves on its own respects `prefers-reduced-motion`.
- A link to another page opens it at the top; Back and Forward return to where the page was left
  (`ScrollReset`).

## Writing on the page

- Plain, short English. Say what something does, not how great it is.
- Every page's big title and the line right under it end with no full stop, like the home page (mods,
  install, news, news days, SDK docs leads, error and not-found pages). A title or line with several
  sentences keeps the stops between them and drops only the last one. A written week report's headline
  loses a trailing stop when shown. Text from mod authors (a mod's description) is shown as written.
