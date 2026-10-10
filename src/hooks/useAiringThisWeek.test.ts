import { act, renderHook, waitFor } from "@testing-library/react-native";

import { hasServiceInRegion } from "@/api/region-service";
import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import { useAiringThisWeek } from "./useAiringThisWeek";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tmdb-client", () => ({
  tmdbClient: { findAiringThisWeek: jest.fn() },
}));
jest.mock("@/api/region-service", () => ({ hasServiceInRegion: jest.fn() }));
jest.mock("./useRegion", () => ({ useRegion: () => ({ region: "SE" }) }));
jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: { getWeekInfo: jest.fn() },
}));
jest.mock("@/api/tvmaze-id", () => ({ resolveTvMazeId: jest.fn() }));
let mockFollowed = { ids: new Set<number>(), isLoaded: true };
jest.mock("./useFollowList", () => ({
  useFollowList: () => ({
    followedIds: mockFollowed.ids,
    isLoaded: mockFollowed.isLoaded,
  }),
}));
// 2026-10-05 is a Monday.
jest.mock("./useToday", () => ({ useToday: () => "2026-10-05" }));

const findAiringThisWeek = tmdbClient.findAiringThisWeek as jest.Mock;
const hasService = hasServiceInRegion as jest.Mock;
const getWeekInfo = tvMazeClient.getWeekInfo as jest.Mock;
const resolve = resolveTvMazeId as jest.Mock;

// 14 candidates, popularity 100 down to 87; TVmaze id = TMDB id + 1000.
const onTheAir = Array.from({ length: 14 }, (_, i) => ({
  id: 201 + i,
  name: `Show ${201 + i}`,
  poster_path: `/p${201 + i}.jpg`,
  popularity: 100 - i,
  genre_ids: [18],
}));

// A scripted show with an episode on Friday 9 Oct (UTC noon).
const airsFriday = {
  type: "Scripted",
  episodes: [{ airstamp: "2026-10-09T12:00:00+00:00", number: 3 }],
};

const ids = (cards: { tmdbId: number }[]) => cards.map((card) => card.tmdbId);

async function renderRow() {
  const client = createTestQueryClient();
  const rendered = await renderHook(() => useAiringThisWeek(), {
    wrapper: wrapperWithQueryClient(client),
  });
  return { ...rendered, client };
}

async function render() {
  const client = createTestQueryClient();
  const rendered = await renderHook(() => useAiringThisWeek().cards, {
    wrapper: wrapperWithQueryClient(client),
  });
  return { ...rendered, client };
}

