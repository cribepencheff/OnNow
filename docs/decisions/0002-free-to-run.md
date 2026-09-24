# 0002. Free to run

Status: Accepted
Amended 2026-09-23: API keys are acceptable when the service is free for
this use. Paid tiers are not (owner decision).

## Context
The project should cost nothing until it has users.

## Decision
No backend, no accounts, no ads, free data sources only. API requests go
directly from the device. Store fees are the only accepted fixed cost, paid
at release.

## Consequences
- Notifications are local, not push.
- Anything that costs money waits for the conditional Growth phase.
- Data source terms must allow free use; see 0005.
