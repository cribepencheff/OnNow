# Spike 0001: TVmaze data quality

Status: Done
Time box: half a day
Feeds into: `decisions/0005-data-sources.md`

## Questions
1. Can every show in the test set be found by search, and is the first
   result the right show?
2. Are release dates for streaming episodes correct? Compare against the
   service or a trusted schedule for at least 5 shows.
3. How are upcoming episodes represented: dates, missing dates, "TBA"
   titles, number of episodes in a season?
4. How is an announced next season represented when no episodes are listed
   yet? Is a premiere date available?
5. What show statuses exist (for example running, ended, to be determined),
   and do they match reality for the test set?
6. Image coverage: does each show have a poster? Do episodes have stills?
7. Whole-season releases: do all episodes share one date?
8. Rate limits and caching: how many requests does a full sync of the test
   set need?

## Method
- A small throwaway script (in Claude Code) that fetches each show in the
  test set with its episodes, and prints a table per question.
- Manual check of dates against reality for a handful of shows.
- No app code. The script is not committed, only the findings.

## Output
- Findings in this file, under "Results".
- A list of the exact fields and values the source provides for show status,
  upcoming episodes and next seasons. The app's wording for these states is
  based on this list (principle: data first).
- A recommendation for ADR 0005: accept TVmaze for the PoC or not.

## Results

Run against the public TVmaze API (`https://api.tvmaze.com`) on 2026-09-21,
no API key. All 19 shows in the test set, `/search/shows` followed by
`/shows/{id}?embed[]=episodes&embed[]=seasons`. 38 requests total, throttled
to under 20 per 10 seconds. No HTTP 429 responses.

### 1. Search match quality

All 19 shows were found and the first search result was the correct show,
matched on name, premiere year and network or web channel.

| Show | Top result | Premiered | Network / web channel | Match score |
| ---- | ---------- | --------- | ---------------------- | ----------- |
| MobLand | MobLand | 2025-03-30 | Paramount+ | 0.897 |
| Dark Matter | Dark Matter | 2024-05-08 | Apple TV | 1.189 |
| Slow Horses | Slow Horses | 2022-04-01 | Apple TV | 1.189 |
| Lanterns | Lanterns | 2026-08-16 | HBO | 0.897 |
| Silo | Silo | 2023-05-05 | Apple TV | 0.897 |
| Widow's Bay | Widow's Bay | 2026-04-29 | Apple TV | 1.189 |
| Killing Eve | Killing Eve | 2018-04-08 | AMC+ | 1.188 |
| Legends | Legends | 2026-05-07 | Netflix | 0.896 |
| The Agency | The Agency | 2024-11-29 | Paramount+ | 1.189 |
| Neagley | Neagley | 2026-09-16 | Prime Video | 0.896 |
| Ludwig | Ludwig | 2024-09-25 | BBC iPlayer | 0.896 |
| Only Murders in the Building | Only Murders in the Building | 2021-08-31 | Hulu | 1.770 |
| The Bear | The Bear | 2022-06-23 | Hulu | 1.189 |
| Foundation | Foundation | 2021-09-24 | Apple TV | 0.897 |
| Paradise | Paradise | 2025-01-26 | Hulu | 0.896 |
| The Pitt | The Pitt | 2025-01-09 | HBO Max | 1.189 |
| A Knight of the Seven Kingdoms | A Knight of the Seven Kingdoms | 2026-01-18 | HBO | 1.921 |
| Pluribus | Pluribus | 2025-11-07 | Apple TV | 0.896 |
| The Diplomat | The Diplomat | 2023-04-20 | Netflix | 1.189 |

Notes on ambiguity, none required picking a different result than the top
one:
- "Legends", "The Agency", "Ludwig", "Paradise" and "The Diplomat" each have
  same-named alternates (older shows, other countries) with close scores,
  but the top result matched the test set show on year and network in every
  case.
- Search alone is not enough to disambiguate reliably for common titles. The
  app should confirm a match with premiere year and network, not name alone.

### 2. Release date accuracy

Five dates checked manually against IMDB on 2026-09-21:

