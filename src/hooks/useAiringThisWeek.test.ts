import { renderHook, waitFor } from "@testing-library/react-native";

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
    // Three at a time: at most two checks beyond the ten cards.
    expect(resolve.mock.calls.length).toBeLessThanOrEqual(12);
    expect(resolve.mock.calls.map(([id]) => id).slice(0, 10)).toEqual([
      201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
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
});