describe("useAiringThisWeek (FR-039, CRI-110)", () => {
  beforeEach(() => {
    mockFollowed = { ids: new Set(), isLoaded: true };
    findAiringThisWeek.mockReset().mockResolvedValue(onTheAir);
    hasService.mockReset().mockResolvedValue(true);
    resolve.mockReset().mockImplementation(async (id: number) => id + 1000);
    getWeekInfo.mockReset().mockResolvedValue(airsFriday);
  });

  it("fills ten in popularity order, each with its day, checking three at a time", async () => {
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(result.current[0]).toMatchObject({ tmdbId: 201, day: "Fri" });
    // Three at a time: at most two checks beyond the ten cards, before the
    // next batch is prepared (CRI-127).
    expect(resolve.mock.calls.map(([id]) => id).slice(0, 12)).toEqual([
      201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212,
    ]);
    await unmount();
    client.unmount();
  });

  it("CRI-122: shows the ten in date order, Today first, popularity order within a day", async () => {
    // The two most popular air on Friday, the 3rd today, the 4th on
    // Wednesday; the rest on Friday too.
    const airsOn = (date: string) => ({
      type: "Scripted",
      episodes: [{ airstamp: `${date}T12:00:00+00:00`, number: 3 }],
    });
    getWeekInfo.mockImplementation(async (tvmazeId: number) => {
      if (tvmazeId === 1203) return airsOn("2026-10-05");
      if (tvmazeId === 1204) return airsOn("2026-10-07");
      return airsFriday;
    });
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(ids(result.current).slice(0, 4)).toEqual([203, 204, 201, 202]);
    expect(result.current.map((card) => card.day).slice(0, 3)).toEqual([
      "Today",
      "Wed",
      "Fri",
    ]);
    await unmount();
    client.unmount();
  });

  it("asks discover for the region and the week (today and six days)", async () => {
    const { result, unmount, client } = await render();
    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(findAiringThisWeek).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "SE",
        from: "2026-10-05",
        to: "2026-10-11",
      }),
    );
    await unmount();
    client.unmount();
  });

  it("leaves out a show with no streaming service in the region", async () => {
    hasService.mockImplementation(
      async (tvmazeId: number) => tvmazeId !== 1201,
    );
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(ids(result.current)).not.toContain(201);
    expect(hasService).toHaveBeenCalledWith(1201, 201, "SE");
    await unmount();
    client.unmount();
  });

  it("leaves out a show TVmaze has nothing for this week (Family Guy)", async () => {
    getWeekInfo.mockImplementation(async (tvmazeId: number) =>
      tvmazeId === 1201
        ? {
            type: "Animation",
            episodes: [{ airstamp: "2027-02-22T01:00:00+00:00", number: 1 }],
          }
        : airsFriday,
    );
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(ids(result.current)).not.toContain(201);
    await unmount();
    client.unmount();
  });

  it("keeps documentaries, leaves out reality, game shows and sports by TVmaze type", async () => {
    const types: Record<number, string> = {
      1201: "Documentary",
      1202: "Reality",
      1203: "Game Show",
      1204: "Sports",
    };
    getWeekInfo.mockImplementation(async (tvmazeId: number) => ({
      ...airsFriday,
      type: types[tvmazeId] ?? "Scripted",
    }));
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(ids(result.current)).toContain(201);
    for (const left of [202, 203, 204]) {
      expect(ids(result.current)).not.toContain(left);
    }
    await unmount();
    client.unmount();
  });

  it("leaves out followed shows, and waits for the follow list first", async () => {
    mockFollowed = { ids: new Set([1201]), isLoaded: false };
    const { result, rerender, unmount, client } = await render();
    expect(resolve).not.toHaveBeenCalled();

    mockFollowed = { ids: new Set([1201]), isLoaded: true };
    await rerender({});
    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(ids(result.current)).not.toContain(201);
    await unmount();
    client.unmount();
  });

  it("keeps a show followed from the row on its card", async () => {
    const { result, rerender, unmount, client } = await render();
    await waitFor(() => expect(result.current).toHaveLength(10));

    mockFollowed = { ids: new Set([1203]), isLoaded: true };
    await rerender({});
    expect(ids(result.current)).toContain(203);
    await unmount();
    client.unmount();
  });

  it("skips a title when TVmaze cannot be reached, without failing the row", async () => {
    getWeekInfo.mockImplementation(async (tvmazeId: number) => {
      if (tvmazeId === 1201) {
        throw new Error("TVmaze 500");
      }
      return airsFriday;
    });
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(ids(result.current)).not.toContain(201);
    await unmount();
    client.unmount();
  });

  // CRI-127: the next batch is checked while the first is on screen, so
  // Refresh is near instant; never more than one batch ahead.
  describe("the next batch prepared ahead (CRI-127)", () => {
    // 30 candidates: room for three batches.
    const thirty = Array.from({ length: 30 }, (_, i) => ({
      id: 201 + i,
      name: `Show ${201 + i}`,
      poster_path: `/p${201 + i}.jpg`,
      popularity: 100 - i,
      genre_ids: [18],
    }));
    const checked = () => resolve.mock.calls.map(([id]) => id as number);

    it("checks the next batch without a tap, and only that one", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      // The second batch is 211–220, its checks end with 222.
      await waitFor(() => expect(checked()).toContain(222));
      expect(Math.max(...checked())).toBe(222);

      await act(() => result.current.refresh());
      await waitFor(() =>
        expect(ids(result.current.cards)).toEqual([
          211, 212, 213, 214, 215, 216, 217, 218, 219, 220,
        ]),
      );
      // 215 was checked once, ahead, not again on Refresh.
      expect(checked().filter((id) => id === 215)).toHaveLength(1);
      // Then the third batch is prepared.
      await waitFor(() => expect(checked()).toContain(230));
      await unmount();
      client.unmount();
    });

    it("checks the prepared batch again when a show in it was followed since", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, rerender, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      await waitFor(() => expect(checked()).toContain(222));

      // 213 followed from Show detail, after it was prepared.
      mockFollowed = { ids: new Set([1213]), isLoaded: true };
      await rerender({});
      await act(() => result.current.refresh());
      await waitFor(() =>
        expect(ids(result.current.cards)).toEqual([
          211, 212, 214, 215, 216, 217, 218, 219, 220, 221,
        ]),
      );
      await unmount();
      client.unmount();
    });
  });

  // CRI-123: Refresh and Start over, as on "Top picks for you".
  describe("Refresh and Start over (CRI-123)", () => {
    it("shows the next most popular shows, without followed ones", async () => {
      const { result, rerender, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      expect(result.current.control).toBe("refresh");

      // 203 followed from the row, 212 from elsewhere.
      mockFollowed = { ids: new Set([1203, 1212]), isLoaded: true };
      await rerender({});
      expect(ids(result.current.cards)).toContain(203);

      await act(() => result.current.refresh());
      await waitFor(() =>
        expect(ids(result.current.cards)).toEqual([211, 213, 214]),
      );
      await unmount();
      client.unmount();
    });

    it('reads "Start over" at the end, and starts over at the top minus followed shows', async () => {
      const { result, rerender, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      await act(() => result.current.refresh());
      await waitFor(() => expect(result.current.cards).toHaveLength(4));
      expect(result.current.control).toBe("startOver");
      expect(result.current.batch).toBe(1);

      mockFollowed = { ids: new Set([1201, 1202]), isLoaded: true };
      await rerender({});
      await act(() => result.current.refresh());
      await waitFor(() => expect(result.current.batch).toBe(2));
      expect(ids(result.current.cards)).toEqual([
        203, 204, 205, 206, 207, 208, 209, 210, 211, 212,
      ]);
      expect(result.current.control).toBe("refresh");
      await unmount();
      client.unmount();
    });

    it('says "all followed" only when every show is followed, with no control (CRI-127)', async () => {
      mockFollowed = {
        ids: new Set(onTheAir.map((show) => show.id + 1000)),
        isLoaded: true,
      };
      const { result, unmount, client } = await renderRow();

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.cards).toEqual([]);
      expect(result.current.allFollowed).toBe(true);
      expect(result.current.control).toBeNull();
      await unmount();
      client.unmount();
    });

    // CRI-127: the row is then the whole pool, so Start over would show
    // the same shows: the control is hidden, known from the batch prepared
    // ahead, without a tap.
    it("keeps the row and hides the control when the shows left are all left out", async () => {
      getWeekInfo.mockImplementation(async (tvmazeId: number) =>
        tvmazeId > 1210 ? null : airsFriday,
      );
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      await waitFor(() => expect(result.current.control).toBeNull());
      expect(result.current.batch).toBe(0);
      expect(ids(result.current.cards)).toEqual([
        201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
      ]);
      await unmount();
      client.unmount();
    });

    it("moves Home's and Search's rows together (FR-026)", async () => {
      const client = createTestQueryClient();
      const { result, unmount } = await renderHook(
        () => ({ home: useAiringThisWeek(), search: useAiringThisWeek() }),
        { wrapper: wrapperWithQueryClient(client) },
      );
      await waitFor(() => expect(result.current.home.cards).toHaveLength(10));

      await act(() => result.current.search.refresh());
      await waitFor(() => expect(result.current.home.cards).toHaveLength(4));
      expect(ids(result.current.home.cards)).toEqual(
        ids(result.current.search.cards),
      );
      await unmount();
      client.unmount();
    });
  });
});