| Show | TVmaze `airdate` | IMDB | Match |
| ---- | ----------------- | ---- | ----- |
| Dark Matter, season 1 finale (S1E9) | 2024-06-26 | 2024-06-26 | Yes |
| Slow Horses, S6E1 | 2026-09-16 | 2026-09-16 | Yes |
| The Bear, season 5 (all episodes) | 2026-06-25 | 2026-06-25 | Yes |
| The Diplomat, season 4 premiere | 2026-10-15 | 2026-10-15 | Yes |
| MobLand, S1E1 | 2025-03-30 | 2025-03-30 | Yes |
| MobLand, S2E1 (checked in addition) | 2026-09-18 | 2026-09-18 | Yes |

All six checked dates matched. No discrepancies found in this sample.

### 3. Upcoming episodes, missing dates, "TBA" titles, episode counts

Field names as returned by TVmaze, unchanged:

- Episode object: `season`, `number`, `name`, `airdate`, `airtime`,
  `airstamp`, `runtime`, `image`, `summary`.
- No episode in the test set had a missing `airdate` (empty string or null).
  TVmaze only lists episodes once a date is set.
- Announced episodes with an unconfirmed title use `name: "TBA"`, with an
  `airdate` still present. Seen for: Lanterns (S1E8), Silo (S4E1), The
  Diplomat (S4E1), Only Murders in the Building (all 10 episodes of season
  6, `airdate` from 2026-12-08 to 2027-02-09).
- Season episode counts come from `episodeOrder` on the season object, for
  example The Bear season 4: `episodeOrder: 10`. This matches the number of
  episode objects once the season is fully scheduled.

### 4. Announced next season with no episodes yet

Season object fields: `number`, `name`, `episodeOrder`, `premiereDate`,
`endDate`, `network`, `webChannel`.

When a next season is announced but not yet scheduled, TVmaze returns a
season entry with `episodeOrder: null`, `premiereDate: null`,
`endDate: null`, and no matching entries in the episodes list. Seen for:
A Knight of the Seven Kingdoms (season 2), Foundation (season 4), Paradise
(season 3), The Pitt (season 3), Pluribus (season 2).

A partial state also exists: `episodeOrder` set but `premiereDate: null`,
meaning the episode count is known but no date yet. Seen for: Legends
(season 2, `episodeOrder: 6`), Ludwig (season 3, `episodeOrder: 6`), Slow
Horses (seasons 7 and 8, both `episodeOrder: 6`).

The show object also exposes `_links.nextepisode`, present only when a next
episode with a date exists. 8 of 19 shows in the test set had it at fetch
time (Dark Matter, Lanterns, MobLand, Only Murders in the Building, Silo,
Slow Horses, The Diplomat), useful as a direct "is there a next episode"
check without scanning the episode list.

### 5. Show statuses

Three distinct `status` values seen in the test set: `"Running"`,
`"Ended"`, `"To Be Determined"`.

| Show | `status` | Matches reality (per user, 2026-09-21) |
| ---- | -------- | --------------------------------------- |
| Killing Eve | Ended | Yes, series concluded |
| The Bear | Ended | No. Season 5 aired 2026-06-25 per both TVmaze and IMDB with no confirmed cancellation; `status` looks stale |
| The Agency | To Be Determined | Season 2 has a full episode list with dates (last: 2026-06-21), so an upcoming season exists but `status` does not reflect it |
| Neagley | To Be Determined | Plausible, new show, only one season listed |
| All others | Running | Consistent with an active, non-ended show |

`status` should not be trusted as the sole signal for "has more episodes
coming". `_links.nextepisode` and season `episodeOrder`/`premiereDate` are
more reliable for that.

### Review notes (added after the run)
- **The Bear:** `"Ended"` is correct. FX announced in May 2026 that season 5
  is the final season (Variety, The Hollywood Reporter). The spike's claim
  that the status is stale was wrong; TVmaze was up to date.
- **The Agency:** the last season 2 date (2026-06-21) is in the past, so
  season 2 has already aired. `"To Be Determined"` is plausible (waiting for
  renewal) and does not contradict the data.
