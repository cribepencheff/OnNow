import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, waitFor } from "@testing-library/react-native";

import { omdbClient } from "@/api/omdb-client";
import { tmdbClient } from "@/api/tmdb-client";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { NO_RATING_CACHE_MAX_AGE_MS, saveRating } from "@/storage/imdb-rating";
import type { TvMazeShow } from "@/api/tvmaze-types";
import showMoblandFixture from "@/api/fixtures/show-mobland.json";
import { useImdbRating } from "./useImdbRating";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: {
    findExternalIds: jest.fn(async () => ({
      imdb: "tt43619535",
      thetvdb: 479659,
    })),
  },
}));
jest.mock("@/api/omdb-client", () => ({
  omdbClient: { findImdbRating: jest.fn() },
}));

const mockedFind = omdbClient.findImdbRating as jest.MockedFunction<
  typeof omdbClient.findImdbRating
>;
const mobland = showMoblandFixture as unknown as TvMazeShow;
const STORAGE_KEY = `onnow.imdbRating.${mobland.id}`;

describe("useImdbRating (CRI-87, ADR 0013)", () => {
  beforeEach(async () => {
    mockedFind.mockReset();
    await AsyncStorage.clear();
  });

  async function renderFor(show: TvMazeShow) {
    const client = createTestQueryClient();
    const rendered = await renderHook(() => useImdbRating(show), {
      wrapper: wrapperWithQueryClient(client),
    });
    return { ...rendered, client };
  }

  it("looks up the rating by the IMDb ID from TVmaze and caches it", async () => {
    mockedFind.mockResolvedValue({ rating: "8.3" });
    const { result, unmount, client } = await renderFor(mobland);

    await waitFor(() => expect(result.current.data).toBe("8.3"));
    expect(mockedFind).toHaveBeenCalledWith("tt31510819");
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!).rating).toBe(
      "8.3",
    );

    await unmount();
    client.unmount();
  });

  it("CRI-92: caches OMDb's N/A as no rating, by IMDb ID", async () => {
    mockedFind.mockResolvedValue({ rating: null });
    const { result, unmount, client } = await renderFor(mobland);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mockedFind).toHaveBeenCalledWith("tt31510819");
    expect(
      JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!).rating,
    ).toBeNull();

    await unmount();
    client.unmount();
  });

  it("reads a cached rating, including a cached no rating, without calling OMDb", async () => {
    await saveRating(mobland.id, null, Date.now());
    const { result, unmount, client } = await renderFor(mobland);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mockedFind).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });

  // CRI-92: the hourly re-check (staleTime) only reads the stored expiry;
  // OMDb is called for an expired entry only.
  it("CRI-92: a re-check of unexpired entries never calls OMDb", async () => {
    await saveRating(mobland.id, "8.3", Date.now() - 6 * 24 * 60 * 60 * 1000);
    const { result, unmount, client } = await renderFor(mobland);
    await waitFor(() => expect(result.current.data).toBe("8.3"));

    await result.current.refetch();

    expect(result.current.data).toBe("8.3");
    expect(mockedFind).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });

  it("CRI-92: a re-check after a no rating expires asks OMDb again, once", async () => {
    const start = Date.now();
    await saveRating(mobland.id, null, start);
    const { result, unmount, client } = await renderFor(mobland);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFind).not.toHaveBeenCalled();

    const later = jest
      .spyOn(Date, "now")
      .mockReturnValue(start + NO_RATING_CACHE_MAX_AGE_MS + 1);
    mockedFind.mockResolvedValue({ rating: "8.2" });
    // Asserted on the refetch result: a frozen Date.now also stalls waitFor.
    const refetched = await result.current.refetch();

    expect(refetched.data).toBe("8.2");
    expect(mockedFind).toHaveBeenCalledTimes(1);
    expect(mockedFind).toHaveBeenCalledWith("tt31510819");

    later.mockRestore();
    await unmount();
    client.unmount();
  });

  it("does not cache when there is no key, so a later lookup can run", async () => {
    mockedFind.mockResolvedValue(null);
    const { result, unmount, client } = await renderFor(mobland);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();

    await unmount();
    client.unmount();
  });

  it("CRI-103: uses TMDB's IMDb ID when TVmaze has none (JAŸ-Z IN 8)", async () => {
    mockedFind.mockResolvedValue({ rating: "8.2" });
    const jayZ = {
      id: 92764,
      name: "JAŸ-Z IN 8",
      premiered: "2026-09-18",
      externals: { tvrage: null, imdb: null, thetvdb: null },
    } as TvMazeShow;
    const { result, unmount, client } = await renderFor(jayZ);

    await waitFor(() => expect(result.current.data).toBe("8.2"));
    expect(result.current.imdbId).toBe("tt43619535");
    expect(mockedFind).toHaveBeenCalledWith("tt43619535");

    await unmount();
    client.unmount();
  });

  it("does not look up a show without an IMDb ID on TVmaze or TMDB", async () => {
    const findExternalIds = tmdbClient.findExternalIds as jest.Mock;
    findExternalIds.mockResolvedValueOnce(NOT_ON_TMDB);
    const { result, unmount, client } = await renderFor({
      ...mobland,
      externals: { tvrage: null, thetvdb: null, imdb: null },
    });

    await waitFor(() => expect(findExternalIds).toHaveBeenCalled());
    expect(result.current.data).toBeUndefined();
    expect(mockedFind).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });
});
