import { act, renderHook, waitFor } from "@testing-library/react-native";

import { tvMazeClient } from "@/api/tvmaze-client";
import { getFollowedIds } from "@/storage/follow-list";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import showTheBearFixture from "@/api/fixtures/show-the-bear.json";
import { SHOW_STALE_TIME_MS } from "./query-client";
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

  // CRI-95, CRI-85: cache-first launch and a pull that refetches only
  // stale shows.
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

    it("fresh cache: ready at once, no fetch on launch or on a pull", async () => {
      const client = createTestQueryClient();
      seed(client, slowHorses, showSlowHorsesFixture, 0);
      seed(client, theBear, showTheBearFixture, 0);

      const { result, unmount } = await renderHook(
        () => useFollowedEpisodes(),
        { wrapper: wrapperWithQueryClient(client) },
      );
      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.followedShows).toHaveLength(2);

      await act(() => result.current.refetch());
      expect(mockedGetShow).not.toHaveBeenCalled();

      await unmount();
      client.unmount();
    });

    it("stale cache: shown at once, refreshed in the background, and a pull refetches only the stale show", async () => {
      const client = createTestQueryClient();
      seed(client, slowHorses, showSlowHorsesFixture, 1000);
      seed(client, theBear, showTheBearFixture, SHOW_STALE_TIME_MS + 1);

      const { result, unmount } = await renderHook(
        () => useFollowedEpisodes(),
        { wrapper: wrapperWithQueryClient(client) },
      );
      await waitFor(() => expect(result.current.isReady).toBe(true));
      // The stale show refreshes on its own on launch; the fresh one does not.
      await waitFor(() => expect(mockedGetShow).toHaveBeenCalledWith(theBear));
      expect(mockedGetShow).not.toHaveBeenCalledWith(slowHorses);
      await waitFor(() => expect(result.current.isRefetching).toBe(false));

      // Time passes with no re-render: Slow Horses goes stale, The Bear
      // (just refreshed) stays fresh. The pull must judge that now.
      mockedGetShow.mockClear();
      jest.setSystemTime(Date.now() + SHOW_STALE_TIME_MS + 1 - 1000);
      await act(() => result.current.refetch());
      expect(mockedGetShow).toHaveBeenCalledTimes(1);
      expect(mockedGetShow).toHaveBeenCalledWith(slowHorses);

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
