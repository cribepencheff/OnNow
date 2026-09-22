import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import SearchScreen from "@/app/search";
import { tvMazeClient } from "@/api/tvmaze-client";
import { follow, getFollowedIds, unfollow } from "@/storage/follow-list";
import searchSlowHorsesFixture from "@/api/fixtures/search-slow-horses.json";
import {
  createTestQueryClient,
  wrapperWithQueryClient,
} from "@/hooks/test-utils";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("@/api/tvmaze-client", () => ({
  tvMazeClient: {
    searchShows: jest.fn(),
  },
}));

jest.mock("@/storage/follow-list", () => ({
  getFollowedIds: jest.fn(),
  follow: jest.fn(),
  unfollow: jest.fn(),
}));

jest.mock("@/hooks/useShow", () => ({
  useShow: jest.fn(() => ({ data: undefined })),
}));

const mockedSearchShows = tvMazeClient.searchShows as jest.MockedFunction<
  typeof tvMazeClient.searchShows
>;
const mockedGetFollowedIds = getFollowedIds as jest.MockedFunction<
  typeof getFollowedIds
>;
const mockedFollow = follow as jest.MockedFunction<typeof follow>;
const mockedUnfollow = unfollow as jest.MockedFunction<typeof unfollow>;

// CRI-65 "done when": empty, results, no results and followed states.
describe("SearchScreen", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockedSearchShows.mockReset();
    mockedGetFollowedIds.mockReset().mockResolvedValue([]);
    mockedFollow.mockReset().mockResolvedValue(undefined);
    mockedUnfollow.mockReset().mockResolvedValue(undefined);
  });

  it("shows no results before typing (empty state)", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    expect(screen.queryByTestId("search-result-row")).toBeNull();
    expect(mockedSearchShows).not.toHaveBeenCalled();

    await unmount();
    client.unmount();
  });

  it("shows results while typing", async () => {
    mockedSearchShows.mockResolvedValue(searchSlowHorsesFixture as never);
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    fireEvent.changeText(screen.getByLabelText("Search shows"), "Slow Horses");

    await waitFor(() => expect(screen.getByText("Slow Horses")).toBeTruthy());

    await unmount();
    client.unmount();
  });

  it("shows a hint to try the original title when there are no results", async () => {
    mockedSearchShows.mockResolvedValue([]);
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    fireEvent.changeText(
      screen.getByLabelText("Search shows"),
      "Nonexistent Show",
    );

    await waitFor(() =>
      expect(
        screen.getByText("No results. Try the original title."),
      ).toBeTruthy(),
    );

    await unmount();
    client.unmount();
  });

  it("follows a show when its circle is pressed", async () => {
    mockedSearchShows.mockResolvedValue(searchSlowHorsesFixture as never);
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    fireEvent.changeText(screen.getByLabelText("Search shows"), "Slow Horses");
    await waitFor(() => expect(screen.getByText("Slow Horses")).toBeTruthy());

    fireEvent.press(screen.getAllByRole("button", { name: "Follow" })[0]);

    await waitFor(() =>
      expect(mockedFollow).toHaveBeenCalledWith(
        searchSlowHorsesFixture[0].show.id,
      ),
    );

    await unmount();
    client.unmount();
  });

  it("closes the sheet when Done is pressed", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    fireEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(mockBack).toHaveBeenCalledTimes(1);

    await unmount();
    client.unmount();
  });
});
