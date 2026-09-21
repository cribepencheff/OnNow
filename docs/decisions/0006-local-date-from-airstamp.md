# 0006. Local release date from `airstamp`

Status: Accepted
Refines: 0001 (definition of "today"), 0005 (data sources)

## Context
ADR 0001 says an episode belongs to today if it is released on today's date
in the user's time zone. TVmaze offers two date fields: `airdate` (the date
in the network's time zone) and `airstamp` (a full timestamp).

The spike 0001 follow-up found:
- 14 of 126 checked 2026 episodes have an `airdate` one day earlier than the
  Stockholm date from `airstamp`. All of them are HBO shows airing late in
  the US evening (Lanterns, A Knight of the Seven Kingdoms).
- `airstamp` is always present. `airtime` is missing only for streaming (web
  channel) shows.
- When `airtime` is missing, TVmaze fills `airstamp` with a placeholder time,
  so the Stockholm date equals `airdate`. Example: The Bear season 5 was
  released at 9 p.m. ET on June 25 (June 26 in Sweden), but TVmaze has no
  real time for it, so we would show it on June 25.

## Decision
The app derives an episode's date from `airstamp`, converted to the user's
time zone. No manual offset setting, and no rules of our own per service.

## Consequences
- Late US evening broadcasts (the HBO cases) land on the correct day in
  Sweden.
- Streaming releases without a published time can be one day early for
  Swedish users when the service releases in the US evening. This is a
  limitation of the data source, not something the app can fix without
  maintaining its own facts (principle: data first).
- Most streaming releases are unaffected, since they happen at a time that
  gives the same date in Sweden (for example Slow Horses, verified).
- The PoC week test logs every case where an episode appears on the wrong
  day. If it is common, we revisit this with a new ADR.
- Specials need no filtering: TVmaze excludes them from the default episode
  lists and only returns them with `?specials=1` (FR-037).
