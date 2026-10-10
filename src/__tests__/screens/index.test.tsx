import {
  RefreshControl,
  StyleSheet,
  type RefreshControlProps,
} from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";

import * as SplashScreen from "expo-splash-screen";
import HomeScreen from "@/app/(tabs)/index";
import { IMDB_CHIP_HEIGHT } from "@/components/ImdbRating";
import { POSTER_REST_DIM } from "@/logic/hero-layout";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useImdbRating } from "@/hooks/useImdbRating";
import { useShowImages } from "@/hooks/useShowImages";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";

const mockPush = jest.fn();
const mockIsFocused = jest.fn(() => true);
const mockScrollToTop = jest.fn();
// The tab navigator Home sits in: Home is tab 0. A test selects a tab and
// sends Home's blur and focus events, as switching tabs does.
let mockTabIndex = 0;
const mockNavListeners: Record<string, (() => void)[]> = {};
const mockNavigation = {
  getState: () => ({
    index: mockTabIndex,
    routes: [{ key: "index-1" }, { key: "calendar-1" }],
  }),
  addListener: (event: string, listener: () => void) => {
    (mockNavListeners[event] ??= []).push(listener);
    return () => {
      mockNavListeners[event] = mockNavListeners[event].filter(
        (other) => other !== listener,
      );
    };
  },
};
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => mockIsFocused(),
  useNavigation: () => mockNavigation,
  useScrollToTop: (ref: unknown) => mockScrollToTop(ref),
}));

jest.mock("expo-splash-screen", () => ({
  hide: jest.fn(),
  preventAutoHideAsync: jest.fn(async () => true),
}));
jest.mock("@/hooks/useFollowedEpisodes", () => ({
  useFollowedEpisodes: jest.fn(),
}));
jest.mock("@/hooks/useToday", () => ({
  useToday: () => "2026-09-21",
}));
jest.mock("@/hooks/useShowImages", () => ({
  useShowImages: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}));
const mockAiring = jest.fn(() => [] as unknown[]);
jest.mock("@/hooks/useAiringThisWeek", () => ({
  useAiringThisWeek: () => ({ cards: mockAiring(), isLoading: false }),
}));
const mockTopPicks = jest.fn(() => [] as unknown[]);
const mockLoadMoreTopPicks = jest.fn();
const mockTopPicksLoading = jest.fn(() => false);
// Leaves out the shows Home has settled as followed, as the real hook does.
jest.mock("@/hooks/useTopPicks", () => ({
  useTopPicks: () => ({
    cards: (mockTopPicks() as { tvmazeId: number }[]).filter(
      (card) =>
        !jest
          .requireActual("@/hooks/useSettledFollowed")
          .useHiddenFollowed()
          .has(card.tvmazeId),
    ),
    isLoading: mockTopPicksLoading(),
    isLoadingMore: false,
    hasMore: true,
    loadMore: mockLoadMoreTopPicks,
  }),
}));
const mockFollow = jest.fn();
let mockFollowedIds = new Set<number>();
jest.mock("@/hooks/useFollowList", () =>
  jest.requireActual("@/hooks/test-follow-list-mock").followListMock(() => ({
    followedIds: mockFollowedIds,
    isLoaded: true,
    isFollowed: () => false,
    follow: mockFollow,
    unfollow: jest.fn(),
  })),
);
jest.mock("@/hooks/useImdbRating", () => ({
  useImdbRating: jest.fn(() => ({ data: undefined })),
}));
jest.mock("@/hooks/useStreamingService", () => ({
  useStreamingService: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}));

const mockedUseFollowedEpisodes = useFollowedEpisodes as jest.MockedFunction<
  typeof useFollowedEpisodes
>;

