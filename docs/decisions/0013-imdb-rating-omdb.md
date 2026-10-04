# 0013. IMDb rating via OMDb

Status: Accepted (CRI-87)

## Context
The owner wants the IMDb rating in the Show detail hero, linked to the
show's page on IMDb. ADR 0005 rejected IMDb itself as a data source: it
has no free open API. We already have each show's IMDb ID from TVmaze's
`externals`. Everything must stay free to run, with no backend (ADR 0002).

## Options
- **OMDb API:** looks up a title by IMDb ID and returns `imdbRating` along
  with other fields. Free key, 1,000 requests a day. Data under CC BY-NC
  4.0: credit required, no commercial use. Missing values are the string
  "N/A" (seen live for Neagley).
- **IMDb non-commercial datasets** (`title.ratings.tsv.gz`, daily): the
  real ratings, free for personal and non-commercial use. But it is one
  large file for every title. Without a backend, every device would have
  to download and index it. Rejected.
- **MDBList:** aggregates IMDb, TMDB, Trakt and other ratings behind a free
  key with a daily limit. It is another account and service on top of
  OMDb's answer to the same question, and it brings no gain for one
  number. Rejected.
- **TMDB's own rating** (`vote_average`): free and already fetched by our
  key. But it is TMDB users' rating, not IMDb's, and labelling it "IMDb"
  would be false (principle: data first). Rejected.
- **Scraping imdb.com:** against IMDb's conditions of use. Ruled out.

## Decision
Use **OMDb**, looked up by the IMDb ID from TVmaze.
- The key is `EXPO_PUBLIC_OMDB_API_KEY` in `.env`, never committed, the
  same pattern as the TMDB key. Without a key, nothing is looked up and no
  rating is shown.
- The rating is looked up when Show detail opens. It is kept per show in
  plain AsyncStorage for 7 days, and a "no rating" answer is kept too.
  Ratings move slowly, so a week is fresh enough.
- "N/A", an empty or missing `imdbRating`, or `Response: "False"` all
  mean no rating, and nothing is shown. A 401 (bad key or daily limit
  reached) is an error and also shows nothing; it is not cached.
- The rating links to `https://www.imdb.com/title/<imdb id>/`.
- OMDb is credited under the TVmaze and TMDB credits (NFR-007).

## Consequences
- **Request budget:** at most one request per show, per device, per week.
  The key is bundled in the app, so the 1,000 a day limit is shared by
  every install of one build. That is far enough for the owner and a few
  friends. A public release would need a per-user approach or a paid
  OMDb tier, so check this again before release (CRI-83).
- **Commercial use:** CC BY-NC matches TMDB's free terms (ADR 0005). A
  paid or ad-supported app would need to drop or replace this source.
- **The IMDb mark** is plain text ("IMDb") until the visual design phase.
  IMDb's logo guidelines must be checked before the real mark is used.
- ADR 0005's rejection of IMDb as a direct source still stands. OMDb is a
  third-party API in between.
