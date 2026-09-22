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

## Spikes
- Spike code is throwaway. Put it in `spikes-scratch/` (git ignored), never
  in the app source.
- Write findings into the spike's file under `docs/spikes/`, section
  "Results", and update its status.
- Do not commit anything from `spikes-scratch/`.

## Git and planning
- Planning and status live in Linear (project "On Now", issues CRI-xx).
  Decisions and content live in `docs/`. Do not copy docs into Linear.
- Do not commit or push unless asked.
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