function makeShow(
  overrides: Partial<TvMazeShowWithEmbeds> = {},
): TvMazeShowWithEmbeds {
  return {
    id: 1,
    url: "https://www.tvmaze.com/shows/1",
    name: "Test Show",
    type: "Scripted",
    language: "English",
    genres: [],
    status: "Running",
    runtime: null,
    averageRuntime: 30,
    premiered: "2020-01-01",
    ended: null,
    officialSite: null,
    network: { id: 1, name: "AMC", country: null, officialSite: null },
    webChannel: null,
    image: null,
    summary: null,
    _links: { self: { href: "https://api.tvmaze.com/shows/1" } },
    // followedShows (used by the hero's findHeroSlides) needs
    // TvMazeShowWithEmbeds, unlike the old showsWithEpisodeToday/
    // nextDayEpisodes fields, which only need TvMazeShow.
    _embedded: { episodes: [], seasons: [] },
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<TvMazeEpisode> = {}): TvMazeEpisode {
  return {
    id: 1,
    url: "https://www.tvmaze.com/episodes/1",
    name: "Episode",
    season: 1,
    number: 1,
    type: "regular",
    airdate: "2026-09-21",
    airtime: "20:00",
    airstamp: "2026-09-21T18:00:00+00:00",
    runtime: 45,
    image: null,
    summary: null,
    ...overrides,
  };
}

const refetch = jest.fn();

// React Native's Jest mock renders RefreshControl without its props and
// keeps the latest mounted instance for tests to read them.
function refreshControlProps(): RefreshControlProps {
  return (
    RefreshControl as unknown as { latestRef: { props: RefreshControlProps } }
  ).latestRef.props;
}

function mockFollowedEpisodes(
  overrides: Partial<ReturnType<typeof useFollowedEpisodes>>,
) {
  mockedUseFollowedEpisodes.mockReturnValue({
    followedCount: 1,
    isReady: true,
    isLoading: false,
    isRefetching: false,
    isError: false,
    dataUpdatedAt: null,
    followedShows: [],
    showsWithEpisodeToday: [],
    nextDayEpisodes: null,
    nextByShow: [],
    refetch,
    ...overrides,
  });
}

// CRI-66 "done when": component tests cover today with one, several and no
// shows, and an empty follow list.
describe("HomeScreen", () => {
  // The hero's page dots run a timed progress fill (auto-advance); fake
  // timers keep it inside each test instead of updating after it.
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
    refetch.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders one card when one followed show has an episode today (FR-004)", async () => {
    const show = makeShow({ name: "Slow Horses" });
    const episode = makeEpisode();
    mockFollowedEpisodes({
      followedShows: [{ show, episodes: [episode] }],
    });

    await render(<HomeScreen />);

    expect(screen.getByTestId("home-pager")).toBeTruthy();
    // CRI-124: the date pill, then the code and title on one line.
    expect(screen.getByText("Today · Mon 21 Sep")).toBeTruthy();
    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("S1E1 · Episode")).toBeTruthy();
    // The header with the logo, over the hero (CRI-124).
    expect(screen.getByTestId("app-logo")).toBeTruthy();
    // Its right slot is empty for now: no search entry on Home while
    // shows are followed (FR-007).
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
    // Under the status bar, a plain scrim that only shows once the header
    // has left (CRI-124).
    expect(
      StyleSheet.flatten(
        screen.getByTestId("home-status-bar-scrim").props.style,
      ).opacity,
    ).toBe(0);
    // One slide: no page dots.
    expect(screen.queryByLabelText(/^Show \d+ of/)).toBeNull();
  });

  it("renders several cards with paging and a count when several shows have an episode today (FR-004, FR-005)", async () => {
    const showA = makeShow({ id: 1, name: "Slow Horses" });
    const showB = makeShow({ id: 2, name: "Silo" });
    const showC = makeShow({ id: 3, name: "The Bear" });
    mockFollowedEpisodes({
      followedShows: [
        { show: showA, episodes: [makeEpisode()] },
        { show: showB, episodes: [makeEpisode()] },
        { show: showC, episodes: [makeEpisode()] },
      ],
    });

    await render(<HomeScreen />);

    // CRI-124: the count is the page dots' (the pill only dates the slide).
    expect(screen.getByLabelText("Show 1 of 3")).toBeTruthy();
    expect(screen.getAllByText("Today · Mon 21 Sep").length).toBeGreaterThan(0);
    expect(screen.getByText("Slow Horses")).toBeTruthy();

    // The pager loops (loopSlideData): logical slide 0 lives at physical
    // slot 1, so settling on physical slot 2 (contentOffset.x = 2 *
    // layoutMeasurement.width) is logical slide 1, the second show.
    await fireEvent(screen.getByTestId("home-pager"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 800 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(screen.getByLabelText("Show 2 of 3")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
  });

  // CRI-94: every slide's rows have one height whatever they hold, so the
  // pill row, title and episode line never jump between slides.
  it("gives the label row and title block one height with or without an IMDb chip and logo (CRI-94)", async () => {
    const withChip = makeShow({
      id: 1,
      name: "MobLand",
      externals: { tvrage: null, thetvdb: null, imdb: "tt31510819" },
    });
    const plain = makeShow({ id: 2, name: "Outside" });
    (useShowImages as jest.Mock).mockImplementation((show) => ({
      data: show.id === 1 ? { logo: { file_path: "/logo.png" } } : undefined,
      isLoading: false,
    }));
    (useImdbRating as jest.Mock).mockImplementation((show) => ({
      data: show.id === 1 ? "8.1" : undefined,
      imdbId: show.externals?.imdb ?? null,
    }));
    mockFollowedEpisodes({
      followedShows: [
        { show: withChip, episodes: [makeEpisode()] },
        { show: plain, episodes: [makeEpisode()] },
      ],
    });

    try {
      await render(<HomeScreen />);

      // Both slides are mounted: one with chip and logo, one without either.
      expect(screen.getAllByTestId("imdb-rating")).toHaveLength(1);
      // A logo replaces the text title.
      expect(screen.queryByText("MobLand")).toBeNull();
      expect(screen.getByText("Outside")).toBeTruthy();

      const heights = (testID: string) =>
        screen
          .getAllByTestId(testID)
          .map((view) => StyleSheet.flatten(view.props.style).height);
      // The pill's height, and the episode line as tall as the IMDb chip,
      // chip or not (CRI-124).
      expect(heights("hero-label-row")).toEqual([26, 26]);
      expect(heights("hero-episode-row")).toEqual([
        IMDB_CHIP_HEIGHT,
        IMDB_CHIP_HEIGHT,
      ]);
      // "IMDb 8.1" in one chip, on the episode line.
      const withChipRows = screen
        .getAllByTestId("hero-episode-row")
        .filter((row) => within(row).queryByTestId("imdb-rating"));
      expect(withChipRows).toHaveLength(1);
      const chip = within(withChipRows[0]).getByTestId("imdb-rating");
      expect(within(chip).getByText("IMDb")).toBeTruthy();
      // Tabular figures: the chip keeps its width from slide to slide.
      expect(
        StyleSheet.flatten(within(chip).getByText("8.1").props.style)
          .fontVariant,
      ).toEqual(["tabular-nums"]);
      expect(heights("hero-title-block")).toEqual([88, 88]);
    } finally {
      (useShowImages as jest.Mock).mockImplementation(() => ({
        data: undefined,
        isLoading: false,
        isError: false,
      }));
      (useImdbRating as jest.Mock).mockImplementation(() => ({
        data: undefined,
      }));
    }
  });

  // CRI-94: one slide per show, so a show's episodes are one slide.
  it("shows several same-day episodes of one show as one slide with a range (FR-012, CRI-94)", async () => {
    const show = makeShow({ name: "The Bear" });
    const episodes = [1, 2, 3].map((number) => makeEpisode({ number }));
    mockFollowedEpisodes({
      followedShows: [{ show, episodes }],
    });

    await render(<HomeScreen />);

    expect(screen.getByText("Today · Mon 21 Sep")).toBeTruthy();
    expect(screen.getByText("S1E1–3 · Episode")).toBeTruthy();
    expect(screen.queryByLabelText(/^Show \d+ of/)).toBeNull();
  });

  it("shows one card labelled Tomorrow when one show releases on the next day with episodes (FR-006)", async () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({
      season: 2,
      number: 3,
      airstamp: "2026-09-22T18:00:00+00:00",
    });
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-22",
        shows: [{ show, episodes: [episode] }],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getByTestId("home-pager")).toBeTruthy();
    expect(screen.getByText("Tomorrow · Tue 22 Sep")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
    // Network dropped from the meta line (94e72ad: "the network
    // contradicted the Open in button... the episode itself, not the
    // network, goes here instead").
    expect(screen.getByText("S2E3 · Episode")).toBeTruthy();
  });

  it("shows two cards labelled Tomorrow, counted 1 of 2 and 2 of 2, when two shows release on the next day with episodes (FR-006)", async () => {
    const showA = makeShow({ id: 1, name: "Slow Horses" });
    const showB = makeShow({ id: 2, name: "Silo" });
    const episodeA = makeEpisode({ airstamp: "2026-09-22T18:00:00+00:00" });
    const episodeB = makeEpisode({ airstamp: "2026-09-22T20:00:00+00:00" });
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-22",
        shows: [
          { show: showA, episodes: [episodeA] },
          { show: showB, episodes: [episodeB] },
        ],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getAllByText("Tomorrow · Tue 22 Sep").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByLabelText("Show 1 of 2")).toBeTruthy();
    expect(screen.getByText("Slow Horses")).toBeTruthy();

    // See the "renders several cards with paging" test above for why
    // settling at physical slot 2 (not 1) lands on logical slide 1.
    await fireEvent(screen.getByTestId("home-pager"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 800 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(screen.getByLabelText("Show 2 of 2")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
  });

  it("labels the next day with episodes by its date, not Tomorrow, when it is further away (FR-006)", async () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({ airstamp: "2026-09-24T18:00:00+00:00" });
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-24",
        shows: [{ show, episodes: [episode] }],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getByText("Thu 24 Sep")).toBeTruthy();
    expect(screen.getByText("S1E1 · Episode")).toBeTruthy();
  });

  // Unlike the hero's own 7-day horizon (see the FR-012-does-not-apply test
  // above), the next-day fallback pager still uses the old, pre-grouped
  // ShowEpisodesToday shape (findNextDayWithEpisodes /
  // findShowsWithEpisodeToday, logic/home.ts and episodes-today.ts, both
  // untouched by this branch): several same-day episodes of one show are
  // still one HeroSlide with several episodes, not split. FR-012 grouping
  // is intact here.
  it("shows several episodes of one show on the next day as one card (FR-012)", async () => {
    const show = makeShow({ name: "The Bear" });
    const episodes = [1, 2, 3].map((number) =>
      makeEpisode({ number, airstamp: "2026-09-22T18:00:00+00:00" }),
    );
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-22",
        shows: [{ show, episodes }],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getByText("Tomorrow · Tue 22 Sep")).toBeTruthy();
    expect(screen.getByText("S1E1–3 · Episode")).toBeTruthy();
  });

  // CRI-124: the hero advances by itself, but not while Home is out of
  // sight; it then resumes on the same slide.
  describe("auto-advance (CRI-124)", () => {
    function twoSlides() {
      mockFollowedEpisodes({
        followedShows: [
          {
            show: makeShow({ id: 1, name: "Slow Horses" }),
            episodes: [makeEpisode()],
          },
          {
            show: makeShow({ id: 2, name: "Silo" }),
            episodes: [makeEpisode()],
          },
        ],
      });
    }

    afterEach(() => {
      mockIsFocused.mockReturnValue(true);
    });

    it("moves to the next slide after its dwell time", async () => {
      twoSlides();
      await render(<HomeScreen />);
      expect(screen.getByLabelText("Show 1 of 2")).toBeTruthy();

      await act(async () => jest.advanceTimersByTime(6500));
      expect(screen.getByLabelText("Show 2 of 2")).toBeTruthy();
    });

    it("pauses while Home is not the focused tab, and resumes on the same slide", async () => {
      mockIsFocused.mockReturnValue(false);
      twoSlides();
      await render(<HomeScreen />);

      await act(async () => jest.advanceTimersByTime(20000));
      expect(screen.getByLabelText("Show 1 of 2")).toBeTruthy();

      mockIsFocused.mockReturnValue(true);
      await screen.rerender(<HomeScreen />);
      await act(async () => jest.advanceTimersByTime(6500));
      expect(screen.getByLabelText("Show 2 of 2")).toBeTruthy();
    });
  });

  it("shows Add your first show when the follow list is empty and opens Search (backlog CRI-66, PRD FR-013)", async () => {
    mockFollowedEpisodes({ followedCount: 0 });

    await render(<HomeScreen />);

    expect(screen.getByText("Add your first show")).toBeTruthy();
    // Logo only over the hero, for now (CRI-124).
    expect(screen.queryByTestId("app-logo")).toBeNull();

    fireEvent.press(
      screen.getByRole("button", { name: "Add your first show" }),
    );

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("shows a quiet line when followed shows exist but none has a known upcoming episode", async () => {
    mockFollowedEpisodes({
      followedCount: 2,
      nextDayEpisodes: null,
    });

    await render(<HomeScreen />);

    expect(screen.getByText("Nothing upcoming.")).toBeTruthy();
  });

  it("shows a quiet line while nothing has loaded yet, never a blank screen (NFR-001)", async () => {
    mockFollowedEpisodes({ isLoading: true });

    await render(<HomeScreen />);

    expect(screen.getByText("Loading your shows…")).toBeTruthy();
  });

  it("shows a quiet line on a fetch error instead of inventing a status (NFR-002)", async () => {
    mockFollowedEpisodes({ isError: true });

    await render(<HomeScreen />);

    expect(
      screen.getByText("Couldn't load your shows. Pull to refresh."),
    ).toBeTruthy();
  });

  // CRI-95: cache-first launch; CRI-85 and NFR-002: pull to refresh.
  describe("launch and refresh (CRI-95, CRI-85, NFR-002)", () => {
    const show = makeShow({ name: "Slow Horses" });
    beforeEach(() => (SplashScreen.hide as jest.Mock).mockClear());

    it("shows no spinner for a background refresh on launch", async () => {
      mockFollowedEpisodes({
        isRefetching: true,
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      expect(refreshControlProps().refreshing).toBe(false);
      expect(screen.getByText("Slow Horses")).toBeTruthy();
    });

    it("shows the placeholder, not the empty prompt, until ready, and keeps the splash", async () => {
      mockFollowedEpisodes({ isReady: false, followedCount: 0 });
      await render(<HomeScreen />);

      expect(screen.getByText("Loading your shows…")).toBeTruthy();
      expect(screen.queryByText("Add your first show")).toBeNull();
      expect(SplashScreen.hide).not.toHaveBeenCalled();
    });

    it("hides the splash once ready", async () => {
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      expect(SplashScreen.hide).toHaveBeenCalled();
    });

    it("says when the data was last updated, under the pull spinner", async () => {
      mockFollowedEpisodes({
        dataUpdatedAt: Date.now() - 5 * 60 * 1000,
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      expect(screen.getByTestId("home-updated")).toHaveTextContent(
        "Updated 5 min ago",
      );
    });

    it("shows the spinner for a pull, for as long as the refetch runs", async () => {
      let finish: () => void = () => {};
      refetch.mockImplementationOnce(
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);
      const control = refreshControlProps;

      await act(async () => {
        void control().onRefresh?.();
      });
      expect(control().refreshing).toBe(true);
      expect(refetch).toHaveBeenCalled();

      await act(async () => finish());
      expect(control().refreshing).toBe(false);
    });
  });

  // FR-038, ADR 0016: one row under the hero.
  describe("Top picks for you (FR-038)", () => {
    const show = makeShow({ name: "Slow Horses" });
    const gangs = {
      tmdbId: 61886,
      tvmazeId: 15299,
      name: "Gangs of London",
      posterPath: "/gangs.jpg",
    };

    afterEach(() => mockTopPicks.mockReturnValue([]));

    // CRI-124 experiment: posters dimmed at rest, headings not; a dimmed
    // poster still opens (the overlay takes no touches).
    it("dims the posters at rest, not the heading, and keeps them tappable", async () => {
      mockTopPicks.mockReturnValue([gangs]);
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      const dim = screen.getByTestId("poster-dim");
      expect(StyleSheet.flatten(dim.props.style).opacity).toBeCloseTo(
        POSTER_REST_DIM,
      );
      expect(dim.props.pointerEvents).toBe("none");
      await fireEvent.press(
        screen.getByRole("button", { name: "Gangs of London" }),
      );
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/show/[id]",
        params: { id: 15299 },
      });
    });

    it("shows the row with its cards; a tap opens Show detail, the circle follows at once", async () => {
      mockTopPicks.mockReturnValue([gangs]);
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      expect(screen.getByText("Top picks for you")).toBeTruthy();
      await fireEvent.press(screen.getByTestId("top-pick-follow-15299"));
      expect(mockFollow).toHaveBeenCalledWith(15299);

      await fireEvent.press(
        screen.getByRole("button", { name: "Gangs of London" }),
      );
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/show/[id]",
        params: { id: 15299 },
      });
    });

    // CRI-131: no Refresh; a drag past the row's end loads more.
    it("has no Refresh control, and asks for more when dragged past its end (CRI-131)", async () => {
      mockTopPicks.mockReturnValue([gangs]);
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
      const strip = screen.getByTestId("top-picks-row-cards");
      await fireEvent(strip, "scrollBeginDrag");
      // One card, shorter than the screen: its end is the screen's edge.
      await fireEvent.scroll(strip, {
        nativeEvent: {
          contentOffset: { x: 64, y: 0 },
          layoutMeasurement: { width: 390, height: 252 },
          contentSize: { width: 182, height: 252 },
        },
      });
      expect(mockLoadMoreTopPicks).toHaveBeenCalledTimes(1);
    });

    // CRI-131: a follow from the row can be undone while the user stays on
    // Home; the card goes once Home's tab is selected again.
    it("keeps a followed card while on Home, also past Show detail, and takes it out on a return from another tab (CRI-131)", async () => {
      const other = { ...gangs, tvmazeId: 1, tmdbId: 2, name: "Andor" };
      mockTopPicks.mockReturnValue([gangs, other]);
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      const { rerender } = await render(<HomeScreen />);
      const leaveAndReturn = async (tabIndex: number) => {
        mockTabIndex = tabIndex;
        await act(async () => mockNavListeners.blur?.forEach((l) => l()));
        mockTabIndex = 0;
        await act(async () => mockNavListeners.focus?.forEach((l) => l()));
      };

      // Followed from the row: the follow list changes, Home redraws.
      mockFollowedIds = new Set([15299]);
      await rerender(<HomeScreen />);
      try {
        // Show detail pushed over Home and closed: still the same visit.
        await leaveAndReturn(0);
        expect(screen.getByText("Gangs of London")).toBeTruthy();

        // Calendar, then Home again.
        await leaveAndReturn(1);
        expect(screen.queryByText("Gangs of London")).toBeNull();
        expect(screen.getByText("Andor")).toBeTruthy();
      } finally {
        mockFollowedIds = new Set();
      }
    });

    it("is hidden when the follow list is empty", async () => {
      mockTopPicks.mockReturnValue([gangs]);
      mockFollowedEpisodes({ followedCount: 0 });
      await render(<HomeScreen />);

      expect(screen.queryByText("Top picks for you")).toBeNull();
    });

    // CRI-125: when it gets picks it opens, skeleton cards first.
    it("opens with skeleton cards while its first picks load (CRI-125)", async () => {
      mockTopPicksLoading.mockReturnValue(true);
      try {
        mockFollowedEpisodes({
          followedShows: [{ show, episodes: [makeEpisode()] }],
        });
        await render(<HomeScreen />);

        expect(
          screen.getByTestId("top-picks-row-skeleton", {
            includeHiddenElements: true,
          }),
        ).toBeTruthy();
      } finally {
        mockTopPicksLoading.mockReturnValue(false);
      }
    });

    // CRI-125: a row opening above keeps what is on screen in place, but
    // only once Home is scrolled down; at its top the hero stays put.
    it("anchors Airing this week while scrolled down, not at the top (CRI-125)", async () => {
      // A show airing today: the hero, and nothing else at the top.
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
        showsWithEpisodeToday: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);
      const scroll = screen.getByTestId("home-scroll");
      expect(scroll.props.maintainVisibleContentPosition).toBeUndefined();

      await fireEvent.scroll(scroll, {
        nativeEvent: {
          contentOffset: { x: 0, y: 300 },
          contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
        },
      });
      // The hero, the space above the rows, "Top picks for you", then
      // "Airing this week".
      expect(
        screen.getByTestId("home-scroll").props.maintainVisibleContentPosition,
      ).toEqual({ minIndexForVisible: 3 });
    });

    it("is hidden when there is nothing to recommend", async () => {
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      expect(screen.queryByTestId("top-picks-row")).toBeNull();
    });
  });

  // CRI-131: iOS convention, tapping Home while on Home scrolls to the
  // hero (useScrollToTop: only when Home is the focused tab).
  it("scrolls back to the hero on a tap of the Home tab (CRI-131)", async () => {
    mockFollowedEpisodes({ followedCount: 0 });
    await render(<HomeScreen />);
    const ref = mockScrollToTop.mock.calls.at(-1)?.[0] as {
      current: unknown;
    };
    expect(ref.current).toBeTruthy();
  });

  // FR-039: always shown, also with an empty follow list.
  describe("Airing this week (FR-039)", () => {
    const lanterns = {
      tmdbId: 211,
      tvmazeId: 1211,
      name: "Lanterns",
      posterPath: "/lanterns.jpg",
      day: "Fri",
    };

    afterEach(() => mockAiring.mockReturnValue([]));

    it("is shown with an empty follow list, each card with its day", async () => {
      mockAiring.mockReturnValue([lanterns]);
      mockFollowedEpisodes({ followedCount: 0 });
      await render(<HomeScreen />);

      expect(screen.getByText("Airing this week")).toBeTruthy();
      expect(screen.queryByText("Top picks for you")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Lanterns, Fri" }),
      ).toBeTruthy();
    });

    it("follows at once from the circle", async () => {
      mockAiring.mockReturnValue([lanterns]);
      mockFollowedEpisodes({ followedCount: 0 });
      await render(<HomeScreen />);

      await fireEvent.press(screen.getByTestId("airing-follow-1211"));
      expect(mockFollow).toHaveBeenCalledWith(1211);
    });
  });
});
