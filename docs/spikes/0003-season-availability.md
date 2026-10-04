# Spike 0003: Territory availability per season

Status: Done (2026-10-04). Answered by step 1.
Feeds into: FR-031 ("Not in [country] yet"), ADR 0005, ADR 0014

## Question
Which free source says whether a season, or an episode, of a show is
available in the user's region? Test case: MobLand (IMDb tt31510819,
TVmaze 75026). Season 2 airs on Paramount+, and SkyShowtime Sweden did not
have S2E3 on 2026-10-02. SE is the main case; the source must also work for
at least US and GB.

Already ruled out, not checked again: TVmaze (premiere service only, no
territory data) and TMDB's per-series watch providers (spike 0002).

## Method
Check the sources in order and stop at the first that answers reliably:
0. TMDB season watch providers
1. Streaming Availability API (Movie of the Night)
2. Watchmode
3. A proxy market for SkyShowtime (NL, PL, ES) if Sweden is missing

## Results

### 0. TMDB season watch providers: already answered, no
Spike 0002 called exactly this endpoint
(`/tv/{id}/season/{n}/watch/providers`) for MobLand season 1 and season 2,
region SE, on 2026-09-24. Both returned SkyShowtime: the season data mirrors
the series level. TMDB cannot tell that a season is not available in a
region yet. It was not run again.

### 1. Streaming Availability API: yes, at episode level
Called through RapidAPI on 2026-10-04:
`GET /shows/tt31510819?country=<cc>&series_granularity=episode`.
The raw responses are in `spikes-scratch/` and are not committed.

**MobLand season 2, subscription and add-on options per episode:**

| Episode | SE | US | GB |
| ------- | -- | -- | -- |
| S2E1 | SkyShowtime from 2026-09-22, Prime add-on | Paramount+ from 2026-09-18, Prime and Roku add-ons | Paramount+ and Prime from 2026-09-25 |
| S2E2 | SkyShowtime from 2026-09-29, Prime add-on | Paramount+ from 2026-09-25, add-ons | Paramount+ and Prime from 2026-09-25 |
| S2E3 | **none** | Roku add-on only (2026-10-04) | none |
| S2E4 to S2E10 | none | none | none |

Season 1 is on SkyShowtime in SE for all 10 episodes, plus Prime and Apple
TV add-ons.

What this shows:
- **It answers FR-031 for Sweden.** S2E3 has no option in SE, which matches
  the owner's observation on 2026-10-02. SkyShowtime adds each episode about
  four days after the US: S2E1 on 2026-09-22 against 2026-09-18, S2E2 on
  2026-09-29 against 2026-09-25.
- **Read it at episode level, not season level.** Season 2 lists SkyShowtime
  as soon as one episode is out, so a season-level check would wrongly say
  the whole season is available.
- **The SE gap is real, but the data also lags.** In the US, S2E3 aired on
  Paramount+ on 2026-10-02, but the API listed only a Roku add-on two days
  later. Data is updated daily (pricing FAQ), but some services take
  longer. So "no option" can mean "not indexed yet". The app should only say
  "Not in [country] yet" for an episode that has aired and has no option,
  and accept that this is sometimes a few days late.
- Each option carries an `availableSince` timestamp. It could replace the
  US air date for "new today" in the user's region. That is a product
  decision, not part of this spike.
- **Two kinds of option:** `subscription` is the service itself. `addon` is
  a channel sold inside another service (for example Prime Video Channels).
  For FR-031, availability should probably mean `subscription` or `free`
  only, otherwise Prime add-ons would hide most gaps.

**Coverage (from the docs, countries and services page):**
- **65 countries**, including **SE, US and GB**.
- **Sweden:** Netflix, Prime Video, Disney+, HBO Max, Apple TV, Mubi,
  Curiosity Stream, Pluto TV, Crunchyroll, **SkyShowtime**, Zee5.
  - Missing for Sweden: Viaplay, SVT Play, TV4 Play, BritBox. Of the test
    set, Ludwig (BritBox, TV4 Play) would not be covered: there the source
    knows nothing, and the app must show nothing rather than "Not in Sweden
    yet".
- **SkyShowtime** is covered in 17 markets: BG, CZ, DK, ES, FI, HR, HU, MK,
  NL, NO, PL, PT, RO, RS, SE, SI, SK.

**Limits (RapidAPI free plan, read from the response headers):**
- `x-ratelimit-api-request-limit: 1000`, resetting after about 31 days:
  **1,000 requests a month**, not 100 a day. This is the same as the
  provider's own free plan.
- One request returns every season and episode for one country.
- The key ships in the app, so the limit is shared by all installs.

**Terms (pricing FAQ):**
- Attribution is required when the data is shown publicly. The exact form
  is on the Terms & Conditions page and must be read before building.
- Local caching is allowed for as long as needed.
- Commercial use is allowed on every plan, including the free one.

### 2. Watchmode: from docs and secondary sources only
- Free key, 1,000 requests a month (ADR 0004 noted 2,500 earlier; the free
  tier seems to have shrunk).
- Several sources state the **free tier returns US data only**. Paid plans
  cover 50+ countries. If that holds, Watchmode cannot answer SE on the free
  tier.
- Episode-level sources exist (`/title/{id}/episodes`).

### 2. Watchmode and 3. proxy market: not run
Step 1 answered the question, so Watchmode was not called and no proxy
market was needed. The notes from its docs above stand: its free tier is
reportedly US only.

## Decision (owner, 2026-10-04)
Not used in the MVP: the free quota (1,000 requests a month, shared by every
install in every region) does not hold. FR-031 in the MVP says only what
the data knows, and this source is the recorded path for a public release
with our own server and a paid plan. See ADR 0015. The key has been removed
from `.env`.

## Recommendation (as written before the decision)
Use **Streaming Availability (via RapidAPI)** for FR-031, in a new ADR. It
is the only free source found that gives availability per episode and per
country, it covers Sweden with SkyShowtime as well as US and GB, and its
terms allow caching and commercial use.

How to use it:
- **When to ask:** only for followed shows that have aired episodes in the
  newest season but not all of them in the user's region. One request per
  show per region, cached for a day.
- **What counts as available:** an aired episode with a `subscription` or
  `free` option in the region.
- **When to show "Not in [country] yet":** an aired episode with no such
  option. If the source does not cover the show's service in that country,
  show nothing (data first).
- **What to accept:** the label can be a few days late, because the data is
  indexed daily and sometimes later.

Open points before building:
- **Budget.** 1,000 requests a month is enough for the owner and a few
  friends, with the cache above. It is not enough for a public release on
  one shared key.
- **Attribution.** Read the exact attribution terms.
- **Watchmode** was not checked with a key. It is not needed unless the
  budget rules this source out.
