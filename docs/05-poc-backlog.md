# PoC backlog

Milestone: **Phase 1: Proof of Concept** in the Linear project **On Now**.
Scope: `02-poc.md`. Each section below is one Linear issue. Linear holds
status and order; this file holds the content.

| Section | Linear issue | Blocked by |
| ------- | ------------ | ---------- |
| 1. Project setup | CRI-60 | |
| 2. TVmaze client and fixtures | CRI-61 | CRI-60 |
| 3. Date and episode logic | CRI-62 | CRI-61 |
| 4. Follow list storage | CRI-63 | CRI-60 |
| 5. Data fetching hooks | CRI-64 | CRI-62, CRI-63 |
| 6. Search sheet | CRI-65 | CRI-64 |
| 7. Home | CRI-66 | CRI-64 |
| 8. Calendar | CRI-67 | CRI-64 |
| 9. Shows list | CRI-68 | CRI-64 |
| 10. End to end flow | CRI-69 | CRI-65 to CRI-68 |
| 11. PoC week log | CRI-70 | CRI-69 |

Every issue follows the working rules in `CLAUDE.md`: tests first, one
branch and one pull request per issue, no merge with failing checks.

---

## 1. Project setup
Labels: `poc`, `setup`
**Goal:** an empty app that runs in Expo Go, with all checks in place.
**Includes:**
- Expo with TypeScript in strict mode (ADR 0007)
- ESLint, Prettier, Jest with `jest-expo`, React Native Testing Library
  (ADR 0008)
- GitHub Actions running typecheck, lint and tests on every pull request
- Tab navigation with three empty tabs: Home, Calendar, Shows
- Folder structure that separates API, pure logic, hooks, storage and views
**Done when:** the app opens in Expo Go on a real iPhone, CI is green, and
one example test runs.

## 2. TVmaze client and fixtures
Labels: `poc`, `data`
**Requirements:** NFR-005, NFR-007
**Goal:** a small typed client for the TVmaze endpoints the PoC needs
(search, show with episodes and seasons).
**Includes:**
- Types for the fields listed in spike 0001
- Rate limiting under 20 requests per 10 seconds, backoff on HTTP 429
- Fixtures: real responses for the test set in `spikes/README.md`, stored
  in the repo
**Done when:** client tests pass against fixtures, and the TVmaze credit is
prepared for display (CC BY-SA).

## 3. Date and episode logic
Labels: `poc`, `logic`
**Requirements:** FR-004, FR-006, FR-012, FR-037, ADR 0001, ADR 0006
**Goal:** pure functions for everything the views need to decide.
**Includes:**
- Local date from `airstamp` in the user's time zone
- Which followed shows have an episode today
- Next upcoming episode when today is empty
- Whole-season releases grouped into one item
- Next announced episode or season, or show status as TVmaze states it
  (FR-035, data first)
- Specials never included
**Done when:** unit tests pass in Europe/Stockholm, America/New_York and
Asia/Tokyo, including daylight saving changes, using fixtures (The Bear,
HBO cases, Slow Horses).

## 4. Follow list storage
Labels: `poc`, `data`
**Requirements:** FR-002, FR-003, NFR-004, NFR-006
**Goal:** follow and unfollow, stored on the device in plain, shareable
form (ADR 0009: not in the query cache).
**Done when:** the list survives an app restart, with tests.

## 5. Data fetching hooks
Labels: `poc`, `data`
**Requirements:** FR-011, NFR-001, NFR-002, NFR-005, ADR 0009
**Goal:** TanStack Query with a persisted cache, and query hooks
(`useShow`, `useFollowedEpisodes`, `useToday`).
**Includes:**
- Cached data shown immediately on start
- Refresh on start when stale, never more often than hourly per show
- Pull to refresh, and "last updated" available to views
- Refetch when the app returns to the foreground
**Done when:** hook tests pass with a test query client and fixtures.

## 6. Search sheet
Labels: `poc`, `ui`
**Requirements:** FR-001, FR-007, FR-024, FR-025, PRD 5.4
**Goal:** find and follow shows.
**Includes:**
- Sheet opened by "+" on Home and by the search field in Shows
- Results while typing: poster, title, year, status, two line summary
- Follow circle at the right edge: hollow "+" to filled check
- After following, the row shows the next episode or status
- "Done" at the bottom, swipe down to close
- Matching on name, premiere year and network (spike 0001)
**Done when:** component tests cover empty, results, no results and
followed states.

## 7. Home
Labels: `poc`, `ui`
**Requirements:** FR-004, FR-005, FR-006, FR-012, FR-013, PRD 5.1
**Goal:** today's shows, in simple form (visual design comes later).
**Includes:**
- One card per show with an episode today, swipe between cards
- Count label ("NEW TODAY · 1/3")
- Empty day shows the next upcoming episode
- "+" in the header
- Empty follow list shows "Add your first show"
**Done when:** component tests cover today with one, several and no shows,
and an empty follow list.

## 8. Calendar
Labels: `poc`, `ui`
**Requirements:** FR-008, FR-009, FR-036, PRD 5.2
**Goal:** month grid with days marked, and the selected day's episodes.
**Includes:**
- Swipe between months, today preselected, marked days with a line
- Day list with poster, show, episode code and title
- "Today" button when away from today
**Done when:** component tests cover marked days, an empty day and moving
back to today.

## 9. Shows list
Labels: `poc`, `ui`
**Requirements:** FR-010, FR-035, PRD 5.3
**Goal:** the followed shows with next episode or status.
**Includes:**
- Search field on top that opens Search
- Swipe to unfollow
- Shows between seasons show the next announced date or the status
- TVmaze credit
**Done when:** component tests cover running, between seasons and ended
shows.

## 10. End to end flow
Labels: `poc`, `test`
**Requirements:** ADR 0008
**Goal:** a Maestro flow: open the app, search a show, follow it, close
search, see it in Shows and on Home or as next episode.
**Done when:** the flow passes locally in the iOS simulator.

## 11. PoC week log
Labels: `poc`, `docs`
**Requirements:** success criteria in `02-poc.md`
**Goal:** a simple log template (`docs/poc-log.md`) for the one week test:
per day, what Home showed, what was actually available, and any wrong day
or territory gap.
**Done when:** the template exists and the week has started.
