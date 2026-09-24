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
- Draw the focus ring as a solid 2px `accent` ring; it holds 3:1 on every surface.
- Use `hairline` for dividers only, never as the only edge of a control.

## Type

- The typeface is the iOS system font (SF Pro). It is not bundled; the stack falls back to the platform sans.
- On Home the show's logo replaces the title. Use `display` for the title only when a show has no logo. `title` names a Show detail and the Calendar month; `headline` names cards and rows.
- Set badges in `label`, uppercase: "NEW TODAY · 1/2", "TOMORROW", "FINALE".
- Write English, with original show titles. Never show a time of day. Use the data's own words, made readable: "Renewal not announced", "Season 4 premiere · Fri 9 Jul 2027". No em dashes.

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
- Button: full content width, 52 tall, `radius-pill`, `ink` fill, `bg` text, 16 semibold: "Open in [service]". Page dots 16 below: 8 × 8, active `ink`, others `hairline`.
- "+": top right, 44 round, quiet: `bg` at 55% opacity, white plus icon.
- Tab bar: 83 tall, `surface` at 72% opacity with a background blur, `hairline` top edge; active tab `ink`, others `ink-subtle`.

Open questions: whether "+" stays quiet (current proposal) and how to find the "newest" backdrop (the TMDB image list has no upload date; to be checked in the prototype).
