import { act, renderHook, waitFor } from "@testing-library/react-native";

import { hasServiceInRegion } from "@/api/region-service";
import { tmdbClient } from "@/api/tmdb-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { useTopPicks } from "./useTopPicks";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: { findRecommendations: jest.fn() },
}));
jest.mock("@/api/tvmaze-id", () => ({ resolveTvMazeId: jest.fn() }));
jest.mock("@/api/region-service", () => ({ hasServiceInRegion: jest.fn() }));
jest.mock("./useRegion", () => ({ useRegion: () => ({ region: "SE" }) }));
let mockFollowed = new Set<number>();
jest.mock("./useFollowList", () => ({
  useFollowList: () => ({ followedIds: mockFollowed }),
}));

const findRecommendations = tmdbClient.findRecommendations as jest.Mock;
const resolve = resolveTvMazeId as jest.Mock;
const hasService = hasServiceInRegion as jest.Mock;

const followedShow = {
  id: 1,
  name: "MobLand",
  premiered: "2025-03-30",
  externals: { tvrage: null, imdb: "tt31510819", thetvdb: null },
} as TvMazeShow;

// 14 titles, TMDB ids 101–114 in rank order; TVmaze id = TMDB id + 1000.
const recommendations = {
  tvId: 500,
  results: Array.from({ length: 14 }, (_, i) => ({
    id: 101 + i,
    name: `Pick ${101 + i}`,
    poster_path: `/p${101 + i}.jpg`,
  })),
};

const ids = (cards: { tmdbId: number }[]) => cards.map((card) => card.tmdbId);

describe("useTopPicks (FR-038)", () => {
  beforeEach(() => {
    mockFollowed = new Set([1]);
    findRecommendations.mockReset().mockResolvedValue(recommendations);
    resolve
      .mockReset()
      .mockImplementation(async (tmdbId: number) => tmdbId + 1000);
    hasService.mockReset().mockResolvedValue(true);
    jest.useFakeTimers().setSystemTime(new Date("2026-10-05T08:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());

  async function renderRow() {
    const client = createTestQueryClient();
    const rendered = await renderHook(() => useTopPicks([followedShow]), {
      wrapper: wrapperWithQueryClient(client),
    });
    return { ...rendered, client };
  }

  it("fills the first ten in rank order, checking three at a time", async () => {
    const { result, unmount, client } = await renderRow();

    await waitFor(() => expect(result.current.cards).toHaveLength(10));
    expect(ids(result.current.cards)).toEqual([
      101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    ]);
    // Three at a time: at most two checks beyond the ten cards.
    expect(resolve.mock.calls.length).toBeLessThanOrEqual(12);
    await unmount();
    client.unmount();
  });

  it("leaves out a title with no streaming service in the region", async () => {
    hasService.mockImplementation(
      async (tvmazeId: number) => tvmazeId !== 1102,
    );
    const { result, unmount, client } = await renderRow();

    await waitFor(() => expect(result.current.cards).toHaveLength(10));
    expect(ids(result.current.cards)).not.toContain(102);
    expect(hasService).toHaveBeenCalledWith(1102, 102, "SE");
    await unmount();
    client.unmount();
  });

  it("keeps a show followed from the row on the card, in place", async () => {
    const { result, rerender, unmount, client } = await renderRow();
    await waitFor(() => expect(result.current.cards).toHaveLength(10));

    mockFollowed = new Set([1, 1103]);
    await rerender({});

    expect(ids(result.current.cards)).toContain(103);
    expect(result.current.cards).toHaveLength(10);
    await unmount();
    client.unmount();
  });

  it('Refresh shows the next ones, then "Start over" goes back to the top, without followed shows or a new fetch (CRI-123)', async () => {
    const { result, rerender, unmount, client } = await renderRow();
    await waitFor(() => expect(result.current.cards).toHaveLength(10));
    expect(result.current.control).toBe("refresh");

    mockFollowed = new Set([1, 1103]);
    await rerender({});
    await act(() => result.current.refresh());

    await waitFor(() =>
      expect(ids(result.current.cards)).toEqual([111, 112, 113, 114]),
    );
    expect(result.current.control).toBe("startOver");

    await act(() => result.current.refresh());
    await waitFor(() =>
      expect(ids(result.current.cards)).toEqual([
        101, 102, 104, 105, 106, 107, 108, 109, 110, 111,
      ]),
    );
    expect(result.current.control).toBe("refresh");
    expect(findRecommendations).toHaveBeenCalledTimes(1);
    await unmount();
    client.unmount();
  });

  it('says "all followed" only when every pick is followed (CRI-123)', async () => {
    mockFollowed = new Set([
      1,
      ...recommendations.results.map((pick) => pick.id + 1000),
    ]);
    const { result, unmount, client } = await renderRow();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cards).toEqual([]);
    expect(result.current.allFollowed).toBe(true);
    await unmount();
    client.unmount();
  });

  it("shares Refresh between Home and Search: both rows move to the next picks (FR-026)", async () => {
    const client = createTestQueryClient();
    const wrapper = wrapperWithQueryClient(client);
    const home = await renderHook(() => useTopPicks([followedShow]), {
      wrapper,
    });
    const search = await renderHook(() => useTopPicks([followedShow]), {
      wrapper,
    });
    await waitFor(() => expect(home.result.current.cards).toHaveLength(10));
    await waitFor(() => expect(search.result.current.cards).toHaveLength(10));

    await act(() => search.result.current.refresh());

    const next = [111, 112, 113, 114];
    await waitFor(() => expect(ids(search.result.current.cards)).toEqual(next));
    await waitFor(() => expect(ids(home.result.current.cards)).toEqual(next));
    await home.unmount();
    await search.unmount();
    client.unmount();
  });

  it("Refresh fetches recommendations again only once they are a day old", async () => {
    const { result, unmount, client } = await renderRow();
    await waitFor(() => expect(result.current.cards).toHaveLength(10));

    jest.setSystemTime(new Date("2026-10-06T08:00:01Z"));
    await act(() => result.current.refresh());

    await waitFor(() => expect(findRecommendations).toHaveBeenCalledTimes(2));
    await unmount();
    client.unmount();
  });

  it("is empty without followed shows", async () => {
    const client = createTestQueryClient();
    const { result, unmount } = await renderHook(() => useTopPicks([]), {
      wrapper: wrapperWithQueryClient(client),
    });

    expect(result.current.cards).toEqual([]);
    expect(findRecommendations).not.toHaveBeenCalled();
    await unmount();
    client.unmount();
  });
});
