# Proof of Concept (PoC)

## Purpose
Prove the core promise on real data: I open the app and see, within two
seconds, which of my series have a new episode today, and it is correct.

Built as a walking skeleton: the thinnest end to end slice through data,
logic and UI. Runs on my own iPhone only. Function before form; the visual
design comes in the Design phase.

## In scope
- Home, Calendar, Shows and Search as described in `01-prd.md`, in simple form
- Show detail, PoC slice (no services, no Open in, no territory)
- Requirements FR-001 to FR-013, FR-024, FR-025, FR-028 to FR-030,
  FR-032 to FR-037 (FR-028, FR-029 and FR-032 in part, see `01-prd.md`
  section 6)
- Local storage of the follow list
- One data source, no key if possible

## Out of scope
Everything tagged MVP or later in `01-prd.md`: "Open in", territory,
notifications, settings, widget, polished visuals.

## Success criteria
- [ ] I can search for and follow a series
- [ ] Home shows the correct shows for today, with the next day's episodes on empty days
- [ ] Calendar shows the correct episodes for past and upcoming days
- [ ] The follow list survives a restart
- [ ] The app runs on a real iPhone at no cost
- [ ] Over one week, Home matches reality for at least 5 series I actually follow
- [ ] During that week I log where the data was wrong, and why
- [ ] During that week I log episodes shown as new today that were not yet
      available in Sweden (territory gap, see `01-prd.md` section 9)

## Technical spikes to run first
See `spikes/`. Spike 0001 (TVmaze data quality) must be done before the PoC.

- Does the data source give reliable release dates for streaming episodes?
- How good is the coverage of images (posters) for the series I follow?
- Can we get streaming availability per season and territory for free?
