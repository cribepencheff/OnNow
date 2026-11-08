import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";
import { useTmdbSeason } from "./useTmdbSeason";

jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: { findSeasonEpisodes: jest.fn() },
}));

const findSeasonEpisodes = tmdbClient.findSeasonEpisodes as jest.Mock;
const SHOW = {
  id: 90249,
  name: "100 Days of Deception",
  premiered: "2026-10-10",
  externals: { imdb: null, thetvdb: null, tvrage: null },
} as unknown as TvMazeShow;

// CRI-143: a season's TMDB stills, one request per season looked at.
describe("useTmdbSeason (CRI-143)", () => {
  beforeEach(() => findSeasonEpisodes.mockReset());

  async function render(season: number | undefined) {
    return renderHook(() => useTmdbSeason(SHOW, season), {
      wrapper: wrapperWithQueryClient(createTestQueryClient()),
    });
  }

  it("gives the season's stills", async () => {
    const stills = [
      { episodeNumber: 9, airDate: "2026-11-07", stillPath: "/9.jpg" },
    ];
    findSeasonEpisodes.mockResolvedValue(stills);
    const { result, unmount } = await render(1);
    await waitFor(() => expect(result.current.data).toEqual(stills));
    expect(findSeasonEpisodes).toHaveBeenCalledWith(
      expect.objectContaining({ name: "100 Days of Deception" }),
      1,
    );
    await unmount();
  });

  it("gives none without a key or a TMDB match, so TVmaze's stills show", async () => {
    findSeasonEpisodes.mockResolvedValueOnce(null);
    const noKey = await render(1);
    await waitFor(() => expect(noKey.result.current.data).toEqual([]));
    await noKey.unmount();

    findSeasonEpisodes.mockResolvedValueOnce(NOT_ON_TMDB);
    const notOnTmdb = await render(1);
    await waitFor(() => expect(notOnTmdb.result.current.data).toEqual([]));
    await notOnTmdb.unmount();
  });

  it("asks nothing without a season", async () => {
    const { result, unmount } = await render(undefined);
    expect(result.current.fetchStatus).toBe("idle");
    expect(findSeasonEpisodes).not.toHaveBeenCalled();
    await unmount();
  });
});
