# 0016. Recommendations from the follow list, no charts on Home

Status: Accepted (CRI-96), amended (CRI-111)

## Context
The vision lists "charts and recommendations" under Not doing. The Home
round planned two rows under the hero: "Airing soon" (TMDB's airing today
and on the air lists, scripted shows sorted by popularity, followed and not
followed mixed) and "Top picks for you" (TMDB recommendations for each
followed show). Both conflict with that line, and PRD 5.1 allowed at most
one thin row under the card.

## Options
- **Keep the line as it is:** nothing under the hero. Home stays a radar
  for followed shows only, but a user with a short follow list has little
  to discover.
- **Allow recommendations derived from the follow list, no charts:** one
  row, built only from what the user already follows.
- **Allow both rows:** adds a popularity chart to Home, which turns the
  radar into a feed (FR-022, Explore, is After MVP).

## Decision
**Recommendations derived from the user's follow list are allowed. Charts
and trending are not, on Home.**
- Home gets one row under the hero: "Top picks for you". For each
  followed show, TMDB's recommendations (`/tv/{id}/recommendations`);
  shows already followed are removed; titles are ranked by how many
  followed shows recommend them. The ranking is a count of TMDB's own
  data, nothing more (data first).
- The row is hidden when the follow list is empty.
- No "Airing soon", popular, trending or other chart on Home (amended
  below: time-bound popularity rows are allowed).
- A popularity list may appear in Search's empty state, as a way to find a
  first show when the follow list is empty ("Popular", CRI-98). That needs
  its own PRD change.

## Consequences
- The vision's Not doing line reads "charts, and recommendations not
  derived from the follow list".
- PRD 5.1 has exactly one row under the hero (FR-038), and the MVP scope
  lists it.
- Requests: one TMDB recommendations request per followed show, cached for
  a day; the client's 429 backoff applies (NFR-005).
- Data stays on the device: the follow list is only used to build TMDB
  requests by show ID (NFR-004).

## Amendment: time-bound popularity rows (CRI-111, 2026-10-05)
The owner allows one kind of popularity row on Home, replacing "no Airing
soon on Home" above.
- **Allowed: popularity tied to a time window.** "Airing this week": TMDB's
  on-the-air list (`/tv/on_the_air`) gives the candidates in TMDB's
  popularity order; TVmaze decides. A show is kept only if it would be in
  the hero if followed (a regular TVmaze episode within the hero's 7 days),
  and only if TVmaze's type is scripted, animation or documentary, never
  reality, talk, news, game shows or sports. Shows the user follows are
  left out. The time link keeps it a radar of what is airing, not a chart.
- **Not allowed:** all-time top lists, and trending or popular lists
  without a time link.
- **Placement:** under "Top picks for you". It is always shown, also with
  an empty follow list, when it is the first row under the hero.
- **Consequences:** PRD 5.1 has two rows (FR-038, FR-039), the MVP scope
  lists both, and the vision's Not doing line names all-time charts and
  trending without a time link instead of all charts. Search's "Popular"
  (CRI-98) reuses the same source.
