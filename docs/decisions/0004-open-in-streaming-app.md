# 0004. "Open in [service]"

Status: Accepted (for MVP)
Amended 2026-09-23: website fallback added when the app is not installed
(owner decision).

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
