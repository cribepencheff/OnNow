import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";
import { useShowImages } from "./useShowImages";

jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: { findImages: jest.fn() },
}));

const findImages = tmdbClient.findImages as jest.Mock;
const SHOW = {
  id: 1,
  name: "Neagley",
  premiered: "2026-09-16",
  externals: { imdb: "tt33539520", thetvdb: 455064, tvrage: null },
} as unknown as TvMazeShowWithEmbeds;

const image = (
  file_path: string,
  vote_average: number,
  iso_639_1: string | null,
) => ({
  file_path,
  vote_average,
  vote_count: 1,
  iso_639_1,
  width: 1920,
  height: 1080,
});

// The hero's backdrop and logo, through the app's TMDB client (CRI-107).
describe("useShowImages", () => {
  beforeEach(() => findImages.mockReset());

  async function render() {
    const client = createTestQueryClient();
    const hook = await renderHook(() => useShowImages(SHOW), {
      wrapper: wrapperWithQueryClient(client),
    });
    return { ...hook, client };
  }

  it("picks the highest-rated textless backdrop and the English logo", async () => {
    findImages.mockResolvedValue({
      tvId: 273207,
      images: {
        backdrops: [
          image("/low.jpg", 5, null),
          image("/high.jpg", 8, null),
          image("/text.jpg", 9, "en"),
        ],
        logos: [image("/logo.png", 7, "en")],
      },
    });
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      tmdbId: 273207,
      highestRatedBackdrop: { file_path: "/high.jpg" },
      textlessCount: 2,
      logo: { file_path: "/logo.png" },
    });
    await unmount();
    client.unmount();
  });

  it("has no images for a show TMDB does not know", async () => {
    findImages.mockResolvedValue(NOT_ON_TMDB);
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      tmdbId: null,
      highestRatedBackdrop: null,
      logo: null,
    });
    await unmount();
    client.unmount();
  });

  it("fails without a TMDB key, so no empty answer is kept", async () => {
    findImages.mockResolvedValue(null);
    const { result, unmount, client } = await render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    await unmount();
    client.unmount();
  });
});
