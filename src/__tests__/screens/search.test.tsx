import { Keyboard, TextInput } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";

import SearchScreen from "@/app/(tabs)/search";
import { tvMazeClient } from "@/api/tvmaze-client";
import { follow, getFollowedIds, unfollow } from "@/storage/follow-list";
import searchSlowHorsesFixture from "@/api/fixtures/search-slow-horses.json";
import {
  requestSearchFocus,
  takeSearchFocusRequest,
} from "@/hooks/search-focus";
import {
  createTestQueryClient,
  wrapperWithQueryClient,
} from "@/hooks/test-utils";

const mockBack = jest.fn();
const mockPush = jest.fn();
// Search's screen in the tab's stack: its focus and blur events, sent by
// the tests (CRI-133).
const mockNavigation = {
  focused: true,
  listeners: new Map<string, Set<() => void>>(),
  addListener(type: string, listener: () => void) {
    const forType = this.listeners.get(type) ?? new Set<() => void>();
    this.listeners.set(type, forType);
    forType.add(listener);
    return () => forType.delete(listener);
  },
  isFocused() {
    return this.focused;
  },
  emit(type: "focus" | "blur") {
    this.focused = type === "focus";
    this.listeners.get(type)?.forEach((listener) => listener());
  },
};
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useNavigation: () => mockNavigation,
  useFocusEffect: (effect: () => void) =>
    jest.requireActual("react").useEffect(effect, [effect]),
}));

