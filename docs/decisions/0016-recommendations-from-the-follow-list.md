# 0016. Recommendations from the follow list, no charts on Home

Status: Accepted (CRI-96)

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
- No "Airing soon", popular, trending or other chart on Home.
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
