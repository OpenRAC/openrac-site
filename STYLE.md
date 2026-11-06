# Style rules

How the site looks, in short rules. Follow them on every page so the home page, news, mods and docs look like
one site. The shared pieces live in `src/app/globals.css` (`.btn`, `.field`, `.chip`, `.seg`, `.surface` and
the `d-*` classes for the mod docs). Use them before writing new classes.

## Colour

- One accent: gold. `amber` (#f5c040) for actions and things that are on, `gold` (#ffe08f) for numbers and
  highlights, `brand` (#d6a020) for small labels and notes. No second accent colour (no mint, copper, blue or
  red). Discord's blue is used only for Discord.
- Backgrounds are near-black with a hint of violet: `ink` for the page, `ink-deep` for the darkest parts,
  `panel` and `panel-hi` for raised things.
- Controls (buttons, fields, chips, tabs, small tags you can click, the bar's buttons and search, the corner
  dock) are filled with `coal` (#121212, `coal-hi` #1e1e1e on hover) with a 1 px gold edge (`edge`, amber at 70 %). The rule is
  contrast with the background: on the site's violet-navy ink a control is neutral `#121212`; where the
  background is neutral `#121212`, a control is navy (`#1d1b2a`). No brown fills, no mid greys, never
  `bg-white/…` or a white mix for a control.
- Text: `hi` for headings, `body` for reading text, `soft` for secondary text, `dim` for the quietest text.
- Gold text sits on dark only. On a gold fill, the text is dark (`#1b1206`).

## Corners

- Buttons, fields, chips, tabs, small boxes: `rounded-md` (6 px).
- Badges and tags inside text: `rounded` (4 px).
- Cards, panels, pictures, dialogs: `rounded-xl` (12 px). Nothing bigger.
- Round (`rounded-full`) only for things that are really round: avatars, dots, icon-only circle buttons,
  count bubbles.

## Edges

- Everything filled with `coal` (`.btn`, `.field`, `.chip`, `.seg`, the `d-*` controls, anything `bg-coal`,
  the corner dock) has a 1 px gold edge (`--color-edge`). The gold main button and ghost buttons have none.
  The bar's striped buttons have none either: the gold bar around them is their edge.
- Badges have no border; a fill sets them apart.
- Dialogs and sheets (site search, docs search, the mods sheet) are `coal` with the gold edge. Controls
  inside them turn navy (`navy` #1d1b2a, `navy-hi` #29253b on hover) so they still stand out; the edge stays.
- Hover on a list row, menu line or icon button is `hover:bg-coal` (no edge). A picked row is `bg-amber/12`.
- Inline code and badges sit on `ink-deep`, never a white mix.
- Cards and panels have no border either: their fill is a little lighter than the page (`.surface`, or
  `bg-panel`).
- On or picked: a gold tint on the page's ink with gold text (`aria-pressed="true"` or `data-on` on `.btn`/`.chip`, which do
  this for you). The gold edge stays as it is.
- Focus on a field: a 2 px gold ring inside it (`.field` does it). Other elements use the browser's focus
  outline.
- A thin 1 px line (`border-line`) is fine only to split things: table rows, a list, a bar from the page,
  a code block's head.
- Notes and warnings are a tinted box (`rounded-xl bg-amber/10 px-4 py-3`), with no coloured stripe.
- Two decorations stay: the gold corner brackets on the download cards (a game's target frame) and the
  gold bar beside a pull quote. Do not copy them onto other things.

## Buttons

- Main action (one per view): `.btn btn-primary`, a flat gold fill with dark text.
- Other actions: `.btn`, a `coal` fill with light text. `.btn-ghost` has no fill until hovered.
- `.btn-sm` for buttons inside cards and rows.
- On hover a button lifts 2 px and gets a little lighter. No colour changes besides that.
- A link that reads as text stays text: no fill.

## Header bar

- At the very top of a page the bar floats: inset 12 px, `rounded-xl`, as wide as the content. Once the page
  scrolls it docks to the top edge, full width. The home page's clip runs behind the floating bar.
- The bar is gold (`bar-stripes`). The logo is dark. Its buttons and search field carry the same stripes in
  coal (`coal-stripes`, `coal-stripes-hi` on hover; the dark stripes are faint, #181818 on #121212) with gold
  text and no edge. Both stripe sets are laid on
  the window (`background-attachment: fixed`), so a button's stripes continue the bar's exactly; keep
  angle and width (35deg, 20 px) the same in both.
- Mods and Download are two separate buttons, striped coal with gold text (`rounded-md`, `h-8.5`: 34 px tall).
  The open page has the lighter stripes (`coal-stripes-hi`) with light gold text.
- The search field matches them: same height, the same coal stripes, same corners, gold text.
- Phone bar icons (search, menu) stay bare dark marks on the stripes.
- The corner dock (News, GitHub, Discord) is `coal` too, with the gold edge.

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
