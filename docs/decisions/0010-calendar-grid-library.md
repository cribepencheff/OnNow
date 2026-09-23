# 0010. Calendar month grid: react-native-calendars instead of our own

Status: Accepted

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

## Decision
Switch to **react-native-calendars** for the month grid. It meets every
requirement above out of the box, is confirmed Expo Go compatible without a
dev build, and its `dayComponent` prop keeps us free to design our own day
cells for the Design phase rather than being boxed into its default look.
flash-calendar is not recommended: it does not clearly fit the marked-day,
grouped-list shape of FR-008/FR-009 from its current documentation, and
switching to it would trade one unproven fit for another.

Not switched within CRI-67 (`feat/calendar`) itself. Approved by the owner
as its own follow-up: CRI-76, branch `feat/calendar-library`.

## Consequences
- A new dependency (`react-native-calendars`) enters the app; it is pure
  JavaScript, so it does not change Expo Go compatibility or require a
  development build.
- `monthGridDates` / `monthGridWeeks` (grid layout) can be retired once the
  migration lands; `datesWithEpisodes`, `calendarRowLine`, and the day list
  below the grid (FR-009, FR-012) stay ours, since react-native-calendars
  only owns the grid, not the day list.
- The migration is a contained follow-up: swap `MonthPage` for
  `react-native-calendars`'s `Calendar` (or `CalendarList` for paging) with
  a custom `dayComponent`, wire `markedDates` from `datesWithEpisodes`, and
  wire `firstDay` from `useWeekStart`. The day list, "Today" button, and
  data hooks are unaffected.
