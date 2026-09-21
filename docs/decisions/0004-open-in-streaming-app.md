# 0004. "Open in [service]"

Status: Accepted (for MVP)

## Context
The user always ends up in a streaming app. A clear action to get there fits
the core promise.

## Decision
Home offers one action, "Open in [service]". It opens the show directly when
we know the service's ID for it, otherwise the service's app. The button
looks the same in both cases. When several services carry the show, a small
menu lets the user choose, and the choice is remembered per show.

## Consequences
- Needs service availability per territory (MVP).
- Service IDs are looked up once when a show is followed and cached, so the
  feature costs nothing to run.
- Coverage of service IDs is uneven; the fallback to the app hides this.
- Brand guidelines for service logos must be checked before release. Fallback:
  the service name as text.
