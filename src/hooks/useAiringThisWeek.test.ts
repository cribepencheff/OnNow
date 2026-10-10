import { act, renderHook, waitFor } from "@testing-library/react-native";

import { hasServiceInRegion } from "@/api/region-service";
import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import { MIN_AIRING_CARDS } from "@/logic/poster-snap";
import { useAiringThisWeek } from "./useAiringThisWeek";
import { ROW_SIZE } from "./useTopPicks";
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

  // CRI-131: swiping towards the end of the row loads the next batch and
  // appends it; the row only grows, and ends with the week's shows.
  describe("loading more (CRI-131)", () => {
    // 30 candidates: room for three batches.
    const thirty = Array.from({ length: 30 }, (_, i) => ({
      id: 201 + i,
      name: `Show ${201 + i}`,
      poster_path: `/p${201 + i}.jpg`,
      popularity: 100 - i,
      genre_ids: [18],
    }));
    const checked = () => resolve.mock.calls.map(([id]) => id as number);

    it("appends the next batch; earlier cards stay where they are", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      const first = ids(result.current.cards);

      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.cards).toHaveLength(20));
      expect(ids(result.current.cards).slice(0, 10)).toEqual(first);
      expect(ids(result.current.cards).slice(10)).toEqual([
        211, 212, 213, 214, 215, 216, 217, 218, 219, 220,
      ]);
      await unmount();
      client.unmount();
    });

    it("prepares one batch ahead, so loading more needs no new checks", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      // The second batch is 211–220, its checks end with 222; no further.
      await waitFor(() => expect(checked()).toContain(222));
      expect(Math.max(...checked())).toBe(222);

      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.cards).toHaveLength(20));
      // 215 was checked once, ahead, not again.
      expect(checked().filter((id) => id === 215)).toHaveLength(1);
      // Then the third batch is prepared.
      await waitFor(() => expect(checked()).toContain(230));
      await unmount();
      client.unmount();
    });

    it("moves on one batch at most, however often a fast swipe asks", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      await act(async () => {
        result.current.loadMore();
        result.current.loadMore();
        result.current.loadMore();
      });
      await waitFor(() => expect(result.current.cards).toHaveLength(20));
      // Even once the third batch is prepared, the row holds two: the
      // extra asks did not move it on.
      await waitFor(() => expect(checked()).toContain(230));
      expect(result.current.cards).toHaveLength(20);
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
      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.cards).toHaveLength(20));
      expect(ids(result.current.cards)).not.toContain(213);
      await unmount();
      client.unmount();
    });

    it("shows skeleton cards at the end while a batch is on its way", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      // The second batch's checks wait until released.
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      hasService.mockImplementation(async (tvmazeId: number) => {
        // The first batch checks up to 1212 (three at a time).
        if (tvmazeId > 1212) await held;
        return true;
      });
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.isLoadingMore).toBe(true));
      expect(result.current.cards).toHaveLength(10);

      await act(async () => release());
      await waitFor(() => expect(result.current.cards).toHaveLength(20));
      expect(result.current.isLoadingMore).toBe(false);
      await unmount();
      client.unmount();
    });

    it("ends with the week's shows: nothing more, never starting over", async () => {
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.cards).toHaveLength(14));
      expect(result.current.hasMore).toBe(false);

      await act(async () => result.current.loadMore());
      expect(result.current.cards).toHaveLength(14);
      expect(ids(result.current.cards).slice(0, 2)).toEqual([201, 202]);
      await unmount();
      client.unmount();
    });

    it('says "all followed" only when every show is followed', async () => {
      mockFollowed = {
        ids: new Set(onTheAir.map((show) => show.id + 1000)),
        isLoaded: true,
      };
      const { result, unmount, client } = await renderRow();

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.cards).toEqual([]);
      expect(result.current.allFollowed).toBe(true);
      expect(result.current.hasMore).toBe(false);
      await unmount();
      client.unmount();
    });

    it("grows Home's and Search's rows together (FR-026)", async () => {
      const client = createTestQueryClient();
      const { result, unmount } = await renderHook(
        () => ({ home: useAiringThisWeek(), search: useAiringThisWeek() }),
        { wrapper: wrapperWithQueryClient(client) },
      );
      await waitFor(() => expect(result.current.home.cards).toHaveLength(10));

      await act(async () => result.current.search.loadMore());
      await waitFor(() => expect(result.current.home.cards).toHaveLength(14));
      expect(ids(result.current.home.cards)).toEqual(
        ids(result.current.search.cards),
      );
      await unmount();
      client.unmount();
    });
  });

  // CRI-125: the row never holds fewer cards than fit on the screen. The
  // first batch is filled to ROW_SIZE, more than fit, and loading more
  // only ever appends.
  it("fills its first batch beyond what fits on the screen (CRI-125)", async () => {
    expect(ROW_SIZE).toBeGreaterThanOrEqual(MIN_AIRING_CARDS);
    const { result, unmount, client } = await renderRow();
    await waitFor(() =>
      expect(result.current.cards.length).toBeGreaterThanOrEqual(
        MIN_AIRING_CARDS,
      ),
    );
    await unmount();
    client.unmount();
  });
});
