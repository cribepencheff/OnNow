# 0019. The show's rating from TMDB

Status: Proposed (CRI-143). Supersedes ADR 0018.

## Context
ADR 0018 chose TVmaze's rating because it costs no request and is the
same everywhere, and set TMDB's aside because the app did not always have
a TMDB answer for a search result. Since then every Search row looks the
show up on TMDB for its services (FR-027), and every TMDB lookup starts
from the same find answer, kept 30 days (CRI-107), which carries TMDB's
`vote_average` and `vote_count`.

The owner compared the three ratings for the 21 test set shows
(2026-10-25), with IMDb's as the reference:

| | Mean distance from IMDb | Within ±0.3 | Direction |
|---|---|---|---|
| TVmaze | 0.38 | 10 of 21 | lower in nearly every show, -0.4 on average |
| TMDB | 0.29 | 13 of 21 | either way, -0.1 on average |

TVmaze was far below IMDb on some big shows (Only Murders in the
Building 6.8 against 8.0, The Bear 7.4 against 8.5) and gives no vote
count, so a thin rating cannot be told apart. TMDB was off only with very
few votes (Special Forces: 17 votes, 5.9 against 7.2), which its vote
count shows.

## Decision
Show **TMDB's rating** (`vote_average`, one decimal), the same number
wherever it appears:
- Only with at least 50 votes; otherwise no rating.
- No fallback to TVmaze when TMDB has none, so the label always says
  whose it is.
- Read from the cached find answer, so it costs no request of its own.
- In Show detail, in a chip marked "TMDB" and linked to the show on TMDB.
- On a Search row's poster, the number alone; screen readers hear "TMDB
  rating 8.0".

## Consequences
- No new request and no key beyond TMDB's, which the app already uses.
  The TMDB credit already covers the rating.
- The rating can be up to 30 days old, as the find answer is; ratings
  move slowly.
- Without a TMDB key, or for a show TMDB does not know, there is no
  rating anywhere.
- A Search row's rating appears with its services, once the find answer
  is in, not with the search result itself.
- TMDB's API is free for non-commercial use, with attribution; a
  commercial release needs TMDB's terms checked (CRI-83), as for the rest
  of the app's TMDB data.
