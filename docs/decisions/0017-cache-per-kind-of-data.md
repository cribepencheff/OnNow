# 0017. What the app refreshes, keeps and saves, per kind of data

Status: Accepted (CRI-138)

## Context
The app has two caches:
- **The query cache** (TanStack Query, ADR 0009). It holds every remote
  answer, and the whole of it is saved to the phone (AsyncStorage, key
  `onnow.queryCache`) and read back on a launch.
- **Plain storage** (`src/storage`). It holds the follow list and the
  region, and keeps a few answers with expiries of their own: streaming
  services, IMDb ratings and TVmaze ids.

The times in them grew one feature at a time, and they mix three
different settings into one. In particular, the saved query cache is
discarded once it is a day old (the persister's default `maxAge`, never
set), and unused queries are dropped after a day (`gcTime`). So after a
day away, Home starts empty instead of showing what it had (NFR-001), the
app has nothing offline (NFR-002), and everything is fetched again, even
answers that practically never change, such as a show's TMDB match.

Limits that apply to any choice:
- TVmaze: 20 requests per 10 seconds per IP.
- OMDb: one free key, 1,000 requests a day for all users (CRI-116).
- Android's AsyncStorage holds about 6 MB by default. Raising it needs a
  native setting, so not in Expo Go.
- A timer longer than 2^31 − 1 ms (about 24.8 days) overflows and fires
  at once, so no `gcTime` can be longer than that.

## Three settings per kind of data
- **Refresh:** when an answer is old enough to ask for again. The old
  answer is shown until the new one is in.
- **Keep:** how long an answer may be shown at all when it has not been
  refreshed, in a running app or from the saved copy.
- **Save:** whether it is written to the phone at all, so it survives a
  restart.

## The kinds of data
| Kind | What it is used for | Changes | Refresh, today | Keep and save, today |
|---|---|---|---|---|
| Followed shows (TVmaze show, episodes, seasons) | hero, Calendar, Shows: the core promise | often: new episodes, moved dates | 1 h; an ended show 1 week (CRI-107) | 1 day, saved |
| TMDB match (`/find`) | the start of every TMDB lookup | almost never | 30 days; a miss 1 day (CRI-107) | 1 day, saved |
| Hero images (backdrop, logo) | the hero | rarely | every day (the key has the date); see the amendment: weekly | 1 day, saved |
| Streaming services | "Open in" | now and then | 30 days in plain storage; a miss 1 day | plain storage, 30 days |
| IMDb rating | Show detail | rarely; the OMDb quota matters | 7 days in plain storage; none yet 1 day | plain storage, 7 days |
| Discovery rows (Top picks, Airing this week) | Home and Search rows | by the day | by the day (the keys have the date) | 1 day, saved (see the amendment: the pages are not) |
| Passing (search results; a show only looked at in Show detail; its origin countries and IDs) | the moment | does not matter | 1 h | 1 day, saved |
| Follow list, region | everything | only by the user | never fetched (local) | plain storage, always |

## Options
- **Keep a day, as now.** Simple, and nothing shown is ever more than a
  day old. But Home starts empty after every break, and unchanging
  answers are fetched again.
- **One longer limit for everything (7 days).** Simple. It also saves the
  passing data, and still treats a search result like a followed show.
- **No limit on the saved copy.** Home always opens on what it had. But
  after a long time away it first shows very old data, and the only sign
  of its age, "Updated X ago", shows only during a pull.
- **Per kind of data (proposed).** Each kind gets the three settings it
  needs.
- **A JSON file instead of AsyncStorage.** A separate question: it removes
  Android's size limit and suits a future widget (NFR-006), but it changes
  nothing above. Left for when Android or the widget comes closer, or
  sooner if the saved copy nears 6 MB.

## Decision
- **Followed shows:** refresh as today (1 h; an ended show 1 week). Keep
  and save for **21 days**.
- **TMDB match** and **hero images:** keep and save for **21 days**.
  Refresh as today, until the owner decides on weekly images (below).
