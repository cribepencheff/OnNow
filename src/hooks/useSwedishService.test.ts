import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import { saveProviders } from "@/storage/streaming-service";
import type { TvMazeShow } from "@/api/tvmaze-types";
import showNeagleyFixture from "@/api/fixtures/show-neagley.json";
import { useSwedishService } from "./useSwedishService";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tmdb-client", () => ({
  tmdbClient: { findSwedishProviders: jest.fn() },
}));

const mockedFind = tmdbClient.findSwedishProviders as jest.MockedFunction<
  typeof tmdbClient.findSwedishProviders
>;
const neagley = showNeagleyFixture as unknown as TvMazeShow;
const PRIME = [{ providerId: 119, providerName: "Amazon Prime Video" }];

// CRI-82: a followed show's Swedish services are looked up once through
// TMDB and kept with the show; later reads come from the cache.
describe("useSwedishService (FR-014, NFR-005, CRI-82)", () => {
  beforeEach(async () => {
    mockedFind.mockReset();
    await AsyncStorage.clear();
  });

  async function renderFor(enabled: boolean) {
    const client = createTestQueryClient();
    const rendered = await renderHook(
      () => useSwedishService(neagley, enabled),
      { wrapper: wrapperWithQueryClient(client) },
    );
    return { ...rendered, client };
  }

  it("looks up a followed show through TMDB and caches the result", async () => {
    mockedFind.mockResolvedValue(PRIME);
    const { result, unmount, client } = await renderFor(true);

    await waitFor(() => expect(result.current.data).toEqual(PRIME));
    expect(mockedFind).toHaveBeenCalledWith({
      imdb: "tt33539520",
      thetvdb: 455064,
    });
    expect(
      JSON.parse((await AsyncStorage.getItem("onnow.swedishService.82707"))!)
        .providers,
    ).toEqual(PRIME);

    await unmount();
    client.unmount();
  });

  it("reads a cached lookup without calling TMDB again", async () => {
    await saveProviders(82707, PRIME, Date.now());
    const { result, unmount, client } = await renderFor(true);

    await waitFor(() => expect(result.current.data).toEqual(PRIME));
    expect(mockedFind).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });

  it("does not look up a show that is not followed", async () => {
    const { result, unmount, client } = await renderFor(false);

    expect(result.current.data).toBeUndefined();
    expect(mockedFind).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });

  it("does not cache when there is no API key (null), so a later lookup can run", async () => {
    mockedFind.mockResolvedValue(null);
    const { result, unmount, client } = await renderFor(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(await AsyncStorage.getItem("onnow.swedishService.82707")).toBeNull();

    await unmount();
    client.unmount();
  });
});
