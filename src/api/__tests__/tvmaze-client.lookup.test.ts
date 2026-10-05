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

describe("TvMazeClient.getWeekInfo (FR-039, CRI-110)", () => {
  it("reads the type and the previous and next episodes in one request", async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse({
        id: 84,
        type: "Animation",
        _embedded: {
          previousepisode: {
            airstamp: "2026-05-11T00:00:00+00:00",
            number: 20,
          },
          nextepisode: { airstamp: "2027-02-22T01:00:00+00:00", number: 1 },
        },
      }),
    );

    await expect(client(fetchFn).getWeekInfo(84)).resolves.toEqual({
      type: "Animation",
      episodes: [
        { airstamp: "2026-05-11T00:00:00+00:00", number: 20 },
        { airstamp: "2027-02-22T01:00:00+00:00", number: 1 },
      ],
    });
    expect(fetchFn.mock.calls[0][0]).toContain(
      "/shows/84?embed[]=previousepisode&embed[]=nextepisode",
    );
  });

  it("has no episodes when none are listed", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ id: 1, type: "Scripted" }));
    await expect(client(fetchFn).getWeekInfo(1)).resolves.toEqual({
      type: "Scripted",
      episodes: [],
    });
  });
});
