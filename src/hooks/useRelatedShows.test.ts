import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import type { TvMazeShow } from "@/api/tvmaze-types";
import recommendationsMobland from "@/api/fixtures/tmdb-recommendations-mobland.json";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";
import { RELATED_MAX, useRelatedShows } from "./useRelatedShows";

jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: { findRecommendations: jest.fn() },
}));
jest.mock("@/api/tvmaze-id", () => ({ resolveTvMazeId: jest.fn() }));

const findRecommendations = tmdbClient.findRecommendations as jest.Mock;
const resolve = resolveTvMazeId as jest.Mock;
const MOBLAND = {
  id: 75026,
  name: "MobLand",
  premiered: "2025-03-30",
  externals: { imdb: "tt31510819", thetvdb: null, tvrage: null },
} as unknown as TvMazeShow;

async function render() {
  return renderHook(() => useRelatedShows(MOBLAND), {
    wrapper: wrapperWithQueryClient(createTestQueryClient()),
  });
}

// CRI-143, owner 2026-11-08: Show detail's Related row, from TMDB's
// recommendations, as Top picks.
describe("useRelatedShows (CRI-143)", () => {
  beforeEach(() => {
    findRecommendations.mockReset();
    resolve.mockReset();
  });

  it(`gives the first ${RELATED_MAX} recommendations TVmaze knows, in TMDB's order`, async () => {
    findRecommendations.mockResolvedValue({
      tvId: 247718,
      results: recommendationsMobland.results,
    });
    // TVmaze knows every title but the second.
    resolve.mockImplementation(async (tmdbId: number) =>
      tmdbId === recommendationsMobland.results[1].id ? null : tmdbId + 1,
    );
    const { result, unmount } = await render();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cards).toHaveLength(RELATED_MAX);
    expect(result.current.cards[0]).toEqual(
      expect.objectContaining({
        tmdbId: 85021,
        tvmazeId: 85022,
        name: "Gangs of London",
      }),
    );
    expect(
      result.current.cards.some(
        (card) => card.tmdbId === recommendationsMobland.results[1].id,
      ),
    ).toBe(false);
    await unmount();
  });

  it("leaves the show itself out, and keeps followed titles", async () => {
    findRecommendations.mockResolvedValue({
      tvId: 247718,
      results: recommendationsMobland.results.slice(0, 2),
    });
    // The first resolves to MobLand itself.
    resolve.mockImplementation(async (tmdbId: number) =>
      tmdbId === 85021 ? MOBLAND.id : tmdbId,
    );
    const { result, unmount } = await render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cards.map((card) => card.tvmazeId)).toEqual([
      recommendationsMobland.results[1].id,
    ]);
    await unmount();
  });

  it("gives none without a TMDB match or key", async () => {
    findRecommendations.mockResolvedValue(NOT_ON_TMDB);
    const notOnTmdb = await render();
    await waitFor(() => expect(notOnTmdb.result.current.isLoading).toBe(false));
    expect(notOnTmdb.result.current.cards).toEqual([]);
    expect(resolve).not.toHaveBeenCalled();
    await notOnTmdb.unmount();
  });
});
