import { Keyboard } from "react-native";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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

  // CRI-77: autocorrect would replace a show's original title with a
  // dictionary word, so it is off, and so is spell check.
  it("FR-001: search field has autocorrect and spell check off", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    const field = screen.getByLabelText("Search shows");
    expect(field.props.autoCorrect).toBe(false);
    expect(field.props.spellCheck).toBe(false);

    await unmount();
    client.unmount();
  });

  it("FR-001: the return key (Search) dismisses the keyboard", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    const field = screen.getByLabelText("Search shows");
    expect(field.props.returnKeyType).toBe("search");
    expect(field.props.submitBehavior).toBe("blurAndSubmit");

    await unmount();
    client.unmount();
  });

  it("FR-001: dragging the results list dismisses the keyboard", async () => {
    mockedSearchShows.mockResolvedValue(searchSlowHorsesFixture as never);
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    fireEvent.changeText(screen.getByLabelText("Search shows"), "Slow Horses");
    await waitFor(() => expect(screen.getByText("Slow Horses")).toBeTruthy());

    expect(screen.getByTestId("search-results").props.keyboardDismissMode).toBe(
      "on-drag",
    );

    await unmount();
    client.unmount();
  });

  // CRI-77: following several shows in a row must not close the keyboard
  // or touch what the user typed.
  it("FR-002: pressing a follow circle keeps the search field focused and the query unchanged", async () => {
    mockedSearchShows.mockResolvedValue(searchSlowHorsesFixture as never);
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    fireEvent.changeText(screen.getByLabelText("Search shows"), "Slow Horses");
    await waitFor(() => expect(screen.getByText("Slow Horses")).toBeTruthy());

    // A tap on a follow circle is handled by the circle and does not blur
    // the field first ("handled"; the default "never" would blur it).
    expect(
      screen.getByTestId("search-results").props.keyboardShouldPersistTaps,
    ).toBe("handled");

    fireEvent.press(screen.getAllByRole("button", { name: "Follow" })[0]);
    await waitFor(() => expect(mockedFollow).toHaveBeenCalled());

    expect(dismissSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Search shows").props.value).toBe(
      "Slow Horses",
    );

    dismissSpy.mockRestore();
    await unmount();
    client.unmount();
  });

  it("FR-007: renders a Close button at the top, next to the search field, and no Done", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    const header = within(screen.getByTestId("search-header"));
    expect(header.getByLabelText("Search shows")).toBeTruthy();
    expect(header.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();

    await unmount();
    client.unmount();
  });

  it("FR-007: closes the sheet when Close is pressed", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    fireEvent.press(screen.getByRole("button", { name: "Close" }));

    expect(mockBack).toHaveBeenCalledTimes(1);

    await unmount();
    client.unmount();
  });
});
