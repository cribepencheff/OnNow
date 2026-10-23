# 0018. The show's rating from TVmaze

Status: Accepted (approved with #118, 2026-10-23). Supersedes ADR 0013.

## Context
ADR 0013 showed the IMDb rating, looked up per show through OMDb with one
free key bundled in the app: 1,000 requests a day shared by every install,
and a key anyone can read out of the app (CRI-116). Search rows now show a
rating too (on the poster), each result one more OMDb lookup, so the
limit would be reached with few users. A backend of the app's own, a
shared cache in front of OMDb, could lift it, but that is a larger
decision (ADR 0002, "no backend") and far off.

TVmaze, the app's main source (ADR 0005), has its own users' average
rating in every show it returns, search results included.

## Options
- **Keep IMDb through OMDb**, kept 30 days (ADR 0013 amendment): stretches
  the limit, does not remove it; the key stays exposed.
- **IMDb through a backend of our own:** no per-user limit, the key off
  devices; needs ADR 0002 changed and something to run.
- **TVmaze's rating:** in the data the app already has, so no request at
  all, no limit and no key. It is TVmaze's users' rating, not IMDb's, and
  must be named as such (data first).
- **TMDB's rating** (`vote_average`): also free, but on TMDB answers the
  app does not always have for a search result.

## Decision
Show **TVmaze's rating** (`rating.average`, one decimal), the same number
wherever it appears, so Search and Show detail never disagree:
- On a Search row's poster, the number alone; screen readers hear "TVmaze
  rating 8.0".
- In Show detail, marked "TVmaze" and linked to the show on TVmaze.
- Nothing when TVmaze has none.

OMDb is no longer used: its client, cache, credit and key go. The TVmaze
credit already covers the rating (NFR-007).

## Consequences
- No rating request at all, and no shared limit; CRI-116's OMDb concern
  goes away.
- The number differs from IMDb's, usually a little. It is labelled
  TVmaze's wherever it is labelled.
- Small shows may have no TVmaze rating; nothing is shown then.
- If a backend of the app's own comes (ADR 0002), the IMDb rating can be
  reconsidered.
