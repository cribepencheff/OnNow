import { createTvMazeClient } from "../tvmaze-client";
import searchSlowHorsesFixture from "../fixtures/search-slow-horses.json";
import showFoundationFixture from "../fixtures/show-foundation.json";

function fakeFetch(body: unknown): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);
}

describe("TvMazeClient searchShows (FR-001, spike 0001 section 1)", () => {
  it("parses search results into show and score fields", async () => {
    const fetchFn = fakeFetch(searchSlowHorsesFixture);
    const client = createTvMazeClient({ fetchFn });

    const results = await client.searchShows("Slow Horses");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toEqual(
      expect.objectContaining({
        score: expect.any(Number),
        show: expect.objectContaining({
          id: 45039,
          name: "Slow Horses",
          premiered: "2022-04-01",
        }),
      }),
    );
  });

  it("requests the search endpoint with an encoded query", async () => {
    const fetchFn = fakeFetch(searchSlowHorsesFixture);
    const client = createTvMazeClient({ fetchFn });

    await client.searchShows("Slow Horses");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.tvmaze.com/search/shows?q=Slow%20Horses",
    );
  });
});

describe("TvMazeClient getShowWithEpisodesAndSeasons (spike 0001 sections 3, 4)", () => {
  it("parses a show with embedded episodes and seasons", async () => {
    const fetchFn = fakeFetch(showFoundationFixture);
    const client = createTvMazeClient({ fetchFn });

    const show = await client.getShowWithEpisodesAndSeasons(35951);

    expect(show.id).toBe(35951);
    expect(show.name).toBe("Foundation");
    expect(show._embedded.episodes.length).toBeGreaterThan(0);
    expect(show._embedded.seasons.length).toBeGreaterThan(0);
  });

  it("keeps episodeOrder, premiereDate and endDate null for an announced, unscheduled season", async () => {
    const fetchFn = fakeFetch(showFoundationFixture);
    const client = createTvMazeClient({ fetchFn });

    const show = await client.getShowWithEpisodesAndSeasons(35951);
    const announcedSeason = show._embedded.seasons.find(
      (season) => season.episodeOrder === null,
    );

    expect(announcedSeason).toBeDefined();
    expect(announcedSeason?.premiereDate).toBeNull();
    expect(announcedSeason?.endDate).toBeNull();
  });

  it("requests the show endpoint with episodes and seasons embedded", async () => {
    const fetchFn = fakeFetch(showFoundationFixture);
    const client = createTvMazeClient({ fetchFn });

    await client.getShowWithEpisodesAndSeasons(35951);

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.tvmaze.com/shows/35951?embed[]=episodes&embed[]=seasons",
    );
  });
});