- **Section 4** says 8 of 19 shows had `_links.nextepisode` but lists 7.
  Minor, recount if it matters.
- **Not covered, follow up:** which field gives the correct local date.
  `airdate` is in the network's time zone, `airstamp` is a full timestamp.
  ADR 0001 needs the date in the user's time zone, so the PoC should derive
  it from `airstamp`. Check that `airstamp` is present and sensible for
  streaming (web channel) episodes, including ones without `airtime`.
  Concrete case: The Bear season 5 was released on Hulu at 9 p.m. ET on
  June 25, 2026, which is early June 26 in Sweden. `airdate` says June 25,
  a Swedish user would see it on June 26.
  Reference for checking: the Next Episode app with "Use local timezone"
  switched on shows dates and times converted to Swedish time. Next Episode
  also offers a manual "1 day airdates offset" setting, which suggests the
  conversion is a known problem. Our goal is to get it right from
  `airstamp` without such a setting.

### 6. Image coverage

Every one of the 19 shows has a show-level poster (`image.medium` and
`image.original` both present).

Episode stills (`episode.image`) are present for aired episodes and usually
missing for unaired or newly announced ones:

| Show | Episode stills |
| ---- | --------------- |
| A Knight of the Seven Kingdoms | 6/6 |
| Dark Matter | 13/19 |
| Foundation | 30/30 |
| Killing Eve | 32/32 |
| Lanterns | 6/8 |
| Legends | 6/6 |
| Ludwig | 12/12 |
| MobLand | 11/20 |
| Neagley | 8/8 |
| Only Murders in the Building | 50/60 |
| Paradise | 16/16 |
| Pluribus | 9/9 |
| Silo | 30/31 |
| Slow Horses | 32/36 |
| The Agency | 20/20 |
| The Bear | 46/46 |
| The Diplomat | 22/23 |
| The Pitt | 30/30 |
| Widow's Bay | 10/10 |

### 7. Whole-season releases

Confirmed: when a service releases a season at once, every episode in that
season shares the same `airdate`. Seen for The Bear (all 5 seasons), The
Diplomat (all 3 seasons), Ludwig (season 1, 6 episodes), Legends (season 1,
6 episodes), Neagley (season 1, 8 episodes), The Agency (season 2, 10
episodes). This is a reliable signal to detect a binge-release season: group
episodes by `season`, check if `airdate` is identical across the group.

### 8. Rate limits and caching

A full sync of the 19-show test set (search plus show detail with embedded
seasons and episodes) took 38 requests: 1 search call and 1 detail call per
show. No 429 responses at roughly 1.6 requests per second (600 ms spacing),
well under the documented 20 requests per 10 seconds.

Response headers include `cache-control: public, max-age=3600`, confirming
show detail responses are safe to cache for at least one hour client-side,
reducing repeat calls for a daily-use app.

### Recommendation

**Yes, TVmaze is good enough as the only data source for the PoC.**

Reasons:
- Search correctly matched all 19 shows in the test set on the first
  result, though disambiguation should use premiere year and network, not
  name alone, since same-titled shows exist.
- Release dates checked against IMDB matched in all 6 samples, including a
  whole-season release and a not-yet-aired premiere.
- The data model distinguishes scheduled episodes, "TBA"-titled but dated
  episodes, and announced-but-unscheduled seasons clearly enough to build
  the PoC's calendar and "new episode today" views without guessing.
- No API key, generous rate limit for a single-user daily sync, and
  hour-long cache headers keep this free to run.

Caveat to carry into ADR 0005: the `status` field is not reliable for
"is this show still getting new episodes". The Bear shows `"Ended"` despite
a season with 2026 airdates, and The Agency shows `"To Be Determined"`
despite having a fully dated season 2. The app should use
`_links.nextepisode` and season `episodeOrder`/`premiereDate` instead of
`status` to decide what to show, and show `status` verbatim if it is
surfaced at all (principle: data first, do not reinterpret it).

## Follow-up: local date and specials

Run against the public TVmaze API on 2026-09-21, same 19-show test set.
`/search/shows` plus `/shows/{id}?embed[]=episodes&embed[]=seasons` plus
`/shows/{id}/episodes?specials=1` per show, 57 requests total, no HTTP 429
responses.

