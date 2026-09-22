import { renderHook, waitFor } from "@testing-library/react-native";

import { tvMazeClient } from "@/api/tvmaze-client";
import showFoundationFixture from "@/api/fixtures/show-foundation.json";
import { useShow } from "./useShow";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: {
    getShowWithEpisodesAndSeasons: jest.fn(),
  },
}));

const mockedGetShow =
  tvMazeClient.getShowWithEpisodesAndSeasons as jest.MockedFunction<
    typeof tvMazeClient.getShowWithEpisodesAndSeasons
  >;

describe("useShow (ADR 0009)", () => {
  beforeEach(() => {
    mockedGetShow.mockReset();
  });

  it("fetches a show with its episodes and seasons by ID", async () => {
    mockedGetShow.mockResolvedValue(showFoundationFixture as never);
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(
      () => useShow(showFoundationFixture.id),
      { wrapper: wrapperWithQueryClient(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe(showFoundationFixture.name);
    expect(mockedGetShow).toHaveBeenCalledWith(showFoundationFixture.id);

    await unmount();
    client.unmount();
  });

  it("merges duplicate requests for the same show into one query", async () => {
    mockedGetShow.mockResolvedValue(showFoundationFixture as never);
    const client = createTestQueryClient();

    function useTwoShows() {
      return [
        useShow(showFoundationFixture.id),
        useShow(showFoundationFixture.id),
      ] as const;
    }

    const { result, unmount } = await renderHook(() => useTwoShows(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current[0].isSuccess).toBe(true));
    await waitFor(() => expect(result.current[1].isSuccess).toBe(true));

    expect(mockedGetShow).toHaveBeenCalledTimes(1);

    await unmount();
    client.unmount();
  });
});
