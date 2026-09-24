# Spike 0002: Territory availability per season

Status: Done (2026-09-24, CRI-82)
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
Run on 2026-09-24 from Sweden with a free TMDB API key, using a throwaway
script (not committed) over the 19 test set shows plus two extra shows from
the PoC week log. Recorded responses for a handful of shows are kept as test
fixtures (`src/api/fixtures/tmdb-*.json`).

### 6. Matching TVmaze to TMDB (question 6)
All 21 shows matched through TMDB's `/find` endpoint with the IMDb ID from
TVmaze's `externals`, each to the right show by title. TheTVDB ID was not
needed, but is kept as a fallback when a show has no IMDb ID. Matching is
reliable.

### 1 and 3. Services in Sweden
TMDB's watch providers (`/tv/{id}/watch/providers`, region `SE`,
subscription = `flatrate`):

| Show | Sweden (subscription) | Also |
| ---- | --------------------- | ---- |
| A Knight of the Seven Kingdoms | HBO Max | rent/buy |
| Dark Matter | Apple TV | free: Prime Video, Apple TV |
| Foundation | Apple TV | |
| Killing Eve | Netflix, Tele2 Play | |
| Lanterns | HBO Max | |
| Legends | Netflix | |
| Ludwig | BritBox, TV4 Play | free: SVT |
| MobLand | SkyShowtime | |
| Neagley | Amazon Prime Video | |
| Only Murders in the Building | Disney Plus | |
| Paradise | Disney Plus | |
| Pluribus | Apple TV | |
| Silo | Apple TV | free: Apple TV |
| Slow Horses | Apple TV | free: Prime Video, Apple TV |
| The Agency | SkyShowtime | rent/buy |
| The Bear | Disney Plus | |
| The Diplomat | Netflix | |
| The Pitt | HBO Max | |
| Widow's Bay | Apple TV | |
| Hell's Kitchen (extra) | none | with ads: Pluto TV |
| Special Forces: World's Toughest Test (extra) | none | none |

"Apple TV Amazon Channel" and "HBO Max Amazon Channel" also appear; they are
the same services sold through Prime Video and are left out.

- 19 of 21 shows have a Swedish subscription service. The services look
  right: US networks map to their Swedish homes (Hulu shows are on Disney+,
  Paramount+ shows on SkyShowtime, AMC+'s Killing Eve on Netflix).
- Neagley on Prime Video matches the owner's own finding. The owner's column
  "Where I watch it in Sweden" in the PoC log was not filled in yet, so the
  other shows could not be compared.
- Special Forces has no Swedish service at all: the no-button case.

### 2. Per season
TMDB returns the same result for MobLand season 1 and season 2
(SkyShowtime for both), so per season availability is either not tracked
or mirrors the show. It cannot tell "season 2 not in Sweden yet" apart.
**FR-031 ("Not in Sweden yet") cannot be built from TMDB alone.**

### 4. Freshness
Not measured in the time box: it needs a new season to arrive during the
test. Left for the PoC week.

### 5. Terms
- **TMDB:** attribution is required: the notice "This [application] uses
  TMDB and the TMDB APIs but is not endorsed, certified, or otherwise
  approved by TMDB", shown prominently, and the TMDB logo, less prominent
  than the app's own. Caching TMDB data for longer than 6 months is not
  allowed. The free license does not permit any commercial use (charging
  for the app, ads or other revenue); that needs a separate written
  agreement with TMDB, possibly with fees.
- **JustWatch:** TMDB's watch provider data comes from JustWatch, and TMDB
  requires the data to be attributed to JustWatch, or access is revoked.
  JustWatch does not allow commercial use of its data without a data
  partnership, which it currently offers to bigger partners only.
- **TVmaze:** CC BY-SA 4.0. Any use, including commercial, is allowed as
  long as TVmaze is credited and the share-alike terms are met. Premium and
  enterprise API tiers exist but are not needed.

### Conclusion
TMDB can deliver the Swedish service for "Open in [service]" (FR-014) with a
free key, for a free app without ads. Charging or ads would need new
agreements with TMDB and JustWatch first (ADR 0002, ADR 0005). FR-031 needs
another source.
