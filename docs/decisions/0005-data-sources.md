# 0005. Data sources

Status: Accepted for the PoC (TVmaze). MVP and later parts still proposed.
Amended 2026-09-24: TMDB is the source of the Swedish streaming service in
the PoC, and the terms for commercial use per source are recorded (spike
0002, CRI-82). See the last section.

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

## TMDB for the Swedish service, and commercial use (amendment 2026-09-24)
Spike 0002 matched all test set shows to TMDB through IMDb IDs, and TMDB's
watch providers gave a Swedish service for 19 of 21 shows. TMDB is now the
source of the Swedish service for "Open in [service]" (ADR 0004, FR-014),
with a free API key. Season level availability (FR-031) cannot be read
from TMDB and still needs another source.

Commercial use, per source (from the spike, to be checked again before any
change, ADR 0002):
- **TVmaze:** CC BY-SA 4.0. Commercial use is allowed with credit and
  share-alike.
- **TMDB:** the free license allows no commercial use (charging for the
  app, ads or other revenue). That needs a separate written agreement with
  TMDB, possibly with fees. Attribution notice and logo required; data may
  not be cached for longer than 6 months.
- **JustWatch** (TMDB's watch provider data): must be credited. Commercial
  use needs a data partnership with JustWatch, currently offered to bigger
  partners only.
