import {
  RefreshControl,
  StyleSheet,
  type RefreshControlProps,
} from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import * as SplashScreen from "expo-splash-screen";
import HomeScreen from "@/app/(tabs)/index";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useImdbRating } from "@/hooks/useImdbRating";
import { useShowImages } from "@/hooks/useShowImages";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
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
jest.mock("@/hooks/useEpisodeStill", () => ({
  useEpisodeStill: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}));
const mockAiring = jest.fn(() => [] as unknown[]);
jest.mock("@/hooks/useAiringThisWeek", () => ({
  useAiringThisWeek: () => mockAiring(),
}));
const mockTopPicks = jest.fn(() => [] as unknown[]);
const mockRefreshTopPicks = jest.fn();
jest.mock("@/hooks/useTopPicks", () => ({
  useTopPicks: () => ({
    cards: mockTopPicks(),
    refresh: mockRefreshTopPicks,
    isRefreshing: false,
  }),
}));
const mockFollow = jest.fn();
jest.mock("@/hooks/useFollowList", () => ({
  useFollowList: () => ({
    isFollowed: () => false,
    follow: mockFollow,
    unfollow: jest.fn(),
  }),
}));
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
  beforeEach(() => {
    mockPush.mockClear();
    refetch.mockClear();
  });

  it("renders one card when one followed show has an episode today (FR-004)", async () => {
    const show = makeShow({ name: "Slow Horses" });
    const episode = makeEpisode();
    mockFollowedEpisodes({
      followedShows: [{ show, episodes: [episode] }],
    });

    await render(<HomeScreen />);

    expect(screen.getByTestId("home-pager")).toBeTruthy();
    expect(screen.getByText("TODAY · 1/1")).toBeTruthy();
    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("Mon 21 Sep · S1E1")).toBeTruthy();
    expect(screen.getAllByText("Episode").length).toBeGreaterThan(0);
  });

  it("renders several cards with paging and a count label when several shows have an episode today (FR-004, FR-005)", async () => {
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

    expect(screen.getByText("TODAY · 1/3")).toBeTruthy();
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

    expect(screen.getByText("TODAY · 2/3")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
  });

  // CRI-94: every slide's rows have one height whatever they hold, so the
  // label, title and date line never jump between slides.
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
      expect(heights("hero-label-row")).toEqual([20, 20]);
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

  // CRI-94: one slide per show, so the counter counts slides, not episodes.
  it("shows several same-day episodes of one show as one slide with a range (FR-012, CRI-94)", async () => {
    const show = makeShow({ name: "The Bear" });
    const episodes = [1, 2, 3].map((number) => makeEpisode({ number }));
    mockFollowedEpisodes({
      followedShows: [{ show, episodes }],
    });

    await render(<HomeScreen />);

    expect(screen.getByText("TODAY · 1/1")).toBeTruthy();
    expect(screen.getByText("Mon 21 Sep · S1E1–3")).toBeTruthy();
  });

  it("shows one card labelled TOMORROW · 1/1 when one show releases on the next day with episodes (FR-006)", async () => {
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
    expect(screen.getByText("TOMORROW · 1/1")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
    // Network dropped from the meta line (94e72ad: "the network
    // contradicted the Open in button... the episode itself, not the
    // network, goes here instead").
    expect(screen.getByText("Tue 22 Sep · S2E3")).toBeTruthy();
    expect(screen.getAllByText("Episode").length).toBeGreaterThan(0);
  });

  it("shows two cards labelled TOMORROW · 1/2 and 2/2 when two shows release on the next day with episodes (FR-006)", async () => {
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

    expect(screen.getByText("TOMORROW · 1/2")).toBeTruthy();
    expect(screen.getByText("Slow Horses")).toBeTruthy();

    // See the "renders several cards with paging" test above for why
    // settling at physical slot 2 (not 1) lands on logical slide 1.
    await fireEvent(screen.getByTestId("home-pager"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 800 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(screen.getByText("TOMORROW · 2/2")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
  });

  it("labels the next day with episodes by its date, not TOMORROW, when it is further away (FR-006)", async () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({ airstamp: "2026-09-24T18:00:00+00:00" });
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-24",
        shows: [{ show, episodes: [episode] }],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getByText("UPCOMING · 1/1")).toBeTruthy();
    expect(screen.getByText("Thu 24 Sep · S1E1")).toBeTruthy();
    expect(screen.getAllByText("Episode").length).toBeGreaterThan(0);
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

    expect(screen.getByText("TOMORROW · 1/1")).toBeTruthy();
    expect(screen.getByText("Tue 22 Sep · S1E1–3")).toBeTruthy();
  });

  it("shows Add your first show when the follow list is empty and opens Search (backlog CRI-66, PRD FR-013)", async () => {
    mockFollowedEpisodes({ followedCount: 0 });

    await render(<HomeScreen />);

    expect(screen.getByText("Add your first show")).toBeTruthy();

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

    it("has a Refresh control under the row for the next picks", async () => {
      mockTopPicks.mockReturnValue([gangs]);
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
      expect(mockRefreshTopPicks).toHaveBeenCalled();
    });

    it("is hidden when the follow list is empty", async () => {
      mockTopPicks.mockReturnValue([gangs]);
      mockFollowedEpisodes({ followedCount: 0 });
      await render(<HomeScreen />);

      expect(screen.queryByText("Top picks for you")).toBeNull();
    });

    it("is hidden when there is nothing to recommend", async () => {
      mockFollowedEpisodes({
        followedShows: [{ show, episodes: [makeEpisode()] }],
      });
      await render(<HomeScreen />);

      expect(screen.queryByTestId("top-picks-row")).toBeNull();
    });
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
