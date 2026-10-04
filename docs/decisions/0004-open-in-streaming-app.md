# 0004. "Open in [service]"

Status: Accepted (for MVP)
Amended 2026-09-23: website fallback added when the app is not installed
(owner decision).
Amended 2026-09-23, "PoC version" (CRI-80): see the section below.
Amended 2026-09-24, TMDB as the source of the Swedish service (CRI-82): see
the last section.
Amended 2026-10-04, coverage across regions (CRI-90): see the last section.

## Context
The user always ends up in a streaming app. A clear action to get there fits
the core promise.

## Decision
Home offers one action, "Open in [service]". It follows a fallback chain:

1. Open the show directly in the service's app, when we know the service's
   ID for it.
2. Otherwise, open the service's app.
3. If the app is not installed, open the service's website.

The button looks the same in every case. When several services carry the
show, a small menu lets the user choose, and the choice is remembered per
show.

## Consequences
- Needs service availability per territory (MVP).
- Service IDs are looked up once when a show is followed and cached, so the
  feature costs nothing to run.
- Coverage of service IDs is uneven; the fallback to the app hides this.
- The website fallback means the action never dead-ends when the app is
  missing. Each service needs a known app link and website address.
- Brand guidelines for service logos must be checked before release. Fallback:
  the service name as text.

## PoC version (amendment 2026-09-23, CRI-80)
- **Source:** TVmaze's `officialSite`, which often is the show's page at the
  service, with the service's own ID. It needs no API key.
- **Services:** only Apple TV (`tv.apple.com`), Netflix (`netflix.com`) and
  HBO Max (`hbomax.com`, `max.com`) get a button; their links were checked
  to land on the right show in Sweden. Every other domain gives no button
  (data first: better no button than the wrong service). Prime Video is
  excluded: TVmaze's `amazon.com` link does not reach the show. The service
  name comes from the domain, not from TVmaze's network ("HBO" is "HBO
  Max").
- **Apple TV rule:** the country segment (for example `/us/`) is removed, so
  the link is not tied to the US store.
- **HBO Max rule:** links are rewritten to HBO Max's own `/show/<id>` form,
  the form its website redirects to; some TVmaze links give a 404 as they
  are.
- **Opening:** the https link is opened as it is, so iOS opens the service's
  app at the show when it is installed, and the website otherwise
  (universal links).
- **Next step:** TMDB watch providers for Sweden (spike 0002), which gives
  the Swedish service for every show. For services without a direct show
  link, the button simply opens the service's app, or its website if the
  app is not installed. No hunting for per-service show IDs.
- **Rejected:** Watchmode. Its free tier (2,500 requests a month, shared by
  all users of one key) is too small, and the next tier is paid (ADR 0002).

## Swedish service from TMDB (amendment 2026-09-24, CRI-82)
- **Source:** TMDB's watch providers for Sweden (data from JustWatch), with
  a free API key (ADR 0002 amendment). A followed show is matched to TMDB
  through its IMDb ID from TVmaze (TheTVDB as fallback), looked up once and
  kept with the show for 30 days (spike 0002).
- **Link:** when TVmaze's official site is on that Swedish service (Apple
  TV, Netflix, HBO Max, with the rules above), the button opens the show
  itself. Otherwise it opens the service's start page from a fixed table
  (Netflix, Prime Video, Disney+, Apple TV, HBO Max, SkyShowtime, Viaplay,
  SVT Play, TV4 Play), as https links so iOS opens the app when installed
  and the website otherwise. A service not in the table gives no button.
- **Several services:** one is picked: a service with a direct show link
  first, otherwise the first in TMDB's order (subscription before free
  and free with ads). The menu (FR-015) stays MVP.
- **No Swedish service:** no button (data first), even when TVmaze has an
  official site.
- **Without a TMDB key, or if the lookup fails:** the keyless PoC version
  above stands in.

## Coverage across regions (amendment 2026-10-04, CRI-90)
Checked on Watch What Happens Live in SE, US and GB, where TMDB lists
operator apps, add-on channels and services the link table did not know.
- **Pay-TV never counts.** Operator bundles, virtual pay-TV and network
  apps that need a TV provider login (fuboTV, YouTube TV, Sling TV, Sky Go,
  Tele2 Play, Telia Play, Allente, Bravo TV and others, listed by TMDB ID)
  give no button and are never named. A real streaming service is picked
  when the show has one; otherwise it reads "Unavailable in [region]"
  (CRI-91, CRI-97; was "Not streaming in [country]").
- **Add-on channels count** ("Hayu Amazon Channel", "... Apple TV
  channel", "... Roku Premium Channel"). The button says what actually
  happens: it names the host app that opens ("Open in Prime Video"), and
  marks the channel as an extra paid subscription with a generic bag icon
  from our icon set (not a store's own mark). In Show detail the bag and
  "Requires hayu subscription" sit on a small line directly below the
  button; in the Home hero the bag sits inside the button, so its height
  stays fixed. Accessibility label: "Open in Prime Video, requires hayu
  subscription". The marker is one reusable component for any service that
  needs an extra subscription. In text (no button): "On hayu via Prime
  Video".
- **A button only when it opens the service itself:** a known start page
  or an add-on channel's host. A service without a start page gets no
  button. Instead, the info area below the hero lists every streaming
  service TMDB gives, comma-separated, in TMDB's order and names ("On
  Crunchyroll, HIDIVE"). "Unavailable in [region]" goes in the same place
  when there is no service in the user's region (CRI-91, CRI-97; was "Not
  streaming in [country]"). Rows in Shows and Search say plain
  "Unavailable". A fallback to TMDB's where-to-watch page was built and dropped
  (owner, 2026-10-04): the button would not open the service.
- **Order:** the show's own page, then a known service's start page, then
  an add-on channel's host; TMDB's order within each.
- **More start pages,** each checked to load: Hulu, Peacock, Starz, AMC+,
  discovery+, The Roku Channel and Tubi (US); NOW, BBC iPlayer, ITVX,
  Channel 4, 5 and hayu (UK); MUBI; and the extra TMDB IDs for Netflix and
  Prime Video with ads. Crunchyroll's site sits behind a Cloudflare bot
  check, so its start page was verified as its own domain rather than by an
  automated page load. Without it, Frieren in Sweden opened the Crunchyroll
  Amazon Channel even though TMDB lists Crunchyroll itself.

