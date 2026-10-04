import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, waitFor } from "@testing-library/react-native";

import { omdbClient } from "@/api/omdb-client";
import { saveRating } from "@/storage/imdb-rating";
import type { TvMazeShow } from "@/api/tvmaze-types";
import showMoblandFixture from "@/api/fixtures/show-mobland.json";
import { useImdbRating } from "./useImdbRating";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

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

  it("does not cache when there is no key, so a later lookup can run", async () => {
    mockedFind.mockResolvedValue(null);
    const { result, unmount, client } = await renderFor(mobland);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();

    await unmount();
    client.unmount();
  });

  it("does not look up a show without an IMDb ID", async () => {
    const { result, unmount, client } = await renderFor({
      ...mobland,
      externals: { tvrage: null, thetvdb: null, imdb: null },
    });

    expect(result.current.data).toBeUndefined();
    expect(mockedFind).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });
});
