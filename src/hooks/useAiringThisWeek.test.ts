import { act, renderHook, waitFor } from "@testing-library/react-native";
import { createElement, type ReactNode } from "react";

import { hasServiceInRegion } from "@/api/region-service";
import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import { FIRST_BATCH_SIZE, MIN_LOAD_MORE_MS } from "@/logic/poster-batches";
import { MIN_AIRING_CARDS } from "@/logic/poster-snap";
import { SettledFollowedContext } from "./useSettledFollowed";
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

  // CRI-131: each drag past the row's end loads one batch of six and
  // appends it; the row only grows, and ends with the week's shows.
  describe("loading more (CRI-131)", () => {
    // 30 candidates: the first ten, then batches of six.
    const thirty = Array.from({ length: 30 }, (_, i) => ({
      id: 201 + i,
      name: `Show ${201 + i}`,
      poster_path: `/p${201 + i}.jpg`,
      popularity: 100 - i,
      genre_ids: [18],
    }));
    const checked = () => resolve.mock.calls.map(([id]) => id as number);
    // A new batch shows its skeleton cards for MIN_LOAD_MORE_MS first.
    const slow = { timeout: MIN_LOAD_MORE_MS + 1000 };

    it("appends a batch of six; earlier cards stay where they are", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      const first = ids(result.current.cards);

      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.cards).toHaveLength(16), slow);
      expect(ids(result.current.cards).slice(0, 10)).toEqual(first);
      expect(ids(result.current.cards).slice(10)).toEqual([
        211, 212, 213, 214, 215, 216,
      ]);
      await unmount();
      client.unmount();
    });

    it("fetches nothing ahead of a drag", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      // The first batch's checks end with 212 (three at a time); no further.
      await new Promise((done) => setTimeout(done, 50));
      expect(Math.max(...checked())).toBe(212);

      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.cards).toHaveLength(16), slow);
      // 211–216, the six of the new batch, and nothing beyond.
      expect(Math.max(...checked())).toBe(216);
      await unmount();
      client.unmount();
    });

    // The fast-drag test: drags while a batch is on its way add nothing.
    it("adds exactly one batch for repeated drags while a fetch is running", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      // The second batch's checks wait until released.
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      hasService.mockImplementation(async (tvmazeId: number) => {
        if (tvmazeId > 1212) await held;
        return true;
      });
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      await act(async () => result.current.loadMore());
      await act(async () => {
        result.current.loadMore();
        result.current.loadMore();
      });
      await act(async () => result.current.loadMore());
      expect(result.current.isLoadingMore).toBe(true);

      await act(async () => release());
      await waitFor(() => expect(result.current.cards).toHaveLength(16), slow);
      await new Promise((done) => setTimeout(done, 50));
      expect(result.current.cards).toHaveLength(16);
      // One batch fetched: nothing checked beyond its six.
      expect(Math.max(...checked())).toBe(216);
      await unmount();
      client.unmount();
    });

    it("leaves out of a new batch a show followed since the last one", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, rerender, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      // 213 followed from Show detail.
      mockFollowed = { ids: new Set([1213]), isLoaded: true };
      await rerender({});
      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.cards).toHaveLength(16), slow);
      expect(ids(result.current.cards)).not.toContain(213);
      await unmount();
      client.unmount();
    });

    it("shows skeleton cards at the end while a batch is on its way", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      await act(async () => result.current.loadMore());
      expect(result.current.isLoadingMore).toBe(true);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.cards).toHaveLength(10);

      await waitFor(() => expect(result.current.cards).toHaveLength(16), slow);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.hasMore).toBe(true);
      await unmount();
      client.unmount();
    });

    it("ends with the week's shows, never more than are left, never starting over", async () => {
      const { result, unmount, client } = await renderRow();
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      await act(async () => result.current.loadMore());
      // Four left of 14: four, not six, and no top-up.
      await waitFor(() => expect(result.current.cards).toHaveLength(14), slow);
      expect(result.current.hasMore).toBe(false);

      await act(async () => result.current.loadMore());
      expect(result.current.isLoadingMore).toBe(false);
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
      await waitFor(
        () => expect(result.current.home.cards).toHaveLength(14),
        slow,
      );
      await waitFor(
        () => expect(result.current.search.cards).toHaveLength(14),
        slow,
      );
      expect(ids(result.current.home.cards)).toEqual(
        ids(result.current.search.cards),
      );
      await unmount();
      client.unmount();
    });
  });

  // CRI-131: followed shows go when Home's tab is selected again; the row
  // still never holds fewer cards than fit on the screen (CRI-125).
  describe("followed shows on a return to Home (CRI-131, CRI-125)", () => {
    const thirty = Array.from({ length: 30 }, (_, i) => ({
      id: 201 + i,
      name: `Show ${201 + i}`,
      poster_path: `/p${201 + i}.jpg`,
      popularity: 100 - i,
      genre_ids: [18],
    }));
    const slow = { timeout: MIN_LOAD_MORE_MS + 1000 };

    function renderSettled(settled: { current: ReadonlySet<number> }) {
      const client = createTestQueryClient();
      const QueryWrapper = wrapperWithQueryClient(client);
      return renderHook(() => useAiringThisWeek(), {
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(
            QueryWrapper,
            null,
            createElement(
              SettledFollowedContext.Provider,
              { value: settled.current },
              children,
            ),
          ),
      }).then((rendered) => ({ ...rendered, client }));
    }

    it("leaves out the shows followed when the rows were settled", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const settled = { current: new Set<number>() as ReadonlySet<number> };
      const { result, rerender, unmount, client } =
        await renderSettled(settled);
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      settled.current = new Set([1202, 1203]);
      await rerender({});
      expect(result.current.cards).toHaveLength(8);
      expect(ids(result.current.cards)).not.toContain(202);
      await unmount();
      client.unmount();
    });

    it("loads one more batch, without a drag, when that leaves fewer cards than fit", async () => {
      findAiringThisWeek.mockResolvedValue(thirty);
      const settled = { current: new Set<number>() as ReadonlySet<number> };
      const { result, rerender, unmount, client } =
        await renderSettled(settled);
      await waitFor(() => expect(result.current.cards).toHaveLength(10));

      // Eight of the ten followed and settled: two left.
      settled.current = new Set(
        thirty.slice(0, 8).map((show) => show.id + 1000),
      );
      mockFollowed = { ids: settled.current as Set<number>, isLoaded: true };
      await rerender({});
      await waitFor(
        () =>
          expect(result.current.cards.length).toBeGreaterThanOrEqual(
            MIN_AIRING_CARDS,
          ),
        slow,
      );
      expect(result.current.cards).toHaveLength(8);
      await unmount();
      client.unmount();
    });

    it("keeps followed cards rather than fall under what fits, when the week has no more", async () => {
      const settled = { current: new Set<number>() as ReadonlySet<number> };
      const { result, rerender, unmount, client } =
        await renderSettled(settled);
      await waitFor(() => expect(result.current.cards).toHaveLength(10));
      await act(async () => result.current.loadMore());
      await waitFor(() => expect(result.current.cards).toHaveLength(14), slow);

      settled.current = new Set(
        onTheAir.slice(0, 12).map((show) => show.id + 1000),
      );
      await rerender({});
      expect(result.current.cards).toHaveLength(14);
      await unmount();
      client.unmount();
    });
  });

  // CRI-125: the row never holds fewer cards than fit on the screen. The
  // first batch is filled to FIRST_BATCH_SIZE, more than fit, and loading
  // more only ever appends.
  it("fills its first batch beyond what fits on the screen (CRI-125)", async () => {
    expect(FIRST_BATCH_SIZE).toBeGreaterThanOrEqual(MIN_AIRING_CARDS);
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
