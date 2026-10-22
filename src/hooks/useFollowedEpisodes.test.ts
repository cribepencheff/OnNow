import { act, renderHook, waitFor } from "@testing-library/react-native";

import { tvMazeClient } from "@/api/tvmaze-client";
import { getFollowedIds } from "@/storage/follow-list";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import showTheBearFixture from "@/api/fixtures/show-the-bear.json";
import {
  ENDED_SHOW_STALE_TIME_MS,
  HERO_WEEK_SHOW_STALE_TIME_MS,
  SHOW_STALE_TIME_MS,
} from "@/logic/show-staleness";
import { useFollowedEpisodes } from "./useFollowedEpisodes";
import { showQueryKey } from "./useShow";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: {
    getShowWithEpisodesAndSeasons: jest.fn(),
  },
}));

jest.mock("@/storage/follow-list", () => ({
  getFollowedIds: jest.fn(),
}));

const mockedGetShow =
  tvMazeClient.getShowWithEpisodesAndSeasons as jest.MockedFunction<
    typeof tvMazeClient.getShowWithEpisodesAndSeasons
  >;
const mockedGetFollowedIds = getFollowedIds as jest.MockedFunction<
  typeof getFollowedIds
>;

// FR-004, FR-006, ADR 0009: real TVmaze fixtures, Slow Horses has an episode
// on 2026-09-23; The Bear has ended with none upcoming.
describe("useFollowedEpisodes", () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;

  beforeEach(() => {
    mockedGetShow.mockReset();
    mockedGetFollowedIds.mockReset();
    jest.useFakeTimers().setSystemTime(new Date("2026-09-23T00:00:00Z"));
    Intl.DateTimeFormat = ((...args: unknown[]) => {
      const format = new originalDateTimeFormat(
        ...(args as ConstructorParameters<typeof Intl.DateTimeFormat>),
      );
      return {
        ...format,
        // Kept, so code that formats dates still works.
        format: (date?: Date | number) => format.format(date),
        resolvedOptions: () => ({
          ...format.resolvedOptions(),
          timeZone: "UTC",
        }),
      };
    }) as typeof Intl.DateTimeFormat;
  });

  afterEach(() => {
    Intl.DateTimeFormat = originalDateTimeFormat;
    jest.useRealTimers();
  });

  it("returns the followed show with an episode today (FR-004)", async () => {
    mockedGetFollowedIds.mockResolvedValue([
      showSlowHorsesFixture.id,
      showTheBearFixture.id,
    ]);
    mockedGetShow.mockImplementation(async (id) => {
      if (id === showSlowHorsesFixture.id) {
        return showSlowHorsesFixture as never;
      }
      return showTheBearFixture as never;
    });
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowedEpisodes(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.showsWithEpisodeToday).toHaveLength(1);
    expect(result.current.showsWithEpisodeToday[0].show.name).toBe(
      "Slow Horses",
    );
    expect(result.current.followedShows).toHaveLength(2);
    expect(
      result.current.followedShows.map(({ show }) => show.name).sort(),
    ).toEqual(["Slow Horses", "The Bear"]);

    await unmount();
    client.unmount();
  });

  // CRI-137: useQueries returns a new array every render, and everything
  // derived from it was rebuilt every render too, walking every followed
  // show's full episode list. With nothing changed, a re-render must hand
  // back the same arrays.
  it("returns the same arrays on a re-render when nothing changed (CRI-137)", async () => {
    mockedGetFollowedIds.mockResolvedValue([
      showSlowHorsesFixture.id,
      showTheBearFixture.id,
    ]);
    mockedGetShow.mockImplementation(async (id) =>
      id === showSlowHorsesFixture.id
        ? (showSlowHorsesFixture as never)
        : (showTheBearFixture as never),
    );
    const client = createTestQueryClient();

    const { result, rerender, unmount } = await renderHook(
      () => useFollowedEpisodes(),
      { wrapper: wrapperWithQueryClient(client) },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const first = result.current;

    await rerender({});
    expect(result.current.followedShows).toBe(first.followedShows);
    expect(result.current.showsWithEpisodeToday).toBe(
      first.showsWithEpisodeToday,
    );
    expect(result.current.nextDayEpisodes).toBe(first.nextDayEpisodes);
    expect(result.current.nextByShow).toBe(first.nextByShow);

    await unmount();
    client.unmount();
  });

  it("falls back to the show's status for a show with nothing upcoming (FR-006)", async () => {
    mockedGetFollowedIds.mockResolvedValue([
      showSlowHorsesFixture.id,
      showTheBearFixture.id,
    ]);
    mockedGetShow.mockImplementation(async (id) => {
      if (id === showSlowHorsesFixture.id) {
        return showSlowHorsesFixture as never;
      }
      return showTheBearFixture as never;
    });
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowedEpisodes(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nextByShow).toEqual([
      {
        showId: showTheBearFixture.id,
        next: { kind: "status", status: "Ended" },
      },
    ]);

    await unmount();
    client.unmount();
  });

  it("returns the episodes of the next day with episodes when today is empty (FR-006)", async () => {
    jest.setSystemTime(new Date("2026-09-24T00:00:00Z"));
    mockedGetFollowedIds.mockResolvedValue([
      showSlowHorsesFixture.id,
      showTheBearFixture.id,
    ]);
    mockedGetShow.mockImplementation(async (id) => {
      if (id === showSlowHorsesFixture.id) {
        return showSlowHorsesFixture as never;
      }
      return showTheBearFixture as never;
    });
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowedEpisodes(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The Bear has ended with nothing upcoming; Slow Horses' next episode
    // after 2026-09-24 is S6E3 on 2026-09-30.
    expect(result.current.showsWithEpisodeToday).toEqual([]);
    expect(result.current.nextDayEpisodes?.localDate).toBe("2026-09-30");
    expect(result.current.nextDayEpisodes?.shows).toHaveLength(1);
    expect(result.current.nextDayEpisodes?.shows[0].show.name).toBe(
      "Slow Horses",
    );
    expect(result.current.nextDayEpisodes?.shows[0].episodes).toHaveLength(1);
    expect(result.current.nextDayEpisodes?.shows[0].episodes[0].number).toBe(3);

    await unmount();
    client.unmount();
  });

  it("returns no shows with an episode today when the follow list is empty", async () => {
    mockedGetFollowedIds.mockResolvedValue([]);
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowedEpisodes(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.followedCount).toBe(0);
    expect(result.current.showsWithEpisodeToday).toEqual([]);
    expect(result.current.nextDayEpisodes).toBeNull();
    expect(result.current.nextByShow).toEqual([]);
    expect(result.current.followedShows).toEqual([]);
    expect(mockedGetShow).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });

  it("reports the followed count for the empty follow list state (FR-013)", async () => {
    mockedGetFollowedIds.mockResolvedValue([
      showSlowHorsesFixture.id,
      showTheBearFixture.id,
    ]);
    mockedGetShow.mockImplementation(async (id) => {
      if (id === showSlowHorsesFixture.id) {
        return showSlowHorsesFixture as never;
      }
      return showTheBearFixture as never;
    });
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowedEpisodes(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.followedCount).toBe(2);

    await unmount();
    client.unmount();
  });

  it("reports an error only when nothing loaded for a followed show, not on a failed refetch with cached data", async () => {
    mockedGetFollowedIds.mockResolvedValue([showSlowHorsesFixture.id]);
    mockedGetShow.mockRejectedValue(new Error("network down"));
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowedEpisodes(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.showsWithEpisodeToday).toEqual([]);

    await unmount();
    client.unmount();
  });

  // CRI-95, CRI-85, ADR 0017 amendment (owner, 2026-10-22): cache-first
  // launch; a show in the hero's week is fresh a day, any other a week; a
  // pull refetches the hero's week at once, and any other show only once
  // stale. Slow Horses airs today (in the week); The Bear has ended.
  describe("cache (CRI-95, CRI-85)", () => {
    const slowHorses = showSlowHorsesFixture.id;
    const theBear = showTheBearFixture.id;

    function seed(
      client: ReturnType<typeof createTestQueryClient>,
      id: number,
      fixture: unknown,
      ageMs: number,
    ) {
      client.setQueryData(showQueryKey(id), fixture, {
        updatedAt: Date.now() - ageMs,
      });
    }

    beforeEach(() => {
      mockedGetFollowedIds.mockResolvedValue([slowHorses, theBear]);
      mockedGetShow.mockImplementation(
        async (id) =>
          (id === slowHorses
            ? showSlowHorsesFixture
            : showTheBearFixture) as never,
      );
    });

    it("fresh cache: ready at once, no fetch on launch; a pull refetches only the hero's week", async () => {
      const client = createTestQueryClient();
      seed(client, slowHorses, showSlowHorsesFixture, 0);
      seed(client, theBear, showTheBearFixture, 0);

      const { result, unmount } = await renderHook(
        () => useFollowedEpisodes(),
        { wrapper: wrapperWithQueryClient(client) },
      );
      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.followedShows).toHaveLength(2);
      expect(mockedGetShow).not.toHaveBeenCalled();

      await act(() => result.current.refetch());
      expect(mockedGetShow).toHaveBeenCalledTimes(1);
      expect(mockedGetShow).toHaveBeenCalledWith(slowHorses);

      await unmount();
      client.unmount();
    });

    it("launch: refreshes a show in the hero's week after a day, not after an hour", async () => {
      for (const [age, fetched] of [
        [SHOW_STALE_TIME_MS + 1, false],
        [HERO_WEEK_SHOW_STALE_TIME_MS + 1, true],
      ] as const) {
        mockedGetShow.mockClear();
        const client = createTestQueryClient();
        seed(client, slowHorses, showSlowHorsesFixture, age);
        seed(client, theBear, showTheBearFixture, 0);
        const { result, unmount } = await renderHook(
          () => useFollowedEpisodes(),
          { wrapper: wrapperWithQueryClient(client) },
        );
        await waitFor(() => expect(result.current.isReady).toBe(true));
        await waitFor(() => expect(result.current.isRefetching).toBe(false));
        expect(mockedGetShow.mock.calls.some(([id]) => id === slowHorses)).toBe(
          fetched,
        );
        await unmount();
        client.unmount();
      }
    });

    // CRI-107: an ended show is refetched about weekly, on launch and on a
    // pull alike.
    it("refetches an ended show after a week, not after a day, on a pull", async () => {
      const client = createTestQueryClient();
      seed(client, slowHorses, showSlowHorsesFixture, 0);
      seed(
        client,
        theBear,
        showTheBearFixture,
        HERO_WEEK_SHOW_STALE_TIME_MS + 1,
      );

      const { result, unmount } = await renderHook(
        () => useFollowedEpisodes(),
        { wrapper: wrapperWithQueryClient(client) },
      );
      await waitFor(() => expect(result.current.isReady).toBe(true));
      await act(() => result.current.refetch());
      expect(mockedGetShow).not.toHaveBeenCalledWith(theBear);

      jest.setSystemTime(Date.now() + ENDED_SHOW_STALE_TIME_MS);
      await act(() => result.current.refetch());
      expect(mockedGetShow).toHaveBeenCalledWith(theBear);

      await unmount();
      client.unmount();
    });

    it("empty cache: not ready until the first fetch settles", async () => {
      const pending: (() => void)[] = [];
      mockedGetShow.mockImplementation(
        (id) =>
          new Promise((resolve) => {
            pending.push(() =>
              resolve(
                (id === slowHorses
                  ? showSlowHorsesFixture
                  : showTheBearFixture) as never,
              ),
            );
          }),
      );
      const client = createTestQueryClient();

      const { result, unmount } = await renderHook(
        () => useFollowedEpisodes(),
        { wrapper: wrapperWithQueryClient(client) },
      );
      await waitFor(() => expect(pending).toHaveLength(2));
      expect(result.current.isReady).toBe(false);

      await act(async () => pending.forEach((resolve) => resolve()));
      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.followedShows).toHaveLength(2);

      await unmount();
      client.unmount();
    });
  });
});
