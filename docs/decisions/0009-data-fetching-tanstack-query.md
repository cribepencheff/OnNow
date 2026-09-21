# 0009. Data fetching with TanStack Query and query hooks

Status: Accepted

## Context
The app fetches data per followed show from TVmaze (ADR 0005), must show
cached data immediately (NFR-001), work offline and show when it was last
updated (NFR-002), respect rate limits with backoff (NFR-005), and refresh
on start when stale and on pull to refresh (FR-011).

## Decision
Use TanStack Query for all remote data, wrapped in small custom query hooks
(for example `useShow(id)`, `useFollowedEpisodes()`, `useToday()`). Views
use these hooks and never call the API directly.

## Details
- One query per show, keyed by the TVmaze show ID. Duplicate requests are
  merged automatically.
- Stale time is set so that data is refreshed on app start when old, and
  never more often than TVmaze's own one hour cache allows.
- Retries use exponential backoff, including on HTTP 429.
- The query cache is persisted on the device, so the app shows the last
  known data offline and at startup.
- Refetch on app focus is wired to React Native's app state.
- Derived values (today's shows, calendar days, next season) are computed
  in plain, pure functions that the hooks call. These functions carry the
  unit tests (ADR 0008).

## Boundaries
- **The follow list is not in TanStack Query.** It is local user data, kept
  in simple, plain storage of its own. Queries read from it.
- **The widget cannot read the query cache.** When the widget is built
  (after MVP), the app writes a small, plain snapshot of today's episodes
  for it (NFR-006).

## Consequences
- Views stay small and readable, which suits reviewing the code.
- Hooks are tested with a dedicated test query client and TVmaze fixtures.
- Adding TMDB later (MVP) means new hooks, not changes to the views.