### 1. `airdate` vs `airstamp` converted to Europe/Stockholm, 2026 episodes

126 episodes in the test set have a 2026 `airdate`. 14 of them differ from
the Stockholm date derived from `airstamp` (converted with the IANA time
zone `Europe/Stockholm`, so DST is handled automatically):

| Show | Episode | `airdate` | `airstamp` | Stockholm date |
| ---- | ------- | --------- | ---------- | ---------------- |
| Lanterns | S1E1 | 2026-08-16 | 2026-08-17T01:00:00+00:00 | 2026-08-17 |
| Lanterns | S1E2 | 2026-08-23 | 2026-08-24T01:00:00+00:00 | 2026-08-24 |
| Lanterns | S1E3 | 2026-08-30 | 2026-08-31T01:00:00+00:00 | 2026-08-31 |
| Lanterns | S1E4 | 2026-09-06 | 2026-09-07T01:00:00+00:00 | 2026-09-07 |
| Lanterns | S1E5 | 2026-09-13 | 2026-09-14T01:00:00+00:00 | 2026-09-14 |
| Lanterns | S1E6 | 2026-09-20 | 2026-09-21T01:00:00+00:00 | 2026-09-21 |
| Lanterns | S1E7 | 2026-09-27 | 2026-09-28T01:00:00+00:00 | 2026-09-28 |
| Lanterns | S1E8 | 2026-10-04 | 2026-10-05T01:00:00+00:00 | 2026-10-05 |
| A Knight of the Seven Kingdoms | S1E1 | 2026-01-18 | 2026-01-19T03:02:00+00:00 | 2026-01-19 |
| A Knight of the Seven Kingdoms | S1E2 | 2026-01-25 | 2026-01-26T03:02:00+00:00 | 2026-01-26 |
| A Knight of the Seven Kingdoms | S1E3 | 2026-02-01 | 2026-02-02T03:04:00+00:00 | 2026-02-02 |
| A Knight of the Seven Kingdoms | S1E4 | 2026-02-08 | 2026-02-09T03:02:00+00:00 | 2026-02-09 |
| A Knight of the Seven Kingdoms | S1E5 | 2026-02-15 | 2026-02-16T03:03:00+00:00 | 2026-02-16 |
| A Knight of the Seven Kingdoms | S1E6 | 2026-02-22 | 2026-02-23T03:05:00+00:00 | 2026-02-23 |

All 14 are HBO episodes that air late evening US time, past midnight UTC,
which lands on the next calendar day in Stockholm. This is exactly the
"`airdate` is in the network's time zone" problem, one calendar day behind
for a European viewer.

### 2. Episodes missing `airtime` or `airstamp`

No episode in the test set is missing `airstamp`. `airtime` is missing only
for web channel (streaming) shows, never for the two broadcast networks in
the set:

| Network / web channel | Kind | Episodes | Missing `airtime` | Missing `airstamp` |
| ----------------------- | ---- | -------- | -------------------- | --------------------- |
| Apple TV | web | 135 | 135 | 0 |
| Hulu | web | 122 | 112 | 0 |
| HBO Max | web | 30 | 30 | 0 |
| Netflix | web | 29 | 29 | 0 |
| AMC+ | web | 32 | 8 | 0 |
| Paramount+ | web | 40 | 40 | 0 |
| Prime Video | web | 8 | 8 | 0 |
| BBC iPlayer | web | 12 | 0 | 0 |
| HBO | network | 14 | 0 | 0 |

`airstamp` is present even when `airtime` is empty, TVmaze fills it with a
default time (commonly midday or early morning UTC) when no real air time
is known. This means `airstamp` alone cannot be assumed to reflect a real
broadcast time for streaming shows, only a date.

### 3. Reference cases

