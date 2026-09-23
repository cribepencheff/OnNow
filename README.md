# On Now

On Now is a stripped, cinematic iOS app that shows which followed TV series
have a new episode today, with a calendar for past and upcoming episodes.
Android comes later.

## Core promise

I open the app and see, within two seconds, which of my series have a new
episode today, and it is correct.

On Now is a radar for TV series, not a tracker. There is no
watched or unwatched bookkeeping, no account and no backend. The follow list
lives on the device, and all data comes from free sources.

## Stack

- [Expo](https://expo.dev) with React Native and TypeScript, in strict mode
- [Expo Router](https://docs.expo.dev/router/introduction/) for navigation
- [TanStack Query](https://tanstack.com/query) for data fetching, wrapped in
  custom query hooks (planned, added in CRI-64)
- Jest with `jest-expo` and React Native Testing Library for tests
- ESLint and Prettier for static checks

See `docs/decisions/` for the reasoning behind these choices.

## How to run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npx expo start
   ```

   Open it in [Expo Go](https://expo.dev/go) on a real device or a
   simulator.

3. Run the checks:

   ```bash
   npx tsc --noEmit   # typecheck
   npx expo lint      # lint
   npm test           # unit and component tests
   ```

## End to end test

One [Maestro](https://maestro.dev) flow, `.maestro/core-loop.yaml`, checks
the core loop on live TVmaze data: from an empty follow list, follow a
running show in Search and see it on Home and in Shows. It runs locally in
Expo Go in the iOS simulator, not in CI.

It needs Xcode with an iOS simulator, Expo Go installed in that simulator
and the [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro).

1. Boot the simulator and start Metro:

   ```bash
   npx expo start
   ```

2. In another terminal, run the flow:

   ```bash
   npm run e2e
   ```

The flow clears Expo Go's data in the simulator to start from an empty
follow list, so anything else stored in that Expo Go is lost. It follows
the first show in `.maestro/scripts/pick-show.js` that has an upcoming
episode on TVmaze. If none does, the flow stops and says so: update that
list.

## Documentation

- [`docs/00-vision.md`](docs/00-vision.md): core promise and principles
- [`docs/01-prd.md`](docs/01-prd.md): views and requirements
- [`docs/02-poc.md`](docs/02-poc.md): what the Proof of Concept includes
- [`docs/03-mvp.md`](docs/03-mvp.md): what comes after the PoC
- [`docs/04-roadmap.md`](docs/04-roadmap.md): the roadmap beyond the MVP
- [`docs/decisions/`](docs/decisions/): accepted architecture decisions (ADRs)
- [`docs/spikes/`](docs/spikes/): technical investigations

## License

MIT, see [`LICENSE`](LICENSE). Episode data is provided by
[TVmaze](https://www.tvmaze.com) under CC BY-SA.
