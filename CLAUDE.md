# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project
**On Now** (working name) is a stripped, cinematic iOS app (Android later)
that shows which followed TV series have a new episode today, with a
calendar for past and upcoming episodes. Free to run: no backend, no
accounts, free data sources only.

Current phase: **MVP**.

## Read first
- `docs/00-vision.md`: core promise and principles
- `docs/01-prd.md`: views and requirements (`FR-xxx`, `NFR-xxx`)
- `docs/02-poc.md`: what the PoC includes
- `docs/decisions/`: accepted decisions (ADRs). Do not contradict them. Propose
  a new ADR instead.
- `docs/spikes/`: planned and completed investigations

## Principles that affect code
- **Today** means today's date in the user's time zone. Never show a time of
  day (ADR 0001).
- **Data first.** Show what the data source provides, in its terms. Do not
  derive or invent facts, statuses or wording. When data is missing, show
  nothing rather than a guess.
- **Free to run.** No backend, no paid APIs, no API keys committed to the
  repo.
- **Stripped.** Do not add features that are not in the PRD. Prefer a fixed
  decision over a setting.
- **No specials.** Only regular episodes are shown (FR-037).

## Language and copy
- All code, comments, documentation, commit messages and issues are in
  English.
- UI copy is in English, with original show titles.
- Do not use em dashes or dashes as sentence punctuation in UI copy or
  documentation. Use a comma, colon or a new sentence.

## Stack
Expo with React Native and TypeScript (ADR 0007).
- Also follow `AGENTS.md` (Expo's own guidance for agents): check the Expo
  SDK version in `package.json` and use the matching versioned docs, never
  memory. Add packages with `npx expo install`.
- TypeScript in strict mode.
- Keep the app runnable in Expo Go for as long as possible; flag any library
  that would require a development build before adding it.
- Keep storage plain and shareable so a future widget can read it
  (NFR-006).
- The owner reviews the code but does not write it: prefer clear, readable
  code over clever code, and explain structural choices in PR descriptions.

## Data fetching (ADR 0009)
- All remote data goes through TanStack Query, wrapped in custom query
  hooks (`useShow`, `useFollowedEpisodes`, `useToday`). Views never call
  the API directly.
- Derived values are computed in pure functions, separate from hooks and
  views, so they can be unit tested.
- The follow list lives in its own plain local storage, not in the query
  cache.
- **A fix that changes a cached answer changes its cache key.** When a fix
  changes what a cached lookup should return, bump that cache's key (or
  drop its old entries) in the same PR, so a stale answer cannot outlive
  the fix. Check every layer: the persisted query cache
  (`onnow.queryCache`) and plain storage. A storage expiry does nothing
  while a query with `staleTime: Infinity` keeps serving the old answer
  (CRI-102).
- **Time-based decisions check the clock when they act.** Whether data is
  stale, or a day has passed, is decided at the moment of the action (a
  pull, a tap, a launch) against the current time, for example
  `query.isStaleByTime(ms)`. Never use TanStack's `isStale`, its
  `stale: true` filter, or any value computed at the last render: they
  only change when the screen redraws, so an app left open past the limit
  would skip the refresh (CRI-95, CRI-96).

## Testing (ADR 0008)
- Write tests first, then iterate until they pass.
- Levels: TypeScript strict + ESLint + Prettier, Jest unit tests for all
  logic, React Native Testing Library for components, Maestro for end to
  end flows.
- Date logic is tested in several time zones and around daylight saving
  changes, using real TVmaze fixtures from the spike test set.
- Reference requirement IDs (for example `FR-004`) in test names.
- Never merge with failing checks. Do not weaken or delete a test to make it
  pass; explain the failure instead.
- A Husky pre-push hook (`.husky/pre-push`) runs `tsc --noEmit`, `expo lint`
  and `test:ci`, and blocks the push if any of them fail.

### When to run what
Avoid running the same checks twice.
- **While working:** run only the tests related to the files you change,
  for example `npx jest <test paths>` or
  `npx jest --findRelatedTests <changed files>`.
- **Before pushing:** do not run the full `tsc`, lint and test suite by
  hand. The pre-push hook runs it on `git push`; rely on that and report
  its result.