// Home's poster rows before typing (FR-026), with their data mocked.
let mockFollowedShows: { show: { id: number; name: string } }[] = [];
jest.mock("@/hooks/useFollowedEpisodes", () => ({
  useFollowedEpisodes: () => ({
    followedShows: mockFollowedShows,
    followedCount: mockFollowedShows.length,
  }),
}));
const card = (id: number) => ({
  tmdbId: id,
  tvmazeId: id + 1000,
  name: `Pick ${id}`,
  posterPath: `/p${id}.jpg`,
});
jest.mock("@/hooks/useTopPicks", () => ({
  useTopPicks: () => ({
    cards: [card(1)],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: jest.fn(),
  }),
}));
// Leaves out the shows Search settled as followed, as the real hook does.
jest.mock("@/hooks/useAiringThisWeek", () => ({
  useAiringThisWeek: () => {
    const hidden = jest
      .requireActual("@/hooks/useSettledFollowed")
      .useHiddenFollowed();
    return {
      cards: [
        { ...card(2), day: "Fri" },
        { ...card(3), day: "Sat" },
      ].filter((pick) => !hidden.has(pick.tvmazeId)),
      isLoading: false,
    };
  },
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

jest.mock("@/hooks/useStreamingService", () => ({
  useStreamingService: jest.fn(() => ({ data: undefined })),
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
    mockPush.mockClear();
    mockNavigation.focused = true;
    mockNavigation.listeners.clear();
    takeSearchFocusRequest();
    mockFollowedShows = [];
    mockedSearchShows.mockReset();
    mockedGetFollowedIds.mockReset().mockResolvedValue([]);
    mockedFollow.mockReset().mockResolvedValue(undefined);
    mockedUnfollow.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it("FR-026: before typing, shows Top picks and Airing this week with followed shows", async () => {
    mockFollowedShows = [{ show: { id: 1, name: "MobLand" } }];
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    expect(screen.getByTestId("top-picks-row")).toBeTruthy();
    expect(screen.getByTestId("airing-this-week-row")).toBeTruthy();
    expect(screen.getByText("Top picks for you")).toBeTruthy();
    expect(screen.getByText("Airing this week")).toBeTruthy();
    // Only Home dims its posters (CRI-124).
    expect(screen.queryAllByTestId("poster-dim")).toHaveLength(0);

    await unmount();
    client.unmount();
  });

  // CRI-131: shows followed before Search opened are out of its rows; one
  // followed in Search stays, marked, while Search is open.
  it("FR-026: before typing, leaves out shows followed before Search opened, and keeps one followed here (CRI-131)", async () => {
    mockedGetFollowedIds.mockResolvedValue([1002]);
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(screen.queryByText("Pick 2")).toBeNull());
    expect(screen.getByText("Pick 3")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("airing-follow-1003"));
    await waitFor(() => expect(mockedFollow).toHaveBeenCalledWith(1003));
    expect(screen.getByText("Pick 3")).toBeTruthy();

    await unmount();
    client.unmount();
  });

  // CRI-131: Search is already open, so Top picks has no "Search more";
  // and rows already at their end as Search opens say nothing of it.
  it('FR-026: rows already at their end as Search opens show no end element, and never "Search more" (CRI-131)', async () => {
    mockFollowedShows = [{ show: { id: 1, name: "MobLand" } }];
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    expect(screen.getByTestId("top-picks-row")).toBeTruthy();
    expect(screen.queryByText("Search more")).toBeNull();
    expect(screen.queryByText("All caught up")).toBeNull();

    await unmount();
    client.unmount();
  });

  it("FR-026: before typing with an empty follow list, shows only Airing this week", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    expect(screen.queryByTestId("top-picks-row")).toBeNull();
    expect(screen.getByTestId("airing-this-week-row")).toBeTruthy();

    await unmount();
    client.unmount();
  });

  it("FR-026, PRD 5.6: a card opens Show detail inside Search", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    await fireEvent.press(screen.getAllByTestId("airing")[0]);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search/show/[id]",
      params: { id: 1002 },
    });

    await unmount();
    client.unmount();
  });

  it("FR-026: typing replaces the rows with results", async () => {
    mockedSearchShows.mockResolvedValue(searchSlowHorsesFixture as never);
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    await fireEvent.changeText(
      screen.getByLabelText("Search shows"),
      "Slow Horses",
    );

    expect(screen.queryByTestId("search-before-typing")).toBeNull();
    await waitFor(() => expect(screen.getByText("Slow Horses")).toBeTruthy());

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

  // Owner, 2026-10-23: a hairline between results, as in Shows.
  it("draws a hairline between results, as Shows does", async () => {
    mockedSearchShows.mockResolvedValue(searchSlowHorsesFixture as never);
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    fireEvent.changeText(screen.getByLabelText("Search shows"), "Slow Horses");

    await waitFor(() => expect(screen.getByText("Slow Horses")).toBeTruthy());
    const rows = screen.getAllByTestId("search-result-row");
    expect(rows.length).toBeGreaterThan(1);
    expect(screen.getAllByTestId("show-row-separator")).toHaveLength(
      rows.length - 1,
    );

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

  it("PRD 5.4: waits for a pause in typing before searching", async () => {
    jest.useFakeTimers();
    mockedSearchShows.mockResolvedValue(searchSlowHorsesFixture as never);
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    const field = screen.getByLabelText("Search shows");
    await fireEvent.changeText(field, "Slo");
    await act(() => jest.advanceTimersByTime(100));
    await fireEvent.changeText(field, "Slow Horses");
    await act(() => jest.advanceTimersByTime(200));
    expect(mockedSearchShows).not.toHaveBeenCalled();

    await act(() => jest.advanceTimersByTime(50));
    await waitFor(() =>
      expect(mockedSearchShows).toHaveBeenCalledWith("Slow Horses"),
    );
    expect(mockedSearchShows).toHaveBeenCalledTimes(1);

    await unmount();
    client.unmount();
  });

  it("PRD 5.4: a clear button inside the field empties it, and shows only while there is text", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    expect(screen.queryByLabelText("Clear search")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search shows"), "Slow");

    const header = within(screen.getByTestId("search-header"));
    await fireEvent.press(header.getByLabelText("Clear search"));

    expect(screen.getByLabelText("Search shows").props.value).toBe("");
    expect(screen.queryByLabelText("Clear search")).toBeNull();
    // The custom button replaces iOS's own, so both platforms match.
    expect(
      screen.getByLabelText("Search shows").props.clearButtonMode,
    ).toBeUndefined();

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

  // CRI-133: Search is a tab, so there is nothing to close.
  it("FR-007: has the search field at the top, and no Close or Done", async () => {
    const client = createTestQueryClient();
    const { unmount } = await render(<SearchScreen />, {
      wrapper: wrapperWithQueryClient(client),
    });

    const header = within(screen.getByTestId("search-header"));
    expect(header.getByLabelText("Search shows")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();

    await unmount();
    client.unmount();
  });

  describe("typing mode on entry (CRI-133)", () => {
    let focusSpy: jest.SpyInstance;
    let blurSpy: jest.SpyInstance;
    beforeEach(() => {
      focusSpy = jest.spyOn(TextInput.prototype, "focus");
      blurSpy = jest.spyOn(TextInput.prototype, "blur");
    });
    afterEach(() => {
      focusSpy.mockRestore();
      blurSpy.mockRestore();
    });

    it("FR-001: opens with the field focused on the first visit", async () => {
      const client = createTestQueryClient();
      const { unmount } = await render(<SearchScreen />, {
        wrapper: wrapperWithQueryClient(client),
      });

      expect(screen.getByTestId("search-input").props.autoFocus).toBe(true);

      await unmount();
      client.unmount();
    });

    it("focuses the field when Search is opened again from elsewhere (its tab, Shows' field, Search more)", async () => {
      const client = createTestQueryClient();
      const { unmount } = await render(<SearchScreen />, {
        wrapper: wrapperWithQueryClient(client),
      });
      await act(() => mockNavigation.emit("blur"));
      focusSpy.mockClear();

      // The request is made before the switch (useOpenSearch, tabPress).
      await act(() => requestSearchFocus());
      expect(focusSpy).not.toHaveBeenCalled();
      await act(() => mockNavigation.emit("focus"));

      expect(focusSpy).toHaveBeenCalledTimes(1);

      await unmount();
      client.unmount();
    });

    it("focuses the field at once on a tap on the Search tab while on Search", async () => {
      const client = createTestQueryClient();
      const { unmount } = await render(<SearchScreen />, {
        wrapper: wrapperWithQueryClient(client),
      });
      focusSpy.mockClear();

      await act(() => requestSearchFocus());

      expect(focusSpy).toHaveBeenCalledTimes(1);

      await unmount();
      client.unmount();
    });

    it("PRD 5.6: does not focus the field coming back from a Show detail opened in Search", async () => {
      const client = createTestQueryClient();
      const { unmount } = await render(<SearchScreen />, {
        wrapper: wrapperWithQueryClient(client),
      });
      await act(() => mockNavigation.emit("blur"));
      focusSpy.mockClear();

      await act(() => mockNavigation.emit("focus"));

      expect(focusSpy).not.toHaveBeenCalled();

      await unmount();
      client.unmount();
    });

    it("closes the keyboard when Search is left", async () => {
      const client = createTestQueryClient();
      const { unmount } = await render(<SearchScreen />, {
        wrapper: wrapperWithQueryClient(client),
      });

      await act(() => mockNavigation.emit("blur"));

      expect(blurSpy).toHaveBeenCalled();

      await unmount();
      client.unmount();
    });
  });
});
