import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";
import { useListPoster } from "./useListPoster";

jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: { findImages: jest.fn() },
}));

const findImages = tmdbClient.findImages as jest.Mock;

async function render(show: TvMazeShow) {
  const client = createTestQueryClient();
  const hook = await renderHook(() => useListPoster(show), {
    wrapper: wrapperWithQueryClient(client),
  });
  return { ...hook, client };
}

// CRI-100: a list's poster is TVmaze's; without one, TMDB's main poster,
// asked for only then (Cecilias Unge: no TVmaze image, a TMDB poster).
describe("useListPoster (CRI-100)", () => {
  beforeEach(() => findImages.mockReset());

  it("takes TVmaze's poster, and asks TMDB nothing", async () => {
    const { result, unmount, client } = await render({
      id: 1,
      name: "Slow Horses",
      image: { medium: "https://static.tvmaze.com/m.jpg", original: null },
    } as TvMazeShow);
    expect(result.current).toEqual({
      uri: "https://static.tvmaze.com/m.jpg",
      pending: false,
    });
    expect(findImages).not.toHaveBeenCalled();
    await unmount();
    client.unmount();
    // useShowImages keeps answers 21 days (gcTime): clear its timers.
    client.clear();
  });

  it("takes TMDB's poster when TVmaze has none, pending meanwhile", async () => {
    findImages.mockResolvedValue({
      tvId: 283033,
      images: { backdrops: [], logos: [] },
      posterPath: "/p.jpg",
    });
    const { result, unmount, client } = await render({
      id: 81908,
      name: "Cecilias Unge",
      image: null,
    } as TvMazeShow);
    expect(result.current.pending).toBe(true);
    await waitFor(() =>
      expect(result.current).toEqual({
        uri: "https://image.tmdb.org/t/p/w185/p.jpg",
        pending: false,
      }),
    );
    await unmount();
    client.unmount();
    // useShowImages keeps answers 21 days (gcTime): clear its timers.
    client.clear();
  });

  it("has none when neither has a poster", async () => {
    findImages.mockResolvedValue({
      tvId: 1,
      images: { backdrops: [], logos: [] },
      posterPath: null,
    });
    const { result, unmount, client } = await render({
      id: 91814,
      name: "The Girl with the Dragon Tattoo",
      image: null,
    } as TvMazeShow);
    await waitFor(() =>
      expect(result.current).toEqual({ uri: undefined, pending: false }),
    );
    await unmount();
    client.unmount();
    // useShowImages keeps answers 21 days (gcTime): clear its timers.
    client.clear();
  });
});
