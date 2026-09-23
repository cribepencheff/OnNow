# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project
**On Now** (working name) is a stripped, cinematic iOS app (Android later)
that shows which followed TV series have a new episode today, with a
calendar for past and upcoming episodes. Free to run: no backend, no
accounts, free data sources only.

Current phase: **Proof of Concept**.

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
- **Maestro:** run the end to end flow (`npm run e2e`) only when a change
  touches Search, Home, Shows or navigation, or when asked.

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
- Always pull `main` before creating a new branch.
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
- After merging any PR: move its Linear issue to Done, pull `main`, and
  merge `main` into any other open branch that was created before it.
- Keep the full report shape below for PR-opening and PR-merging moments.
  For intermediate steps within a batched PR (finishing one of several
  issues it covers, a retry after a fix), a short status line is enough;
  save the full report for when there's something to actually review or
  act on. Even a short status line starts with ROUTINE or REVIEW: the rule
  applies to every report, not just the full shape.

## Owner review gates
This is separate from "When to check in with the owner" below. That section
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
- **MVP and Release**: not yet defined. New categories of risk appear here
  (notifications, opening other apps, territory and store data, a public
  App Store submission). Do not assume the PoC gates carry over: stop and
  ask the owner to define gates for the new phase before treating any of
  its issues as gate-free.

## When to check in with the owner
- A decision is not resolvable from the PRD, ADRs or spikes: ask rather
  than assume.
- The work would deviate from an existing ADR or from the stack and
  principles above.
- A test failure repeats after reasonable troubleshooting and cannot be
  resolved.
- Scope is expanding beyond the current Linear issue or the current phase
  (Discovery / PoC).

Otherwise, complete the issue and report without waiting for a check-in
first. Keep reports in this shape:
- **ROUTINE or REVIEW**, one word, first line of the report: ROUTINE means
  you did exactly what was asked, nothing unexpected, nothing for the owner
  to weigh in on before it's forwarded anywhere. REVIEW means the report
  contains a decision you made, a deviation from what was asked or from an
  existing ADR/PRD, or something you're uncertain about. This tells the
  owner whether the report is worth reading closely, not just whether the
  work is done.
- **Done**: what was built, file by file, with the relevant `FR-xxx` and
  ADR references
- **Bundled fixes**: anything unrelated included per an earlier decision,
  and why
- **Decisions made**: anything decided along the way and the reasoning,
  even small things, so it can be reviewed after the fact
- **Verification**: the pre-push hook's result (typecheck, lint, test
  counts), the Maestro result when it was run, and any other tooling checks
  (for example `expo-doctor`)
- **Suggested commit message**: matching the format in "Git and planning"
  above (issue ID first, no attribution trailers)
