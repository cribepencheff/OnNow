import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import { useAiringThisWeek, useNextEpisodeWord } from "./useAiringThisWeek";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tmdb-client", () => ({
  tmdbClient: { findOnTheAir: jest.fn() },
}));
jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: { getNextEpisodeAirstamp: jest.fn() },
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

const findOnTheAir = tmdbClient.findOnTheAir as jest.Mock;
const getNextEpisodeAirstamp = tvMazeClient.getNextEpisodeAirstamp as jest.Mock;
const resolve = resolveTvMazeId as jest.Mock;

// 14 scripted shows, popularity 100 down to 87; TVmaze id = TMDB id + 1000.
const onTheAir = Array.from({ length: 14 }, (_, i) => ({
  id: 201 + i,
  name: `Show ${201 + i}`,
  poster_path: `/p${201 + i}.jpg`,
  popularity: 100 - i,
  genre_ids: [18],
}));

function render<T>(hook: () => T) {
  const client = createTestQueryClient();
  return renderHook(hook, { wrapper: wrapperWithQueryClient(client) }).then(
    (rendered) => ({ ...rendered, client }),
  );
}

describe("useAiringThisWeek (FR-039)", () => {
  beforeEach(() => {
    mockFollowed = { ids: new Set(), isLoaded: true };
    findOnTheAir.mockReset().mockResolvedValue(onTheAir);
    resolve.mockReset().mockImplementation(async (id: number) => id + 1000);
  });

  it("fills ten in popularity order, with only ten lookups", async () => {
    const { result, unmount, client } = await render(() => useAiringThisWeek());

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(result.current[0].tmdbId).toBe(201);
    expect(resolve).toHaveBeenCalledTimes(10);
    await unmount();
    client.unmount();
  });

  it("leaves out followed shows, and waits for the follow list first", async () => {
    mockFollowed = { ids: new Set([1201]), isLoaded: false };
    const { result, rerender, unmount, client } = await render(() =>
      useAiringThisWeek(),
    );
    expect(resolve).not.toHaveBeenCalled();

    mockFollowed = { ids: new Set([1201]), isLoaded: true };
    await rerender({});
    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(result.current.map((card) => card.tmdbId)).not.toContain(201);
    await unmount();
    client.unmount();
  });

  it("keeps a show followed from the row on its card", async () => {
    const { result, rerender, unmount, client } = await render(() =>
      useAiringThisWeek(),
    );
    await waitFor(() => expect(result.current).toHaveLength(10));

    mockFollowed = { ids: new Set([1203]), isLoaded: true };
    await rerender({});
    expect(result.current.map((card) => card.tmdbId)).toContain(203);
    await unmount();
    client.unmount();
  });

  it("is always available, also with an empty follow list", async () => {
    mockFollowed = { ids: new Set(), isLoaded: true };
    const { result, unmount, client } = await render(() => useAiringThisWeek());
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));
    await unmount();
    client.unmount();
  });
});

describe("useNextEpisodeWord (FR-039)", () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;
  beforeEach(() => {
    getNextEpisodeAirstamp.mockReset();
    Intl.DateTimeFormat = ((...args: unknown[]) => {
      const format = new originalDateTimeFormat(
        ...(args as ConstructorParameters<typeof Intl.DateTimeFormat>),
      );
      return {
        ...format,
        resolvedOptions: () => ({
          ...format.resolvedOptions(),
          timeZone: "Europe/Stockholm",
        }),
      };
    }) as typeof Intl.DateTimeFormat;
  });
  afterEach(() => {
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  it("gives the next episode's day in the user's time zone", async () => {
    // 01:00 UTC on Friday is Friday in Stockholm.
    getNextEpisodeAirstamp.mockResolvedValue("2026-10-09T01:00:00+00:00");
    const { result, unmount, client } = await render(() =>
      useNextEpisodeWord(1201),
    );
    await waitFor(() => expect(result.current).toBe("Fri"));
    await unmount();
    client.unmount();
  });

  it("is nothing without a next episode or outside the week", async () => {
    getNextEpisodeAirstamp.mockResolvedValue("2026-10-20T01:00:00+00:00");
    const { result, unmount, client } = await render(() =>
      useNextEpisodeWord(1202),
    );
    await waitFor(() => expect(getNextEpisodeAirstamp).toHaveBeenCalled());
    expect(result.current).toBeNull();
    await unmount();
    client.unmount();
  });
});
