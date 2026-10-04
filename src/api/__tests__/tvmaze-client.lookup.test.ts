import { createTvMazeClient } from "../tvmaze-client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function client(fetchFn: jest.Mock) {
  return createTvMazeClient({
    fetchFn,
    now: () => 0,
    wait: async () => {},
  });
}

// FR-038: a recommended TMDB show is found on TVmaze by IMDb, then TheTVDB.
describe("TvMazeClient.lookupShowId (FR-038)", () => {
  it("finds the show by its IMDb ID (TVmaze redirects to the show)", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ id: 75026, name: "MobLand" }));

    await expect(
      client(fetchFn).lookupShowId({ imdb: "tt31510819", thetvdb: null }),
    ).resolves.toBe(75026);
    expect(fetchFn.mock.calls[0][0]).toContain("/lookup/shows?imdb=tt31510819");
  });

  it("tries TheTVDB when TVmaze does not know the IMDb ID", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(null, 404))
      .mockResolvedValueOnce(jsonResponse({ id: 15299 }));

    await expect(
      client(fetchFn).lookupShowId({ imdb: "tt1", thetvdb: 7 }),
    ).resolves.toBe(15299);
    expect(fetchFn.mock.calls[1][0]).toContain("/lookup/shows?thetvdb=7");
  });

  it("is null when TVmaze knows neither, without a request when there is no ID", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(null, 404));
    await expect(
      client(fetchFn).lookupShowId({ imdb: "tt1", thetvdb: null }),
    ).resolves.toBeNull();

    const none = jest.fn();
    await expect(
      client(none).lookupShowId({ imdb: null, thetvdb: null }),
    ).resolves.toBeNull();
    expect(none).not.toHaveBeenCalled();
  });

  it("still throws on other errors, so nothing wrong is cached", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(null, 500));
    await expect(
      client(fetchFn).lookupShowId({ imdb: "tt1", thetvdb: null }),
    ).rejects.toThrow();
  });
});

describe("TvMazeClient.getNextEpisodeAirstamp (FR-039)", () => {
  it("reads the next episode's airstamp, or null when none is announced", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: 75026,
          _embedded: {
            nextepisode: { airstamp: "2026-10-09T01:00:00+00:00" },
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await expect(client(fetchFn).getNextEpisodeAirstamp(75026)).resolves.toBe(
      "2026-10-09T01:00:00+00:00",
    );
    expect(fetchFn.mock.calls[0][0]).toContain(
      "/shows/75026?embed=nextepisode",
    );
    await expect(client(fetchFn).getNextEpisodeAirstamp(1)).resolves.toBeNull();
  });
});
