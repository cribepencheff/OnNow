# 0005. Data sources

Status: Accepted for the PoC (TVmaze). MVP and later parts still proposed.

## Context
We need release dates per episode, search, images, service availability per
territory and service IDs. Everything must be free.

## Options
- **TVmaze:** release timestamps per episode, no API key, CC BY-SA licence.
- **TMDB:** strong catalogue, posters, backdrops, logos and service
  availability per country (JustWatch attribution required). Dates only, no
  time of day. Free for non-commercial use.
- **Wikidata:** free, maps IMDb IDs to service IDs (Netflix, Disney+ and
  others). Uneven coverage.
- **IMDb (rejected):** no free open API. Access goes through paid data sets,
  and the terms limit use to personal, non-commercial purposes without
  republishing. Announced episodes are available from TVmaze and TMDB instead.

## Decision
- **PoC: TVmaze only (accepted).** Spike 0001 showed correct search matches
  for all 19 test shows, correct dates in all checked samples, posters for
  every show, a clear model for upcoming and announced seasons, and 38
  requests for a full sync. See `spikes/0001-tvmaze-data-quality.md`.
- MVP: add TMDB for service availability and richer images, linked through
  external IDs (proposed, pending spike 0002).
- After MVP: Wikidata for direct links to the show (proposed).

## Consequences for the PoC
- Match search results on name, premiere year and network or web channel,
  not name alone.
- The local date of an episode is derived from `airstamp` in the user's time
  zone (ADR 0001). To confirm for streaming episodes during the PoC.
- "Is there more coming" is read from `_links.nextepisode` and from season
  `episodeOrder` and `premiereDate`, not from show `status`.
- Show `status` is shown verbatim or not at all (principle: data first).
- Wording for upcoming states follows what TVmaze provides:
  - an episode with a date, possibly titled "TBA"
  - an announced season with a known episode count but no date
  - an announced season with neither
- A whole-season release is detected when all episodes in a season share
  one `airdate`.
- Responses can be cached for one hour (`cache-control: max-age=3600`).
- TVmaze must be credited according to CC BY-SA.
- Specials are excluded (FR-037). How TVmaze marks specials, and whether
  they are included by default, is checked in the spike 0001 follow-up.

## Still to verify
- Current TMDB terms for a free app without revenue (spike 0002)
- Season level availability in Sweden (spike 0002)
- Wikidata coverage for the test set
