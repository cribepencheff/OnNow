import { renderHook, waitFor } from "@testing-library/react-native";

import { tvMazeClient } from "@/api/tvmaze-client";
import searchTheBearFixture from "@/api/fixtures/search-the-bear.json";
import { tmdbClient } from "@/api/tmdb-client";
import maffiablod from "@/api/fixtures/tmdb-search-maffiablod.json";
import { useSearchShows } from "./useSearchShows";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: {
    searchShows: jest.fn(),
  },
}));
jest.mock("@/api/tmdb-client", () => ({
  tmdbClient: { suggestTitles: jest.fn(), findTranslations: jest.fn() },
}));

const mockedSearchShows = tvMazeClient.searchShows as jest.MockedFunction<
  typeof tvMazeClient.searchShows
>;
const suggestTitles = tmdbClient.suggestTitles as jest.Mock;
const findTranslations = tmdbClient.findTranslations as jest.Mock;

// FR-001, FR-024: search results while typing, running shows ranked first.
describe("useSearchShows", () => {
  beforeEach(() => {
    mockedSearchShows.mockReset().mockResolvedValue([]);
    suggestTitles.mockReset().mockResolvedValue([]);
    findTranslations.mockReset().mockResolvedValue([]);
  });

  it("does not search for an empty query", async () => {
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useSearchShows(""), {
      wrapper: wrapperWithQueryClient(client),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedSearchShows).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });

  it("searches and ranks running shows above ended ones", async () => {
    mockedSearchShows.mockResolvedValue(searchTheBearFixture as never);
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(
      () => useSearchShows("The Bear"),
      { wrapper: wrapperWithQueryClient(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSearchShows).toHaveBeenCalledWith("The Bear");
    expect(result.current.data?.[0].show.name).toBe("The Bear");

    await unmount();
    client.unmount();
  });

  // CRI-142: a half-typed last word is completed from TMDB's titles, then
  // TVmaze is searched as before.
  async function searchFor(query: string) {
    const client = createTestQueryClient();
    const hook = await renderHook(() => useSearchShows(query), {
      wrapper: wrapperWithQueryClient(client),
    });
    await waitFor(() => expect(mockedSearchShows).toHaveBeenCalled());
    await hook.unmount();
    client.unmount();
  }

  it("completes a half-typed last word before searching TVmaze", async () => {
    suggestTitles.mockResolvedValue([
      { name: "Slow Horses", original_name: "Slow Horses" },
    ]);
    await searchFor("slow h");
    expect(suggestTitles).toHaveBeenCalledWith("slow h");
    expect(mockedSearchShows).toHaveBeenCalledWith("slow Horses");
  });

  // Once TVmaze finds something; with nothing found, TMDB is asked for a
  // translated title (below).
  it("asks TMDB nothing once the last word is followed by a space", async () => {
    mockedSearchShows.mockResolvedValue(searchTheBearFixture as never);
    await searchFor("slow horses ");
    expect(suggestTitles).not.toHaveBeenCalled();
    expect(mockedSearchShows).toHaveBeenCalledWith("slow horses");
  });

  it("searches as typed when TMDB has no answer", async () => {
    suggestTitles.mockResolvedValue(null);
    await searchFor("slow h");
    expect(mockedSearchShows).toHaveBeenCalledWith("slow h");
  });

  it("searches as typed when TMDB fails", async () => {
    suggestTitles.mockRejectedValue(new Error("TMDB 500"));
    await searchFor("slow h");
    expect(mockedSearchShows).toHaveBeenCalledWith("slow h");
  });

  // Owner, 2026-10-23: a show found by a translated title. TVmaze knows only
  // the original, so Search also looks that up, and says why it is there.
  describe("by a translated title (Maffiablod)", () => {
    const thisCityIsOurs = {
      score: 1,
      show: { id: 74826, name: "This City Is Ours", status: "Running" },
    };

    beforeEach(() => {
      suggestTitles.mockResolvedValue(maffiablod.search);
      findTranslations.mockResolvedValue(maffiablod.translations);
      mockedSearchShows.mockImplementation(async (query: string) =>
        query === "This City Is Ours" ? [thisCityIsOurs as never] : [],
      );
    });

    it.each(["maffiablod", "maffiablod "])(
      "finds This City Is Ours for %p, as Maffiablod in Swedish",
      async (query) => {
        const client = createTestQueryClient();
        const { result, unmount } = await renderHook(
          () => useSearchShows(query),
          { wrapper: wrapperWithQueryClient(client) },
        );
        await waitFor(() =>
          expect(result.current.data?.[0]).toMatchObject({
            show: { id: 74826 },
            knownAs: "Maffiablod in Swedish",
          }),
        );
        expect(findTranslations).toHaveBeenCalledWith(255570);
        await unmount();
        client.unmount();
      },
    );
  });
});