| Case | `airdate` | `airtime` | `airstamp` | Stockholm date (from `airstamp`) | Expected |
| ---- | --------- | --------- | ---------- | ----------------------------------- | -------- |
| The Bear S5 (all 8 episodes) | 2026-06-25 | 2026-06-25 | 2026-06-25T16:00:00+00:00 | 2026-06-25 | 2026-06-26 |
| Slow Horses S6E1 | 2026-09-16 | (empty) | 2026-09-16T12:00:00+00:00 | 2026-09-16 | 2026-09-16 |
| Slow Horses S6E3 | 2026-09-30 | (empty) | 2026-09-30T12:00:00+00:00 | 2026-09-30 | 2026-09-30 |

Slow Horses matches the expected Stockholm dates. The Bear does not: the
expectation in the spike question was 2026-06-26, but TVmaze's own
`airstamp` (16:00 UTC, a placeholder time since `airtime` is empty) converts
to 2026-06-25 in Stockholm, the same as `airdate`. TVmaze has no real
airtime for The Bear, Hulu does not publish one, so `airstamp` here is
TVmaze's assumed time, not Hulu's actual release time. The real release
(9 p.m. ET) would in fact land on June 26 in Sweden, but that time is not in
the TVmaze data at all. This means `airstamp` fixes the HBO-style late-night
cases (question 1), where a real `airtime` is known, but cannot fix cases
where TVmaze has no real airtime and fills in a placeholder.

### 4. Specials

TVmaze marks a special with `type` on the episode object, for example
`"type": "significant_special"` for The Bear's "Gary" (season 5, no episode
number: `"number": null`). Across all 19 shows fetched with
`/shows/{id}/episodes?specials=1`, 422 episodes were `"type": "regular"` and
1 was non-regular (Gary). No season-0 pattern was seen in this test set,
specials keep the season number of the season they belong to.

Specials are excluded by default: the normal fetch
(`embed[]=episodes` on the show endpoint) returned 0 results for "Gary".
Only the dedicated `/shows/{id}/episodes?specials=1` endpoint includes it.

Recommendation: no exclusion logic is needed for the PoC's default fetch,
specials are already absent unless `specials=1` is requested. If the app
later wants to include specials, filter on `type !== "regular"` to
identify them, and treat `number: null` as expected for that case rather
than as missing data.

### 5. Field to use for "today" (ADR 0001)

Use `airstamp`, converted to the user's IANA time zone (`Europe/Stockholm`
for the current user), and take only the date part. This is correct for
shows with a real, known airtime (question 1's HBO cases). It is not
guaranteed correct for streaming shows where TVmaze has no real airtime and
`airstamp` holds a placeholder time (question 3's The Bear case), but it is
still the best available field: `airdate` alone is always in the network's
time zone and is wrong for the same HBO cases, and there is no more
accurate field in the API to fall back to. Caveat for ADR 0001: this can be
off by one day for late-night placeholder timestamps on shows without a
published real airtime, a known limitation of the source, not something the
app can correct without a second data source.

### Research: how the day-off pattern arises and how Sweden hears about it

**The common pattern.** The cases that land one day early share two
traits: a streaming release without a published time in TVmaze, and a US
evening release time. The clearest group is FX series on Hulu, which Disney
schedules at 6 p.m. PT / 9 p.m. ET (or 9 p.m. PT) and releases at the same
moment on Disney+ internationally, which is the next morning in Sweden. Most
other Hulu releases are at 12 a.m. PT / 3 a.m. ET, which gives the same date
in Sweden. In the test set this mainly affects The Bear.

**How it is communicated in Sweden.** Swedish media state the Swedish date
clearly. For The Bear season 5, Swedish press gave June 26 on Disney+ and
explained that US sites say June 25 because of the 9 p.m. ET release.
Disney's own press also gives separate US and international dates. This
information exists as press text, not as free structured data.

**A trend that may reduce the problem.** Since June 2026 all FX series
premiere simultaneously on the linear FX channel and on Hulu. A linear
broadcast has a published time, so TVmaze may list real airtimes for these
shows going forward. Worth checking when the next FX series airs.

**Options considered.** A rule of our own (for example "Hulu without time
means next day in Europe") would be wrong for Hulu releases at 3 a.m. ET and
breaks the data first principle. A Swedish structured source is not freely
available. Conclusion: keep ADR 0006 and measure in the PoC week.
