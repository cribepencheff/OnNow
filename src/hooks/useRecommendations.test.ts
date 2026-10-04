import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { useRecommendations } from "./useRecommendations";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: { findRecommendations: jest.fn(), externalIdsById: jest.fn() },
}));
jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: { lookupShowId: jest.fn() },
}));

const findRecommendations = tmdbClient.findRecommendations as jest.Mock;
const externalIdsById = tmdbClient.externalIdsById as jest.Mock;
const lookupShowId = tvMazeClient.lookupShowId as jest.Mock;

function show(id: number): TvMazeShow {
  return {
    id,
    name: `Show ${id}`,
    premiered: "2020-01-01",
    externals: { tvrage: null, imdb: `tt${id}`, thetvdb: null },
  } as TvMazeShow;
}

function rec(id: number, poster: string | null = `/p${id}.jpg`) {
  return { id, name: `Rec ${id}`, poster_path: poster };
}

// TVmaze ids are the TMDB id + 1000 in these tests; 404 has none.
beforeEach(() => {
  findRecommendations.mockReset();
  externalIdsById.mockReset().mockImplementation(async (tmdbId: number) => ({
    imdb: `tt${tmdbId}`,
    thetvdb: null,
  }));
  lookupShowId
    .mockReset()
    .mockImplementation(async ({ imdb }) =>
      imdb === "tt404" ? null : Number(imdb.slice(2)) + 1000,
    );
});

async function renderFor(followed: TvMazeShow[], kept = new Set<number>()) {
  const client = createTestQueryClient();
  const rendered = await renderHook(() => useRecommendations(followed, kept), {
    wrapper: wrapperWithQueryClient(client),
  });
  return { ...rendered, client };
}

describe("useRecommendations (FR-038, ADR 0016)", () => {
  it("ranks across followed shows, leaves out followed ones, and finds each on TVmaze", async () => {
    findRecommendations.mockImplementation(async ({ name }) =>
      name === "Show 1"
        ? { tvId: 501, results: [rec(10), rec(502), rec(20)] }
        : { tvId: 502, results: [rec(20), rec(501), rec(30)] },
    );
    const { result, unmount, client } = await renderFor([show(1), show(2)]);

    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(
      result.current.map(({ tmdbId, tvmazeId }) => [tmdbId, tvmazeId]),
    ).toEqual([
      [20, 1020],
      [10, 1010],
      [30, 1030],
    ]);
    await unmount();
    client.unmount();
  });

  it("drops titles without a poster or without a TVmaze show", async () => {
    findRecommendations.mockResolvedValue({
      tvId: 501,
      results: [rec(10, null), rec(404), rec(30)],
    });
    const { result, unmount, client } = await renderFor([show(1)]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].tmdbId).toBe(30);
    await unmount();
    client.unmount();
  });

  it("leaves out a followed show found only by its TVmaze id (not on TMDB)", async () => {
    findRecommendations.mockImplementation(async ({ name }) =>
      name === "Show 1"
        ? { tvId: 501, results: [rec(10), rec(20)] }
        : NOT_ON_TMDB,
    );
    // TMDB 10 is TVmaze 1010, which is followed.
    const { result, unmount, client } = await renderFor([show(1), show(1010)]);

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].tmdbId).toBe(20);
    await unmount();
    client.unmount();
  });

  it("keeps a show followed from the row this session", async () => {
    findRecommendations.mockImplementation(async ({ name }) =>
      name === "Show 1"
        ? { tvId: 501, results: [rec(10), rec(20)] }
        : { tvId: 10, results: [] },
    );
    const { result, unmount, client } = await renderFor(
      [show(1), show(1010)],
      new Set([10]),
    );

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map(({ tmdbId }) => tmdbId)).toEqual([10, 20]);
    await unmount();
    client.unmount();
  });

  it("shows at most ten", async () => {
    findRecommendations.mockResolvedValue({
      tvId: 501,
      results: Array.from({ length: 14 }, (_, i) => rec(100 + i)),
    });
    const { result, unmount, client } = await renderFor([show(1)]);

    await waitFor(() => expect(result.current).toHaveLength(10));
    await unmount();
    client.unmount();
  });

  it("is empty without followed shows", async () => {
    const { result, unmount, client } = await renderFor([]);
    expect(result.current).toEqual([]);
    expect(findRecommendations).not.toHaveBeenCalled();
    await unmount();
    client.unmount();
  });
});
