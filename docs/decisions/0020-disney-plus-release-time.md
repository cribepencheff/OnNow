# 0020. Disney+ episodes are released at 6 p.m. Pacific

Status: Accepted (CRI-149, approved by the owner 2026-11-03). Amends ADR 0006.

## Context
ADR 0006 derives an episode's local date from TVmaze's `airstamp`, with no
rules of our own per service. It accepted that a streaming release without
a published time can land a day early in Sweden.

That is now a visible, recurring error. VisionQuest (Disney+) showed
episode 7 as "today" on Tuesday 2026-11-03, but it was released on
Wednesday at 03:00 in Sweden. Every episode of the season was shown a day
early.

- TVmaze does not give streaming episodes an airtime, by policy. Its
  moderators say so in the edit request forum, and fills `airstamp` with a
  placeholder time (12:00 UTC). Every Disney+ show we checked (VisionQuest,
  Daredevil: Born Again, Andor, Percy Jackson, Agatha All Along, Ironheart,
  The Mandalorian, Loki) has an empty `airtime`.
- No free source has a per country release date or time for an episode:
  not TVmaze (its Swedish web schedule is empty), not TMDB (one
  `air_date`, no time), and not JustWatch through TMDB (services only, no
  dates).
- Disney+ has released its series at two times. Until August 2023, 12:01
  a.m. Pacific, which is the same morning in Sweden. Since Ahsoka (August
  2023), its series release at 6 p.m. Pacific (9 p.m. Eastern): Loki
  season 2, The Acolyte, Skeleton Crew, Andor season 2, Daredevil: Born
  Again, VisionQuest. That is 02:00 or 03:00 the next day in Sweden.
- Disney has not stated that 6 p.m. Pacific applies to every series.

## Decision
A Disney+ episode (TVmaze web channel 287) without an `airtime` is
released at 18:00 `America/Los_Angeles` on its `airdate`. That time
replaces TVmaze's placeholder `airstamp` before any view reads the show,
so every view (Home, Calendar, Show detail, the week's rows) uses the same
release time. An episode with an `airtime`, and every other
service, keep TVmaze's `airstamp` as in ADR 0006.

This is a known fact about the service, not a guess per episode, so it is
an exception to "data first" made on purpose and limited to one service.
A rule for another service needs its own decision.

## Consequences
- Disney+ series that release in the US evening land on the right day in
  Sweden and the rest of Europe. In the US they stay on the airdate.
- A Disney+ series that still releases at 12:01 a.m. Pacific is shown a
  day late in Europe (Wednesday instead of Tuesday morning). This is
  accepted: since 2023 the evening release is the norm for its series,
  and showing an episode the day after it came is better than showing one
  as out before it is.
- The Bear and other FX or Hulu series that Disney+ carries in Sweden are
  on other TVmaze channels and are not covered.
- The rule is applied when a show is read (the show queries' `select`),
  not when it is fetched. The saved show cache keeps TVmaze's answer as
  it came, so this change, and any later change to the rule, needs no new
  cache key. A new key would refetch every followed show at once, and
  with TVmaze's rate limit Home would be missing most shows for up to
  half a minute (seen when testing this). The discovery rows' week info
  is small and is fetched again under a new key (`tvmazeWeekInfo` v2).
- If Disney+ changes its release time, this is the one place to change.

## Sources
- [What's On Disney Plus: What time will new Disney+ shows be available?](https://whatsondisneyplus.com/what-time-will-new-disney-shows-be-available/)
- [Nerdist: Ahsoka moves to Tuesday nights](https://nerdist.com/article/disney-plus-reveals-new-release-date-time-for-ahsoka-episode-change-in-drop-strategy)
- [Nerdist: The Acolyte continues the prime time Disney+ trend](https://nerdist.com/article/star-wars-the-acolyte-sets-release-time-continues-primetime-disney-plus-trend/)
- [TheWrap: What time is VisionQuest on Disney+?](https://www.thewrap.com/media-platforms/tv/what-time-is-visionquest-on-disney-plus/)
- [Moviezine: Vilken tid släpps Andor i Sverige?](https://www.moviezine.se/nyheter/vilken-tid-slapps-den-nya-sasongen-av-andor-i-sverige)
- [TVmaze forum: no airtimes for streaming services](https://www.tvmaze.com/threads/2677/edit-requests?page=1223)
