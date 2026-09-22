import { renderHook, waitFor } from "@testing-library/react-native";

import { tvMazeClient } from "@/api/tvmaze-client";
import searchTheBearFixture from "@/api/fixtures/search-the-bear.json";
import { useSearchShows } from "./useSearchShows";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: {
    searchShows: jest.fn(),
  },
}));

const mockedSearchShows = tvMazeClient.searchShows as jest.MockedFunction<
  typeof tvMazeClient.searchShows
>;

// FR-001, FR-024: search results while typing, running shows ranked first.
describe("useSearchShows", () => {
  beforeEach(() => {
    mockedSearchShows.mockReset();
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
});
