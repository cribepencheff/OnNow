# Spike 0002: Territory availability per season

Status: Planned
Time box: half a day
Feeds into: `decisions/0005-data-sources.md`, FR-017, FR-027, FR-031

## Questions
1. Does TMDB return streaming availability for Sweden for every show in the
   test set?
2. Is availability given per season, or only per show? Test case: MobLand,
   where Swedish services carry season 1 but not season 2.
3. Which services appear for Sweden (for example Netflix, HBO Max, Apple TV,
   SkyShowtime, Viaplay, SVT Play) and are they correct?
4. How quickly is a new season reflected after it becomes available?
5. What exactly do the terms require: TMDB attribution, JustWatch
   attribution, logo use, caching limits?
6. Can a TVmaze show be matched to a TMDB show reliably through external IDs
   (IMDb, TheTVDB)?

## Method
- A small throwaway script that looks up each show in the test set on TMDB
  through its external ID and fetches availability for Sweden, per show and
  per season where possible.
- Compare with PlayPilot or JustWatch for a handful of shows.

## Output
- Findings in this file, under "Results".
- Whether FR-031 ("Not in Sweden yet") can be built, and how.

## Results
Not run yet.
