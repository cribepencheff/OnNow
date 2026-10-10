# MVP

Status: draft. Scoped after the Proof of Concept and the Design phase.

## Hypothesis
A stripped, cinematic radar is something I prefer over Next Episode for daily
use, and so do a few friends.

## Scope
- The visual design from the Design phase applied to all views
- An excellent add flow, including the first run experience and, in
  Search before typing, Home's "Top picks for you" and "Airing this week"
  rows (FR-026)
- Shows in two segments, Active and Inactive, with Show detail's status
  line and the service on each row (FR-010, FR-035)
- Show detail view (FR-028 to FR-030)
- "Top picks for you" under the Home hero, derived from the follow list
  (FR-038, ADR 0016). Hidden when it has no picks to show (an empty follow
  list, or every pick followed or without a service in the region). When
  it gets picks, for example after a follow from "Airing this week", it
  expands in with skeleton cards that then fill in, and what is on screen
  stays in place.
- "Airing this week" under it: shows on a streaming service in the user's
  region that would be in the hero if followed, by TMDB popularity,
  scripted and documentaries, followed shows left out, always shown
  (FR-039, ADR 0016). It always has at least as many cards as fit on the
  screen, enforced by a test, so later filtering cannot shrink it below
  that. Both rows show only shows with a service in the region
- "Open in [service]" with a menu for several services (FR-014, FR-015)
- Territory setting and service availability (FR-016, FR-017)
- Local notifications (FR-018)
- Settings (FR-019)

## Success criteria
- [ ] A new user follows their first show within 10 seconds of opening the app
- [ ] "Open in" works for the streaming services I use
- [ ] I use On Now instead of Next Episode every day for two weeks
- [ ] Running cost stays at zero
