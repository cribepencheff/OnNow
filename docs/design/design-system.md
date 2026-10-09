# On Now design system (exported from the design canvas, 2026-09-24)

Source: the "On Now" design system and the "On Now Home" design canvas in
Claude. This file is the text version, so the repo and Claude Code have the
same reference. Tokens are in `tokens.json` next to this file.

On Now is a stripped, cinematic iOS app that answers one question in two seconds: which of my series have a new episode today. It should feel like standing in front of a cinema poster: one show fills the screen, the image carries the experience, and the text only says what is new. Everything else steps back. The app is dark only.

## Colour

- Paint every screen `bg`. Put cards, rows, sheets and the tab bar on `surface`; the search field, season tabs and quiet round buttons on `surface-raised`.
- Use `bg-tint` only for large ambient areas, like the glow behind the Home hero. It is the hint of colour, not a surface for content.
- Set text in `ink`, meta lines in `ink-muted`, and upcoming episodes and data credits in `ink-subtle`. All three hold 4.5:1 on every ground above.
- Over a show image, make the primary action a white pill: `ink` fill with `bg` text. The photo already brings the colour, so nothing on top of it is coloured. Spend `accent` only on the primary action of plain screens without an image, and on small status marks (the follow check, the calendar day line). If a view seems to need two accent elements, one of them is not primary.
- Put `on-accent` on accent fills, never white.
- Fill a destructive action (Unfollow, revealed by a swipe) with `destructive`, with `ink` text. Use it nowhere else.
- Draw the focus ring as a solid 2px `accent` ring; it holds 3:1 on every surface.
- Use `hairline` for dividers only, never as the only edge of a control.
- Put `image-control-backdrop` behind a small control drawn on an image, so it reads on light and busy images: the date pill on the Home hero (with a background blur), the follow circle on a poster card when not followed (no blur), the pull-to-refresh spinner over the hero.
- Edge the date pill, the follow circle on a Home poster card, and the poster cards themselves with a hairline of `image-control-edge` (white at 16%, the thinnest line the screen draws), as Apple TV does. One token for all three. A followed circle is filled with `surface-raised`, the same fill as "Following" in Show detail, with a white check; the icon on the circle is always white.

## Type

- The typeface is the iOS system font (SF Pro). It is not bundled; the stack falls back to the platform sans.
- Trial: button labels (`button`, for example "Open in [service]") are set in Manrope ExtraBold at -3% letter spacing, bundled with the app. Only the `button` family points at Manrope, so rolling back is one change.
- On Home the show's logo replaces the title. Use `display` for the title only when a show has no logo. `title` names a Show detail and the Calendar month; `headline` names cards and rows.
- Set badges in `label`, uppercase: "TOMORROW", "FINALE". The Home hero's date is a pill in sentence case instead (see Home below).
- Write English, with original show titles. Never show a time of day. Use the data's own words, made readable: "Future uncertain", "Season 3 · TBA", "Season 4 premiere · Fri 9 Jul 2027". No em dashes.

## Shape and space

- Round cards and sheets with `radius-lg`, small posters and stills with `radius-sm`. Every control is a pill: `radius-pill`.
- Keep `space-4` screen margins and card padding, `space-6` between sections, `space-2` between inline items, and `space-10` around the Home hero.

## Imagery

- Home is image led: a landscape backdrop runs edge to edge at the top and fades into `bg` at the bottom. The badge, logo, meta line and button sit on the fade, never on the busy part of the picture.
- Pick the backdrop from TMDB, textless images only. A show with a season airing now gets the newest backdrop; any other show gets the second most voted, or the most voted when there is only one.
- Pick the logo from TMDB: the most voted English logo, PNG preferred. Always tint it to one colour from the tokens, whatever its original colours: `ink` on images, `on-accent` on an accent fill. Logos in colour make the screen too busy.
- Fit the logo in a box of at most 240 × 88, left aligned, so wide and stacked logos both work.
- No logo: set the title in `display`. No image: show nothing, never a grey placeholder box.

## Iconography

- Use SF Symbols, as iOS does. The system has no icon set of its own yet.
- Service names appear as text, not logos, until each service's brand guidelines are checked.

## Home, direction B (chosen over A, the portrait poster)

Measured on a 390 × 844 screen, from the design canvas:

- Backdrop: full width, 580 tall from the top of the screen, cropped to fill (cover), centred.
- Fade: from 280 to 580, transparent `bg` to 75% `bg` at the middle to solid `bg` at 580.
- Content block on the fade: starts at 452, 24 side padding, 8 between items: badge (`label`, `ink-muted`), logo box (240 × 88), meta line (`meta`, `ink-muted`), then 16 down to the button.
- Button: full content width, 47 tall (Apple TV reference), `radius-pill`, `ink` fill, `bg` text in `button` (18): "Open in [service]". Page dots 16 below: 8 × 8, active `ink`, others `hairline`.
- "+": top right, 44 round, quiet: `bg` at 55% opacity, white plus icon.
- Tab bar: 83 tall, `surface` at 72% opacity with a background blur, `hairline` top edge; active tab `ink`, others `ink-subtle`.

Refinement round (2026-10-09, CRI-124, CRI-127), replacing the measurements above where they differ:

- One screen margin across Home, `space-4` (16): the header, the hero's content and the rows line up on one left edge.
- A header over the hero: a 56 bar under the status bar (room above and below the 20 tall logo), with a left slot (the app's logo, white, now; a back button later) and a right slot (later actions, such as a profile picture). Apple TV style: at rest it sits over the hero; scrolling up, it leaves with the content, fading and blurring, and is gone once scrolled past; on a pull to refresh it stays put. Behind it, a gradient from `bg` at the top of the screen keeps the status bar and the logo legible on bright images.
- The backdrop fills the whole hero and fades into `bg` at its bottom, with no visible edge and no block behind any line of text.
- The hero ends about 100 above the tab bar, so the first row's heading and the top of its posters show below it. On a 390 × 844 screen, roughly: the pill's centre at 420, the button's at 590, the page dots at 645, 6 under the button's note line.
- Above the logo, centred, a date pill in sentence case ("Today · Fri 9 Oct", "Today–Thu · 9–15 Oct") on `image-control-backdrop` with a background blur and an `image-control-edge` hairline.
- Under the logo, one episode line ("S2E4 · Blank Curtain"), with the IMDb rating in one chip ("IMDb 8.3") at its right end: a complement, not a focal point. The chip has the date pill's `image-control-edge` hairline and the episode line's weight and colour (`ink-muted`, regular) at about 85% of its size (12), with tabular figures so it keeps its width from slide to slide.
- Poster rows: cards about 150 wide, two full cards and a peek of the third; every swipe rests with a card at the left margin. The name on one line; "Airing this week" keeps the day on its own second line.

Open questions: whether "+" stays quiet (current proposal) and how to find the "newest" backdrop (the TMDB image list has no upload date; to be checked in the prototype).
