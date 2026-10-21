import { tmdbFindKey, createTmdbFindCache } from "./tmdb-find-cache";
import { createTestQueryClient } from "./test-utils";

const NEAGLEY = {
  imdb: "tt33539520",
  thetvdb: 455064,
  name: "Neagley",
  premiered: "2026-09-16",
};
const FOUND = { tv_results: [{ id: 273207 }] };
const DAY_MS = 24 * 60 * 60 * 1000;

// CRI-107: one TMDB /find per show, kept in the query cache, for every
// lookup that starts from it; a hit kept for 30 days, a miss for a day.
describe("tmdb find cache", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("finds a show once for several lookups", async () => {
    const cachedFind = createTmdbFindCache(createTestQueryClient());
    const find = jest.fn(async () => FOUND);

    await cachedFind(NEAGLEY, find);
    await cachedFind(NEAGLEY, find);

    expect(find).toHaveBeenCalledTimes(1);
  });

  it("finds a show that is on TMDB again only after 30 days", async () => {
    const cachedFind = createTmdbFindCache(createTestQueryClient());
    const find = jest.fn(async () => FOUND);

    await cachedFind(NEAGLEY, find);
    jest.advanceTimersByTime(29 * DAY_MS);
    await cachedFind(NEAGLEY, find);
    expect(find).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2 * DAY_MS);
    await cachedFind(NEAGLEY, find);
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("asks again after a day when TMDB did not know the show", async () => {
    const cachedFind = createTmdbFindCache(createTestQueryClient());
    const find = jest.fn(async () => ({}));

    await cachedFind(NEAGLEY, find);
    jest.advanceTimersByTime(DAY_MS + 1);
    await cachedFind(NEAGLEY, find);

    expect(find).toHaveBeenCalledTimes(2);
  });

  it("keys a show by its IDs, and by name and premiere only without them", () => {
    expect(tmdbFindKey(NEAGLEY)).toEqual(
      tmdbFindKey({ ...NEAGLEY, name: "Renamed" }),
    );
    const noIds = {
      imdb: null,
      thetvdb: null,
      name: "JAŸ-Z IN 8",
      premiered: "2026-09-18",
    };
    expect(tmdbFindKey(noIds)).not.toEqual(
      tmdbFindKey({ ...noIds, name: "Other" }),
    );
  });
});
