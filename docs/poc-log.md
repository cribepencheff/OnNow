# PoC week log

The log for the one week test of the Proof of Concept (CRI-70). It checks
the core promise on real use: Home shows which of my series have a new
episode today, and it is correct. See the success criteria in `02-poc.md`.

## How to use

- Fill in once a day, ideally in the morning right after opening the app.
- Keep it short: about two minutes. A few words per line is enough.
- Check what was actually available in the Next Episode app with "Use
  local timezone" switched on, or in the streaming service itself.
- Copy the daily entry template below into "Days", one entry per day.
- Leave a line empty when there is nothing to note.
- Fill in "Setup" on day 1 and "Week summary" at the end.

## Setup

Filled in on day 1.

- **Start date:** Thursday 2026-09-24
- **End date:** Wednesday 2026-09-30
- **App version (commit on `main`):** `5feac47` (after the history cleanup on 2026-09-24; the app code is unchanged since `4853820`)

Shows I follow: at least 5 that I actually watch (success criterion).
The list is the test set from `spikes/README.md`. Follow all of them in
the app before day 1.

"Episodes this week" comes from the TVmaze fixtures in the repo, as local
dates in Europe/Stockholm. The app uses live data, so check the Shows tab
if something looks different.

| #  | Show | Network or service | Episodes this week | Where I watch it in Sweden |
| -- | ---- | ------------------ | ------------------ | -------------------------- |
| 1  | A Knight of the Seven Kingdoms | HBO | none | |
| 2  | Dark Matter | Apple TV | Fri 25 Sep, S2E5 | |
| 3  | Foundation | Apple TV | none | |
| 4  | Killing Eve | AMC+ (ended) | none | |
| 5  | Lanterns | HBO | Mon 28 Sep, S1E7 | |
| 6  | Legends | Netflix | none | |
| 7  | Ludwig | BBC iPlayer | none | |
| 8  | MobLand | Paramount+ | Fri 25 Sep, S2E2 | |
| 9  | Neagley | Prime Video | none | |
| 10 | Only Murders in the Building | Hulu | none (next Tue 8 Dec) | |
| 11 | Paradise | Hulu | none | |
| 12 | Pluribus | Apple TV | none | |
| 13 | Silo | Apple TV | none (next 2027) | |
| 14 | Slow Horses | Apple TV | Wed 30 Sep, S6E3 | |
| 15 | The Agency | Paramount+ | none | |
| 16 | The Bear | Hulu (ended) | none | |
| 17 | The Diplomat | Netflix | none (next Thu 15 Oct) | |
| 18 | The Pitt | HBO Max | none | |
| 19 | Widow's Bay | Apple TV | none | |
| 20 | Hell's Kitchen (extra test show) | Fox | Fri 25 Sep | |
| 21 | Special Forces: World's Toughest Test (extra test show) | Fox | Fri 25 Sep | |

Rows 20 and 21 are extra test shows, not shows I watch. Only 4 of the test
set air this week, so they bring the count to at least 5.

## Daily entry template

Copy this block for each day.

```markdown
### Day N, YYYY-MM-DD

- **Home showed:** (shows and label, for example "NEW TODAY · 1/2" or "TOMORROW · 1/1")
- **Actually available:** (what was out, and where I checked)
- **Correct:** yes / no
- **Wrong day:** (episode, and a guess at why: streaming release without a time, time zone, other)
- **Territory gap:** (episodes shown as new today that were not yet available in Sweden)
- **Calendar:** (anything wrong or odd)
- **Bugs found:** (with Linear issue ID if created, for example CRI-xx)
- **Other notes:**
```

## Days

### Day 1, 2026-09-24

- **Home showed:** four cards labelled "TOMORROW": MobLand, Dark Matter, Hell's Kitchen and Special Forces. At first only Hell's Kitchen and Special Forces, since MobLand and Dark Matter were not followed yet.
- **Actually available:** no new episodes today. All four release on Friday 25 September, which matches the data.
- **Correct:** yes
- **Wrong day:**
- **Territory gap:**
- **Calendar:**
- **Bugs found:** none in the data.
- **Other notes:** the setup was incomplete: not every show in the table was followed. Check the Shows tab against the table. Expo Go first opened an old project from its recent list and showed an old version of the app; scanning the QR code again fixed it. Always open the app by scanning the QR code after Metro restarts.

### Day 2, 2026-09-25

- **Home showed:** four cards labelled "NEW TODAY": MobLand, Dark Matter, Hell's Kitchen and Special Forces.
- **Actually available:** matches the data: all four release today.
- **Correct:** yes
- **Wrong day:**
- **Territory gap:** MobLand S2E2 was out according to IMDb, but not yet on SkyShowtime in the morning (checked without logging in). Likely released later in the day: TVmaze has MobLand's episodes at 12:00 UTC, which is 14:00 in Sweden. So the day is right, but "NEW TODAY" in the morning promised an episode that could not be watched yet. Owner's view: the time of day does not matter, since episodes are watched in the evening anyway (ADR 0001 holds).
- **Calendar:**
- **Bugs found:** none.
- **Other notes:** first day with several releases at once. Design prototype (not the PoC app): the backdrop now changes only when a new episode comes out; check on Wednesday that Slow Horses gets a new backdrop once, on its release day.

