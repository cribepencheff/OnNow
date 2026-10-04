# 0015. FR-031 in the MVP: say only what the data knows

Status: Accepted (CRI-89)

## Context
FR-031 asked for episodes whose season is not available in the user's
region to be labelled "Not in [country] yet" and not counted as new today.
TMDB cannot tell this apart (spike 0002), and TVmaze only knows the
premiere service.

Spike 0003 found one free source that can: the Streaming Availability API
(Movie of the Night, via RapidAPI). It reads availability per episode and
per country. On MobLand season 2 in Sweden, SkyShowtime added each episode
about four days after the US premiere on Paramount+, and S2E3 had no option
in Sweden on 2026-10-04.

The free plan is 1,000 requests a month. The key would ship in the app, so
that budget is shared by every install, in every region (ADR 0014). It does
not hold once the app is used outside one household.

## Decision
The MVP does not use Streaming Availability. FR-031 in the MVP says only
what the data knows:
- **Episode dates are the original premiere** and are labelled as such,
  with the premiere service TVmaze gives. For example: "Premieres today on
  Paramount+".
- **"Open in" says the series is on a service** in the user's region (TMDB,
  ADR 0004, ADR 0014). It never says the episode is there.
- **No "Not in [country] yet" label.** An episode still counts as new on
  its premiere day, wherever the user is.

The wording changes land with the Home work; nothing in the UI changes with
this ADR.

## Amendment (CRI-91)
The premiere wording above was tried on Home and dropped by the owner:
"Premieres Fri 9 Oct on Paramount+" read wrong on a mid-season episode,
and most slides are regular episodes. The original network is also left
out of the UI app-wide, since it says nothing about where the user can
watch.
- **Dates are shown as the date, with no verb and no network:** "Fri 9 Oct ·
  S2E4", with the episode title on the line below. They are still the
  original air date.
- **Where to watch is only "Open in"** (ADR 0004, ADR 0014). The network
  stays in the data model.
- "Season 3 premiere" labels for episode 1 of a season are kept (PRD 5.4,
  5.5): they state a fact about the episode, not where it airs.

## Path for a public release
Season and episode availability per region needs Streaming Availability,
or a source like it, behind our own server on a paid plan. From spike
0003:
- **Read it per episode.** A season lists a service as soon as one episode
  is out, so season-level data would claim the whole season.
- **Expect a lag.** SkyShowtime Sweden ran about four days behind the US
  on MobLand. The data itself is indexed daily, and sometimes later: in the
  US, S2E3 on Paramount+ was missing two days after it aired. So the label
  can come a few days late.
- **Count only subscription and free options.** Add-on channels (for
  example Prime Video Channels) would otherwise hide most gaps.
- **Missing services:** Viaplay, SVT Play, TV4 Play and BritBox are not
  covered in Sweden. Where the source does not cover the show's service,
  show nothing.
- **Quota:** 1,000 requests a month on the free plan (RapidAPI and direct
  alike). One request returns every season and episode of one show for one
  country. Caching and commercial use are allowed; attribution is required.

That needs a server, which breaks "no backend" (ADR 0002). It is a decision
for the release phase, not the MVP.

## Consequences
- Users may see an episode as new before their local service has it. The
  label says it is the original premiere and where it premiered, so it does
  not promise otherwise.
- FR-031 is split: the honest premiere wording is MVP, and the territory
  label moves to "After MVP".
- No API key, request budget or attribution for availability in the MVP.
