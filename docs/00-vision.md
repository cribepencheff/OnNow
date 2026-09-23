# Vision

Working name: **On Now**

## Core promise
I open the app and see, within two seconds, which of my series have a new
episode today, and it is correct.

## Problem
Following series across several streaming services means either checking
several apps or using a general tracker packed with features I do not need.
The simple answer to "what came out today?" gets buried.

## Product
A radar for TV series. Stripped down by design, one job done well: show what
came out today, with a calendar for everything before and after.

## Who it is for
People who follow several series across several streaming services and want
a glance, not a tracker. The first user is me.

## Principles
1. **Today first.** Home answers the core promise before anything else.
2. **Radar, not tracker.** No watched/unwatched bookkeeping.
3. **Stripped.** A feature earns its place only if it serves the core promise.
   As few settings as possible: we make the decision instead of adding a
   setting (for example, specials are simply not shown).
4. **Cinematic.** The app should feel like a premium streaming service, not a
   database. Two goals live side by side: the two second answer and an
   exclusive, cinema-like feeling.
5. **No account.** The follow list lives on the device.
6. **Free to run.** Free data sources and no backend. Store fees are the only
   accepted fixed cost, and they are paid only when we release.
7. **Correct over clever.** When data is uncertain, fall back gracefully
   instead of guessing.
8. **Data first.** The content shows what the data sources provide, in their
   terms. We do not derive, invent or maintain our own facts. The less we
   have to solve ourselves, the better.
9. **English only.** Original show titles. Dates and times follow the phone's
   settings.

## The feeling of Home
> Home feels like standing in front of a cinema poster. One show fills the
> screen, the image carries the experience, and the text only tells you what
> is new today. Everything else steps back.

## Design direction (concept)
Details are settled in the Design phase. These ideas guide it:
- **One primary action per view.** It gets the accent colour, or white
  against the dark app. Everything else stays quiet.
- "+" on Home is a primary action. Search closes with a quiet round close
  button, as iOS sheets do. A filled accent circle with a check marks a
  followed show; it is a status, not an action.
- The accent colour has two uses only: the one primary action per view, and
  small status marks (follow check, calendar day line).
- **Visual references:** a dark, soft interface with deep near-black
  surfaces, a hint of colour in the background, rounded cards, pill shaped
  buttons and one clear accent colour (reference: a dark fintech app concept
  shared during Discovery). Combined with the cinematic imagery of Apple TV
  and Netflix.

## Definition of "today"
An episode belongs to today if it is released on today's date in the user's
time zone. Home does not split today into "out now" and "later today".
See `decisions/0001-definition-of-today.md`.

## Structure
A tab bar with three tabs:
1. **Home**: today's episodes from followed series.
2. **Calendar**: followed series only, past and future.
3. **Shows**: search and follow, and the list of followed series.

A "+" on Home is the clear call to action for adding shows. It opens the same
search as Shows.

## Not doing
Watched/unwatched tracking, movies, ratings and reviews, charts and
recommendations, trailers and video previews, social features, accounts and
sync, importing from other apps, localization, ads.

## Reference apps
- **Next Episode:** a full tracker. Its Home and Calendar are close to ours,
  everything around them is what we leave out.
- **Up Next:** free, private, no account. Closest in spirit, still
  tracker-leaning.
- **Apple TV app:** the hero area and the cinematic feel.
- **Netflix:** the large portrait poster card on Home.
- **Shazam:** the single, clear "Open in [service]" action.

## Open product questions
See `01-prd.md`, section 9.
