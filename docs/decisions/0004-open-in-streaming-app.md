# 0004. "Open in [service]"

Status: Accepted (for MVP)
Amended 2026-09-23: website fallback added when the app is not installed
(owner decision).
Amended 2026-09-23, "PoC version" (CRI-80): see the section below.

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
