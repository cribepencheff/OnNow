# 0001. Definition of "today"

Status: Accepted

## Context
Streaming services release at different times of day, often at one global
time. The app must decide which episodes count as today.

## Decision
An episode belongs to today if its release falls on today's date in the
user's time zone. Home shows no time of day and does not split today into
"out now" and "later today". The streaming service shows the details.

## Consequences
- The exact time of release matters less, which makes the data easier.
- An episode released at 09:00 counts as today, even when the app is opened
  at 07:00, before it can be watched. This is accepted.
- A widget can update once a day instead of at each release time.
- Past days are reached through Calendar, not through a "Yesterday" section.