- **Streaming services** and **IMDb ratings:** unchanged. Plain storage
  already keeps them, so their query-cache copies are not saved.
- **Discovery rows:** saved for the day they belong to (their keys change
  with the date anyway), so the rows also appear at once on a second
  launch the same day.
- **Passing data:** not saved. Kept in memory for the session only.
- **The saved copy:** `maxAge` and the saved kinds' `gcTime` set to 21
  days, the longest under the timer limit with some margin. Only the saved
  kinds are written (a filter on what is saved). Among the TVmaze shows,
  only followed ones are saved, since an unfollowed show opened in Show
  detail uses the same key.
- **The hero after a break:** it does not change while the user is on
  Home (CRI-135). So it takes in what the first background refresh after
  a launch, or after coming back to the app, brings; otherwise it would
  keep showing old slides until a pull.

## Still open
- ~~Hero images weekly instead of daily.~~ Decided, see the amendment
  below.

21 days was accepted over 7: it covers a holiday, and works the same way.

## Follow-up, not part of this decision
- **Only changed followed shows.** TVmaze has an endpoint that lists the
  shows updated since a given time (`/updates/shows`). Refreshing only
  the followed shows on it would replace most of the hourly refetches. It
  needs a spike first: its granularity, its size, and how it fits the
  rate limit.

## Consequences
- After up to 21 days away, Home opens at once on what it had and
  refreshes in the background; offline it shows the saved data, with
  "Updated X ago" under the pull.
- After a break, far fewer requests: the TMDB matches and the hero images
  are still there.
- The saved copy gets smaller than today, as passing data is no longer
  saved. That eases Android's limit; its size is measured once this is
  built.
- CLAUDE.md's rule that a fix changing a cached answer changes its cache
  key matters more, since answers are kept longer.

## Amendment: the discovery rows' pages are not saved (2026-10-22)
Status: Accepted (approved with #103, 2026-10-22)

### Context
The decision saved the discovery rows "for the day they belong to, so the
rows also appear at once on a second launch the same day". That never
worked: a row's pages and page number have the launch time in their keys
too, on purpose, so each launch starts the row from the top again
(CRI-96). A launch never reads the pages saved by an earlier one. They
were still saved again on every launch, so they piled up: after a day of
reloads, 564 entries and about 0.6 MB of 5.94 MB, never used (measured on
Images (dev)).

### Decision
The rows' pages and page numbers (`topPicksPage`, `topPicksPageIndex`,
`airingThisWeekPage`, `airingThisWeekPageIndex`) are **not saved**. What
the rows are filled from is still saved: the recommendations, the week's
candidates and their TVmaze info.

### Consequences
- The rows behave as they already did: each launch fills them again,
  from saved answers, without fetching them again.
- The saved copy stops growing with each launch. The entries already
  saved drop out with the next save.
- The followed shows remain most of the saved copy (4.33 MB of 5.94 MB
  with 58 shows), since each holds all its episodes for Show detail.
  Left as is: SQLite has no size limit (CRI-139).

## Amendment: hero images weekly (2026-10-22)
Status: Proposed

### Context
The hero's images (backdrop, logo, and since CRI-100 TMDB's poster) were
asked for again every day per show shown: about one TMDB request per show
a day. "Once a day" was CRI-124's choice, since the highest-rated
backdrop can change as votes come in. A show just out often has no
backdrop yet and shows a poster instead (CRI-100), and should get its
backdrop soon after TMDB does.

### Decision
- A show with a backdrop: asked again after **7 days**. A new top-voted
  backdrop replacing a good one is no hurry.
- A show without one (a poster or nothing): asked again after **1 day**,
  the same split as the TMDB match (found 30 days, a miss 1 day).
- Kept and saved 21 days, as before.

### Consequences
- Most image requests go: a typical day's hero needs one or two instead
  of one per slide.
- A newly top-voted backdrop shows within a week instead of a day.
- TMDB has no request for several shows at once. Several requests for one
  show can be joined (`append_to_response`), but the parts are kept for
  different times; left as an idea alongside the `/updates/shows` spike.
