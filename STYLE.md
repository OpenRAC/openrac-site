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
- Text: `hi` for headings, `body` for reading text, `soft` for secondary text, `dim` for the quietest text.
- Gold text sits on dark only. On a gold fill, the text is dark (`#1b1206`).

## Corners

- Buttons, fields, chips, tabs, small boxes: `rounded-md` (6 px).
- Badges and tags inside text: `rounded` (4 px).
- Cards, panels, pictures, dialogs: `rounded-xl` (12 px). Nothing bigger.
- Round (`rounded-full`) only for things that are really round: avatars, dots, icon-only circle buttons,
  count bubbles.

## No borders

- Buttons, fields, chips, tabs and badges have no border. A fill sets them apart.
- Cards and panels have no border either: their fill is a little lighter than the page (`.surface`, or
  `bg-panel`).
- On or picked: a gold tint and gold text (`aria-pressed="true"` or `data-on` on `.btn`/`.chip`, which do
  this for you). Do not add a gold border.
- Focus on a field: a 2 px gold ring inside it (`.field` does it). Other elements use the browser's focus
  outline.
- A thin 1 px line (`border-line`) is fine only to split things: table rows, a list, a bar from the page,
  a code block's head. Never around a control.
- Notes and warnings are a tinted box (`rounded-xl bg-amber/10 px-4 py-3`), with no coloured stripe.
- Two decorations stay: the gold corner brackets on the download cards (a game's target frame) and the
  gold bar beside a pull quote. Do not copy them onto other things.

## Buttons

- Main action (one per view): `.btn btn-primary`, a flat gold fill with dark text.
- Other actions: `.btn`, a dark grey fill with light text. `.btn-ghost` has no fill until hovered.
- `.btn-sm` for buttons inside cards and rows.
- On hover a button lifts 2 px and gets a little lighter. No colour changes besides that.
- A link that reads as text ("Other systems →") stays text: no fill.

## Header bar

- The bar is gold (`bar-stripes`). Everything on it is dark: dark text, dark logo.
- Mods and Download are two separate buttons, each a light shade of the bar (`bg-black/15`,
  `rounded-md`). The open page is a dark button with gold text.
- The search field matches them: same height (36 px), same fill, same corners.

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
