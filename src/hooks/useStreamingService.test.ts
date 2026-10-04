import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, waitFor } from "@testing-library/react-native";

import { tmdbClient } from "@/api/tmdb-client";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { saveProviders } from "@/storage/streaming-service";
import type { TvMazeShow } from "@/api/tvmaze-types";
import showNeagleyFixture from "@/api/fixtures/show-neagley.json";
import { useStreamingService } from "./useStreamingService";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("./useRegion", () => ({
  useRegion: () => ({ region: "SE" }),
}));
jest.mock("@/api/tmdb-client", () => ({
  ...jest.requireActual("@/api/tmdb-client"),
  tmdbClient: { findStreamingProviders: jest.fn() },
}));

const mockedFind = tmdbClient.findStreamingProviders as jest.MockedFunction<
  typeof tmdbClient.findStreamingProviders
>;
const neagley = showNeagleyFixture as unknown as TvMazeShow;
const PRIME = [{ providerId: 119, providerName: "Amazon Prime Video" }];

// CRI-82: a followed show's Swedish services are looked up once through
// TMDB and kept with the show; later reads come from the cache.
describe("useStreamingService (FR-014, NFR-005, CRI-82)", () => {
  beforeEach(async () => {
    mockedFind.mockReset();
    await AsyncStorage.clear();
  });

  async function renderFor(enabled: boolean) {
    const client = createTestQueryClient();
    const rendered = await renderHook(
      () => useStreamingService(neagley, enabled),
      { wrapper: wrapperWithQueryClient(client) },
    );
    return { ...rendered, client };
  }

  it("looks up a followed show through TMDB and caches the result", async () => {
    mockedFind.mockResolvedValue(PRIME);
    const { result, unmount, client } = await renderFor(true);

    await waitFor(() => expect(result.current.data).toEqual(PRIME));
    expect(mockedFind).toHaveBeenCalledWith(
      {
        imdb: "tt33539520",
        thetvdb: 455064,
        name: "Neagley",
        premiered: "2026-09-16",
      },
      "SE",
    );
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("onnow.streamingService.v2.SE.82707"))!,
      ).providers,
    ).toEqual(PRIME);

    await unmount();
    client.unmount();
  });

  it("reads a cached lookup without calling TMDB again", async () => {
    await saveProviders(82707, "SE", PRIME, Date.now());
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

  it('CRI-102: saves "not on TMDB", so the next launch does not search again', async () => {
    mockedFind.mockResolvedValue(NOT_ON_TMDB);
    const { result, unmount, client } = await renderFor(true);

    await waitFor(() => expect(result.current.data).toBe(NOT_ON_TMDB));
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("onnow.streamingService.v2.SE.82707"))!,
      ).providers,
    ).toBe(NOT_ON_TMDB);

    await unmount();
    client.unmount();
  });

  it("does not cache a null answer (no API key, or no TMDB match, CRI-99), so a later lookup can run", async () => {
    mockedFind.mockResolvedValue(null);
    const { result, unmount, client } = await renderFor(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(
      await AsyncStorage.getItem("onnow.streamingService.v2.SE.82707"),
    ).toBeNull();

    await unmount();
    client.unmount();
  });
});
