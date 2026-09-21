# 0008. Testing strategy

Status: Accepted

## Context
The repository is public and part of the owner's portfolio. Code is written
by Claude Code and reviewed by the owner. The biggest risk is in data and
date logic (ADR 0001, 0006), not in the UI.

## Decision
Four levels of checks.

1. **Static checks, on every change:** TypeScript in strict mode, ESLint and
   Prettier.
2. **Unit tests (Jest, `jest-expo` preset):** all logic, with high coverage.
   - Date logic: `airstamp` to local date, tested in several time zones
     (Europe/Stockholm, America/New_York, Asia/Tokyo) and around daylight
     saving changes.
   - What counts as today, grouping of whole-season releases, next season
     status, specials excluded.
   - Fixtures are real TVmaze responses from the spike test set (for example
     The Bear, the HBO cases, Slow Horses), stored in the repo.
3. **Component tests (React Native Testing Library):** each view renders the
   right thing in each state (empty day, several shows, followed or not,
   "Not in Sweden yet").
4. **End-to-end tests (Maestro):** key flows in the simulator, written as
   short YAML files. First flow: open the app, follow a show, see it on
   Home.

## Working rules
- Tests are written first. Claude Code iterates until they pass.
- Tests reference requirement IDs (for example `FR-004`) in their names or
  descriptions, so each test shows which requirement it protects.
- GitHub Actions runs levels 1 to 3 on every pull request. A pull request
  with failing checks is not merged.
- End-to-end tests run locally at first, in CI later.
- Coverage is judged by what matters (the logic), not by a percentage for
  the whole app.

## Consequences
- The owner can review what should work by reading the tests, not only the
  code.
- Fixtures must be refreshed if TVmaze changes its response format.
- The PoC week test (manual, real use) remains the final check of the core
  promise.
