import { renderHook, waitFor } from "@testing-library/react-native";

import { tvMazeClient } from "@/api/tvmaze-client";
import searchTheBearFixture from "@/api/fixtures/search-the-bear.json";
import { tmdbClient } from "@/api/tmdb-client";
import { useSearchShows } from "./useSearchShows";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: {
    searchShows: jest.fn(),
  },
}));
jest.mock("@/api/tmdb-client", () => ({
  tmdbClient: { suggestTitles: jest.fn() },
}));

const mockedSearchShows = tvMazeClient.searchShows as jest.MockedFunction<
  typeof tvMazeClient.searchShows
>;
const suggestTitles = tmdbClient.suggestTitles as jest.Mock;

// FR-001, FR-024: search results while typing, running shows ranked first.
describe("useSearchShows", () => {
  beforeEach(() => {
    mockedSearchShows.mockReset().mockResolvedValue([]);
    suggestTitles.mockReset().mockResolvedValue([]);
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

  it("asks TMDB nothing once the last word is followed by a space", async () => {
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
});
