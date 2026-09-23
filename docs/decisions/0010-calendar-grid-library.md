# 0010. Calendar month grid: react-native-calendars instead of our own

Status: Deferred to the Design phase

## Context
CRI-67 built the Calendar month grid as our own component: a pure
`monthGridWeeks` function plus a hand-rolled `FlatList` week grid. A bug
reached Expo Go review because a single 42-cell `flexWrap` list let cell
width and rounding wrap row 1 to six cells instead of seven, shifting every
date one weekday column to the left from row 2 on. The immediate fix
(explicit week rows of exactly seven flex cells, CRI-67 follow-up) resolves
this specific bug, but it is exactly the kind of screen-size and rounding
edge case a general-purpose calendar grid has had years to run into and fix
across many real devices, and we have not.

The PRD requirements this grid must keep meeting: FR-008 (mark days with
episodes), FR-009 (day list below the grid), FR-012 (group same-day
episodes into one row), FR-036 (month paging, a "Today" button), FR-037
(no specials), NFR-001 (cached data first), NFR-008 (accessibility labels).
Design phase will also want close control over the grid's visual style,
since the app is meant to feel cinematic, not default-calendar.

## Options considered
- **react-native-calendars** (Wix). Pure JavaScript, no native module
  linking, documented as compatible with Expo/CRNA without ejecting: works
  in Expo Go as-is. Provides `firstDay` for locale week start, `markedDates`
  for marking days (FR-008), `enableSwipeMonths` / `onMonthChange` for
  paging (FR-036), `hideExtraDays` for blank cells outside the month (our
  existing REVIEW decision), and a `dayComponent` render prop for full
  custom rendering per day, so styling is not limited to a theme object.
  Widely used; one of the most established calendar libraries in the RN
  ecosystem.
- **flash-calendar**. Also pure JavaScript at its core (only dependency is
  `mitt`; its one peer dependency, `@shopify/flash-list` v2+, is itself
  native-module-free and Expo-compatible). Built for performance and has
  first-class Expo support called out by its author. However, from its
  current docs and README, it reads as a fast date-range picker and
  infinite-scroll calendar first; nothing in the available documentation
  confirms a ready-made "mark this day, list its items below" month view
  matching FR-008/FR-009 the way `markedDates` does. Newer and smaller
  community than react-native-calendars. Adopting it would need a spike to
  confirm it actually fits before committing.
- **Keep our own grid.** Full control, no dependency, and the specific bug
  that prompted this ADR is now fixed and unit-tested at the row-structure
  level. But every future edge case (very small or very large screen
  widths, accessibility quirks, RTL, leap years, dynamic type) is ours to
  find and fix one at a time, the same way this one was found: in Expo Go
  review, after the fact.

## What we learned from the attempt
CRI-76 switched the grid to react-native-calendars and got as far as owner
review in Expo Go before being backed out (see Decision). What that attempt
found, for when this is picked up again:
- `Calendar` with `enableSwipeMonths` swaps the visible month on swipe with
  no sliding transition: it just changes, which reads as broken next to the
  previous grid's real slide.
- `CalendarList` with `horizontal` + `pagingEnabled` does give a real,
  smooth sliding transition between months. But it needed real header
  setup to use well: its own per-page header (title and weekday names)
  duplicates by design, once as a "static" fixed overlay and once inside
  each page, meant to be hidden behind the static one. Making the grid
  background match the app's own (rather than the library's default white)
  broke that hiding, and the static header's title updates the instant a
  swipe crosses a visibility threshold, not once the new page has settled,
  which does not match a "one fixed header" feel regardless of the
  background. Getting to one clean, correctly-timed header meant fully
  suppressing the library's own per-page header and building a separate,
  external fixed title/weekday row of our own instead, which works but is
  a real amount of composition on top of the library, not a documented
  built-in mode.
- Matching the previous grid's exact look (today's ring, the selected
  fill, the has-episodes mark, blank adjacent-month cells) needed a custom
  `dayComponent` throughout, plus explicit theme and padding overrides to
  keep the weekday row aligned with the grid's own columns. None of this
  was free; all of it was necessary just to reach parity with what the PoC
  already had.
- Once the week-row fix landed, our own grid met every PoC requirement
  above (FR-008, FR-009, FR-012, FR-036, FR-037, NFR-001, NFR-008) without
  needing any of this composition work.

## Decision
Defer the switch to the Design phase, to be revisited together with visual
styling rather than as a standalone swap. Keep our own grid (with the
CRI-67 week-row fix) for the PoC: it now meets every requirement above, and
the attempt above showed that getting a library to look and behave like it
did was itself a non-trivial amount of work, best done once alongside the
real visual design rather than twice.

If and when this is picked up again, react-native-calendars remains the
better-fitting option of the two libraries considered: it meets every
requirement out of the box (modulo the header composition work described
above), is confirmed Expo Go compatible without a dev build, and its
`dayComponent` prop keeps us free to design our own day cells rather than
being boxed into its default look. flash-calendar is still not recommended:
it does not clearly fit the marked-day, grouped-list shape of FR-008/FR-009
from its current documentation.

CRI-76 (the migration issue) moves back to the backlog, labelled Design,
linked to this ADR.

## Consequences
- No new dependency for the PoC; the grid stays ours, including
  `monthGridDates` / `monthGridWeeks` and their tests.
- The Design phase should budget real time for this, not treat it as a
  drop-in swap: matching (or intentionally changing) the grid's look and
  timing behaviour is where the effort actually goes, not the integration
  itself.
- If react-native-calendars is picked up again, the day list
  (`datesWithEpisodes`, `calendarRowLine`, FR-009/FR-012) stays ours either
  way, since the library only owns the grid, not the day list below it.