### Day 3, 2026-10-02 (territory risk probe)

Checked only the territory risk category (windowed or licensed to Sweden).
Global day and date services (Apple TV+, Netflix, Prime Video) were skipped,
since no territory gap is possible there.

- **Home showed:** MobLand, TODAY, S2E3, with "Open in SkyShowtime".
- **Actually available:** S2E3 has aired (present on IMDb) but is not on
  SkyShowtime Sweden. The dev screen correctly shows Paramount as the network
  and SkyShowtime as the Swedish streaming service.
- **Correct:** no (territory gap)
- **Wrong day:**
- **Territory gap:** MobLand S2E3 is shown as new today with a button to
  SkyShowtime, which does not carry that episode. First confirmed real gap. It
  is windowed rather than a full season behind, so the shape is "the SE
  service lags the original release". Special Forces (day 2) was the other
  candidate and resolved correct (TMDB reported no Swedish service).
- **Calendar:**
- **Bugs found:** none. The gap is a missing data source (availability per
  season and territory), not a bug in existing logic.
- **Other notes:** targeted probe to close the PoC, not a full day log. One
  confirmed gap is enough to establish that the gap happens; frequency is left
  to MVP.

## Questions to watch

Notes collected during the week. Add a dated line whenever something
comes up.

### Do I go to Calendar to see what is coming?

If yes, it supports the idea of a Home carousel for the current week, from
today to the end of the week, with a clear "Today" label.

- 

### Do I look for how to unfollow?

Swipe to unfollow in Shows is hidden. Revisit in the Design phase.

- 

### Do I miss seeing when the data was last updated?

NFR-002 asks the app to show when it was last updated. Home does not show
it.

- 

### How does the calendar feel to use?

The calendar library question is deferred (ADR 0010, CRI-76).

- 

### Do streaming shows without a release time land a day early?

Spike 0001, for example The Bear: a US evening release is the next day in
Sweden. The PoC takes the date from `airstamp` (ADR 0006) to get this
right. Note any show that appears a day early or late.

- 

### Does a show run on a different season in Sweden?

A show can be on a Swedish service with an older season than the one
airing in the US. TVmaze gives the original run, and TMDB gives the
Swedish service per show but not per season, so the app cannot know the
Swedish season or date. This is FR-031 ("Not in Sweden yet"), an MVP
requirement.

- 2026-09-25: Special Forces looked like a case of this. TV4 Play carries
  it as "Elitstyrkans hemligheter USA", season 3, while the US premiere of
  season 5 was today. But PlayPilot keeps the Swedish version as its own
  title and marks "Special Forces: World's Toughest Test" as not available
  in Sweden, which is exactly what TMDB says. So TMDB was right and the
  app's "no Swedish service" is correct here. Two separate titles for the
  same show is its own question for MVP. Watch for a real case during the
  week: a show that is on a Swedish service with a different season.

## Week summary

### Success criteria (`02-poc.md`)

- [x] I can search for and follow a series
- [x] Home shows the correct shows for today, with the next day's episodes on empty days
- [ ] Calendar shows the correct episodes for past and upcoming days (not separately logged this week; no calendar issues seen in daily use)
- [x] The follow list survives a restart
- [x] The app runs on a real iPhone at no cost
- [ ] Over one week, Home matches reality for at least 5 series I actually follow (2 full days plus a day 3 probe; Home correct every time; the full week was not run, closed early by decision, see Conclusion)
- [x] During that week I log where the data was wrong, and why
- [x] During that week I log episodes shown as new today that were not yet available in Sweden (territory gap)

### Counts

| Measure | Count |
| ------- | ----- |
| Days logged | 3 (days 1, 2, and a day 3 territory probe) |
| Days where Home was correct | 2 / 2 |
| Wrong days (episodes on the wrong day) | 0 |
| Territory gaps (shown as new today, not yet in Sweden) | 1 (MobLand S2E3) |
| Bugs found | 0 |

### Conclusion

The core promise holds. On every logged day Home showed the right shows on the
right day, so the date and time logic (ADR 0001, ADR 0006) is confirmed in
real use, including the time of day case (MobLand day 2: NEW TODAY in the
morning before the episode was on SkyShowtime, accepted per ADR 0001).

The territory gap (FR-031) is real but confined. One confirmed case, MobLand
S2E3, shown as new today with "Open in SkyShowtime" while SkyShowtime Sweden
does not carry that episode. The gap can only occur on windowed or licensed
services (Paramount+ via SkyShowtime, Hulu routed titles, Fox). On global day
and date services (Apple TV+, Netflix, Prime Video) it cannot happen by
construction. Special Forces (day 2) looked like a case but TMDB correctly
reported no Swedish service, so it was not a gap.

The measurement was closed after the pattern was saturated rather than after a
full week. n=1 on the real gap establishes that it happens, not how often.
That is enough for the MVP decision: build FR-031 only for the windowed
subset, and leave frequency open until real use shows whether it is weekly or
monthly.

Carry into the retro:

- The log existed in two copies (main folder filled, worktree a blank
  template) and drifted apart. Keep one working folder going into MVP.
- A daily manual log with no automated reminder stalled after day 2. Future
  measurements need a recurring nudge, not discipline.
