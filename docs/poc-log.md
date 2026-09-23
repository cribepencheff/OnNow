# PoC week log

The log for the one week test of the Proof of Concept (CRI-70). It checks
the core promise on real use: Home shows which of my series have a new
episode today, and it is correct. See the success criteria in `02-poc.md`.

## How to use

- Fill in once a day, ideally in the morning right after opening the app.
- Keep it short: about two minutes. A few words per line is enough.
- Copy the daily entry template below into "Days", one entry per day.
- Leave a line empty when there is nothing to note.
- Fill in "Setup" on day 1 and "Week summary" at the end.

## Setup

Filled in on day 1.

- **Start date:**
- **End date:**
- **App version (commit on `main`):**

Shows I follow: at least 5 that I actually watch (success criterion).

| # | Show | Network or service | Where I watch it in Sweden |
| - | ---- | ------------------ | -------------------------- |
| 1 |      |                    |                            |
| 2 |      |                    |                            |
| 3 |      |                    |                            |
| 4 |      |                    |                            |
| 5 |      |                    |                            |
| 6 |      |                    |                            |
| 7 |      |                    |                            |

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

(Paste each day's entry here, newest at the bottom.)

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

## Week summary

Filled in at the end of the week.

### Success criteria (`02-poc.md`)

- [ ] I can search for and follow a series
- [ ] Home shows the correct shows for today, with the next day's episodes on empty days
- [ ] Calendar shows the correct episodes for past and upcoming days
- [ ] The follow list survives a restart
- [ ] The app runs on a real iPhone at no cost
- [ ] Over one week, Home matches reality for at least 5 series I actually follow
- [ ] During that week I log where the data was wrong, and why
- [ ] During that week I log episodes shown as new today that were not yet
      available in Sweden (territory gap, see `01-prd.md` section 9)

### Counts

| Measure | Count |
| ------- | ----- |
| Days logged | |
| Days where Home was correct | / |
| Wrong days (episodes on the wrong day) | |
| Territory gaps (shown as new today, not yet in Sweden) | |
| Bugs found | |

### Conclusion

Input to the phase retrospective: does the PoC deliver on the core promise,
what was wrong and why, and what to carry into the next phase.

- 
