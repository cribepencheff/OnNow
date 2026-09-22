# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project
**On Now** (working name) is a stripped, cinematic iOS app (Android later)
that shows which followed TV series have a new episode today, with a
calendar for past and upcoming episodes. Free to run: no backend, no
accounts, free data sources only.

Current phase: **Discovery**, moving into the **Proof of Concept**.

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
- One Linear issue, one branch, one pull request. Branch names use a type
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
  waiting for review.
- For issues with a visible UI change (screens and views the owner would
  look at in Expo Go): open the PR as usual, but do not merge it. Wait for
  the owner to confirm it looks and feels right first.

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
  Code, see "Git and planning" above.
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
- **Done**: what was built, file by file, with the relevant `FR-xxx` and
  ADR references
- **Bundled fixes**: anything unrelated included per an earlier decision,
  and why
- **Decisions made**: anything decided along the way and the reasoning,
  even small things, so it can be reviewed after the fact
- **Verification**: typecheck, lint, test counts, and any tooling checks
  (for example `expo-doctor`)
- **Suggested commit message**: matching the format in "Git and planning"
  above (issue ID first, no attribution trailers)
