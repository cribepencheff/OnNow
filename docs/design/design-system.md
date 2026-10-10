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
- Edge the date pill, the follow circle on a Home poster card, and the poster cards themselves with a hairline of `image-control-edge` (white at 16%, the thinnest line the screen draws), as Apple TV does. One token for all three. The circle keeps the same material followed or not; only its white icon changes, a plus to a check (a transition between them may come later).

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
- Pick the backdrop from TMDB by ADR 0012: the show's highest-rated backdrop, textless first, then highest vote average, vote count as the tie-break. No episode stills on the hero.
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
- Button: full content width, 50 tall (a tad over the Apple TV reference, 47), `radius-pill`, `ink` fill, `bg` text in `button` (18): "Open in [service]". Page dots 16 below: 8 × 8, active `ink`, others `hairline`.
- "+": top right, 44 round, quiet: `bg` at 55% opacity, white plus icon.
- Tab bar: 83 tall, `surface` at 72% opacity with a background blur, `hairline` top edge; active tab `ink`, others `ink-subtle`.

Refinement round (2026-10-09, CRI-124, CRI-127), replacing the measurements above where they differ:

- Once the header has left with the scroll, a light dark gradient (no blur) under the status bar keeps the clock and icons readable over bright posters without smearing what scrolls under it.
- Experiment: the posters in the rows under the hero are dimmed (black at 40% over each poster) at rest, so the hero has more weight. Only the posters, not the row headings. The dimming eases off with the scroll and is gone when the first row's heading reaches the middle of the screen. Dimmed posters stay tappable. Home only.
- One screen margin across Home, `space-4` (16): the header, the hero's content and the rows line up on one left edge.
- A header over the hero: a 44 bar under the status bar, with a left slot (the app's logo, white, now; a back button later) and a right slot (later actions, such as a profile picture; empty for now). Apple TV style: at rest it sits over the hero; scrolling up, it leaves with the content, fading and blurring, and is gone once scrolled past; on a pull to refresh it stays put. Behind it, a gradient from `bg` at the top of the screen keeps the status bar and the logo legible on bright images.
- The image is zoomed out to fit between its top edge, 15 above the bottom of the top safe area, and the fixed bottom of the title (logo) slot, centred horizontally, using the backdrop's own aspect ratio: faces near the pill barely move, the top gains room and more of the image's width shows. The image's own strip above the heads stays sharp. Above its top edge, the same image mirrored upwards, fully blurred down to the seam so the mirror never reads, the blur fading out over 40 into the image. The top's blur is the image's own pixels (a blurred copy from TMDB's small w300 size), not a blur view, so it keeps the image's tone. A plain dark gradient sits behind the status bar and the logo row (`bg` at 55% at the top, 45% at the bottom of the safe area, 42% at the bottom of the logo row, out 40 below it), so the clock, the icons and the logo read on bright images (the logo at least 3:1 on the brightest slides); Below that seam, Apple TV style: the same image mirrored. A progressive blur starts on the image itself at the pill's top and is full by the seam, so the mirror's symmetry does not read; it ends near-solid in the image's own tone. A fade starts with the blur, stays light to the seam and runs into `bg` towards the page dots. No visible edge and no block behind any line of text. On Android, where the blur view does not run in Expo Go, a blurred copy of the image and its mirror shows through the same eased mask.
- During a swipe the slide's text (pill, title, episode line, button) fades out within the first 12% of the move and back in as the next slide lands, so only the images move.
- The hero ends about 100 above the tab bar, so the first row's heading and the top of its posters show below it. On a 390 × 844 screen, roughly: the pill's centre at 420, the button's at 590, the page dots at 645, 6 under the button's note line.
- The show's logo has 16 above and below it, more than the 8 between the other rows, so it has room.
- Above the logo, centred, a date pill in sentence case ("Today · Fri 9 Oct", "Today–Thu · 9–15 Oct") on `image-control-backdrop` with a background blur and an `image-control-edge` hairline.
- Under the logo, one episode line ("S2E4 · Blank Curtain"), with the IMDb rating in one chip ("IMDb 8.3") at its right end: a complement, not a focal point. The chip has the date pill's `image-control-edge` hairline and the episode line's colour (`ink-muted`) in Medium (500, since regular reads thin that small) at about 85% of its size (12), with tabular figures so it keeps its width from slide to slide.
- Poster rows: cards about 150 wide with 12 between them, two full cards and a peek of the third; every swipe rests with a card at the left margin. 32 above a row's heading, which is also the space between two rows; no control under a row. Swiped near its end a row appends its next cards, with two skeleton cards at the end while they are on their way. Posters fade in once loaded. The name on one line; "Airing this week" keeps the day on its own second line.

Open questions: whether "+" stays quiet (current proposal) and how to find the "newest" backdrop (the TMDB image list has no upload date; to be checked in the prototype).
