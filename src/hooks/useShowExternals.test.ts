import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { useShowExternals } from "./useShowExternals";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: { findExternalIds: jest.fn() },
}));

const mockedFind = tmdbClient.findExternalIds as jest.Mock;

function show(externals: TvMazeShow["externals"]): TvMazeShow {
  return {
    id: 92764,
    name: "JAŸ-Z IN 8",
    premiered: "2026-09-18",
    externals,
  } as TvMazeShow;
}

async function renderFor(target: TvMazeShow) {
  const client = createTestQueryClient();
  const rendered = await renderHook(() => useShowExternals(target), {
    wrapper: wrapperWithQueryClient(client),
  });
  return { ...rendered, client };
}

describe("useShowExternals (CRI-103)", () => {
  beforeEach(() => mockedFind.mockReset());

  it("does not ask TMDB when TVmaze has both IDs", async () => {
    const { result, unmount, client } = await renderFor(
      show({ tvrage: null, imdb: "tt1", thetvdb: 7 }),
    );

    expect(result.current).toEqual({ imdb: "tt1", thetvdb: 7 });
    expect(mockedFind).not.toHaveBeenCalled();
    await unmount();
    client.unmount();
  });

  it("fills TVmaze's missing IDs from TMDB (JAŸ-Z IN 8)", async () => {
    mockedFind.mockResolvedValue({ imdb: "tt43619535", thetvdb: 479659 });
    const { result, unmount, client } = await renderFor(
      show({ tvrage: null, imdb: null, thetvdb: null }),
    );

    await waitFor(() =>
      expect(result.current).toEqual({ imdb: "tt43619535", thetvdb: 479659 }),
    );
    await unmount();
    client.unmount();
  });

  it("keeps TVmaze's IDs when the show is not on TMDB", async () => {
    mockedFind.mockResolvedValue(NOT_ON_TMDB);
    const { result, unmount, client } = await renderFor(
      show({ tvrage: null, imdb: "tt1", thetvdb: null }),
    );

    await waitFor(() => expect(mockedFind).toHaveBeenCalled());
    expect(result.current).toEqual({ imdb: "tt1", thetvdb: null });
    await unmount();
    client.unmount();
  });
});