- **Maestro:** run the end to end flow (`npm run e2e:work`, its own Metro
  on port 8082 so it never touches the owner's phone session on 8081) only
  when a change touches Search, Home, Shows or navigation, or when asked.

## Spikes
- Spike code is throwaway. Put it in `spikes-scratch/` (git ignored), never
  in the app source.
- Write findings into the spike's file under `docs/spikes/`, section
  "Results", and update its status.
- Do not commit anything from `spikes-scratch/`.

## Git and planning
- Planning and status live in Linear (project "On Now", issues CRI-xx).
  Decisions and content live in `docs/`. Do not copy docs into Linear.
- Do not commit or push unless asked, or unless the work falls under an
  "Owner review gates" rule below that already authorizes it.
- Always start a new branch from the latest `main`: `git fetch origin &&
  git switch -c <branch> origin/main`, in the repo.
- One Linear issue, one branch, one pull request is the default, not a hard
  rule. There is no other reviewer on this project, so the point of a PR
  boundary is a clean revision history and a clear record of what changed
  and why, not a small diff for someone else to read. When several backlog
  issues are small, non-UI, and naturally related (for example they touch
  the same layer, or one exists mainly to unblock the next), batch them
  into a single branch and PR instead of one each. Reference every issue ID
  the branch covers in the PR title and description (for example
  `CRI-63, CRI-64: Follow list storage and data fetching hooks`). Update
  each covered issue's Linear status individually. Keep issues with a
  visible UI change on their own PR, since those already have a separate
  review gate below and merging them together would block that gate on
  unrelated work.
  Branch names use a type
  prefix and a short description, without the issue ID: `feat/`, `fix/`,
  `chore/`, `docs/`, `test/` (for example `chore/project-setup`,
  `feat/home`). `feat` is for things the user notices; `chore` is for
  tooling and infrastructure. Put the issue ID first in commit titles and
  PR titles (for example `CRI-60: Project setup`). Reference requirement
  IDs (`FR-004`) and ADRs in PR descriptions.
- Never add `Co-Authored-By` trailers, "Generated with Claude Code" lines or
  similar attribution to commit messages or PR descriptions, including in
  suggested messages.
- Explain what a Git operation will do before running anything that rewrites
  history or touches shared branches.
- For issues with no visible UI change (pure logic, data, storage, hooks),
  once verification passes: commit, push, open the PR and merge it without
  waiting for review. Verification means the related tests while working
  and the pre-push hook on push, see "When to run what" under Testing.
- For issues with a visible UI change (screens and views the owner would
  look at in Expo Go): open the PR as usual, but do not merge it. Wait for
  the owner to test it in Expo Go and approve it explicitly in chat, for
  example "approved #11". Passing tests and Claude Code's own review are
  not approval. Never merge a gated PR without that explicit approval.
- After merging any PR: move its Linear issue to Done, pull `main` in the
  main folder (so a reload on the owner's phone picks up the change), and
  merge `main` into any other open branch that was created before it.
- For intermediate steps within a batched PR (finishing one of several
  issues it covers, a retry after a fix), a short status line is enough.
  It still starts with ROUTINE or REVIEW, see "Reports" below.

- **Merging:** `gh pr merge <number> --merge --delete-branch`.

## Owner review gates
This is separate from "When to involve Cribe" below. That section
is Claude Code's own judgment call when something is uncertain. This section
is the owner's fixed control points, and they apply whether or not Claude
Code itself would think to ask.

Three things decide whether a gate is needed for a given piece of work:
- Can it be verified by machine (tests, typecheck, lint), or does it need
  taste or feel that only a human can judge?
- Is it cheap to reverse (an unmerged branch) or costly (a merge to `main`,
  a store submission, a call against live external state)?
- Is it already covered by an existing decision (PRD/ADR), or new ground?

Current gates for this project, by category. Revisit these at each phase
transition rather than assuming they carry over unchanged:
- **PoC, logic/data/storage/hooks** (no visible UI): no gate, see "Git and
  planning" above.
- **PoC, screens and views** (Search, Home, Calendar, Shows, and anything
  the owner would look at in Expo Go): PR opened but not merged by Claude
  Code. Merging requires the owner to test it in Expo Go and approve it
  explicitly in chat, see "Git and planning" above.
- **PoC, end-to-end flow and the PoC week log** (CRI-69, CRI-70): full
  review by the owner, not just a merge click. This is where the PoC proves
  whether it delivers on the core promise, not just where the code is
  correct.
- **MVP, screens and views** (anything the owner would see in Expo Go,
  including the UI part of a PR that also changes logic or data): PR
  opened but not merged by Claude Code. Merging requires the owner to test
  it in Expo Go and approve it explicitly in chat, as in the PoC.
- **MVP, logic/data/storage/hooks** (no visible UI): no gate once
  verification passes, as in the PoC, unless the PR adds an external
  service, an API key or a new ADR. Then the owner reviews it before merge.
- **MVP, decisions and docs** (ADRs, PRD, CLAUDE.md): PR opened, merged
  only after the owner approves it in chat. Decisions are the owner's.
- **MVP, spikes:** throwaway code in `spikes-scratch/`, no PR to `main`
  for the code. Findings go into `docs/spikes/` through a docs PR, under
  the rule above.
- **Release**: not yet defined. New categories of risk appear here (a
  public App Store submission, store data). Stop and ask the owner to
  define gates before treating any release work as gate-free.
- **One folder only:** all work happens in this one repository folder. No
  extra folders or worktrees, not even for docs.
- **No branch switching during the owner's test:** while a UI branch is
  waiting for the owner's Expo Go test, do not switch branches in the repo
  folder, not even briefly (the phone reloads from whatever is checked
  out). Either keep working on that branch, wait until it is merged, or ask
  the owner first. Work that needs another branch waits, and the report
  says so.

## When to involve Cribe
Needs Cribe (REVIEW): UI to test in Expo Go; ADR, PRD or CLAUDE.md changes;
new external service or API key; product or design decisions (behaviour,
user-facing wording, scope, new design tokens).
Everything else Code decides: consistency fixes (outdated examples, wording
drift from PRD/design system, rules dropped by mistake), naming, refactors,
test details. Do them in the same PR and list them under FYI.

## Reports
- Start every report with ROUTINE or REVIEW. REVIEW means Cribe must act
  before work continues, including any PR waiting for his approval.
  ROUTINE means nothing is waiting on him.
- REVIEW reports begin with one checklist covering everything Cribe needs
  to do for that PR: Expo Go test points, decisions, approvals.
- Don't stop to ask mid-task. Pick the most reasonable, easily reversible
  option, add it to the checklist as "decided X, change?", and keep going.
  Stop only when the work can't proceed without an answer.
- After the checklist: a short FYI section. Nothing else.
